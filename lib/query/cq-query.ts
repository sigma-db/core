﻿import { Attribute, Database, DataType, Relation, ISchema, Tuple } from "../database";
import { IQuery } from "./index";
import { Tetris } from "./evaluation/tetris";
import { IAtom, ICreateCQ, IInsertCQ, INamedValue, ISelectCQ, ITuple, parse, VariableName, Literal, IInfoCQ } from "./parsers/cq";

enum QueryType { CREATE = "create", INSERT = "insert", SELECT = "select", INFO = "info" }
enum TupleType { NAMED = "named", UNNAMED = "unnamed" }
enum ValueType { LITERAL = "literal", VARIABLE = "variable" }

interface CQAtom {
    rel: string;
    vars: Array<CQVariable>;
}

class CQVariable {
    constructor(private _id: number, private _type: DataType, private _width: number) { }

    public get id(): number {
        return this._id;
    }

    public get type(): DataType {
        return this._type;
    }

    public get width(): number {
        return this._width;
    }
}

class CQValueSet {
    private count: number = 0;
    private vars: { [name: string]: CQVariable } = {};

    public variable(type: DataType, width: number, name: string = `@${this.count}`): CQVariable {
        this.vars[name] = this.vars[name] || new CQVariable(this.count++, type, width);
        return this.vars[name];
    }

    public get(name: string): CQVariable {
        return this.vars[name];
    }

    public schema(): Array<Attribute> {
        return Object.entries(this.vars).sort(([, v], [, w]) => v.id - w.id).map(([name, cqvar]) => Attribute.create(name, cqvar.type, cqvar.width));
    }
}

class CreateCQ implements IQuery {
    constructor(private query: ICreateCQ) { }

    public execute(db: Database): void {
        db.createRelation(this.query.rel, this.query.attrs.map(spec => Attribute.from(spec)));
    }
}

class InsertCQ implements IQuery {
    constructor(private query: IInsertCQ) { }

    public execute(db: Database): void {
        const rel = db.relation(this.query.rel);
        if (!rel) {
            throw new Error(`Relation ${rel} does not exist in the selected database.`);
        }

        let raw: Array<Literal>;
        if (this.query.tuple.type == TupleType.UNNAMED) {
            const tuple = this.query.tuple;
            raw = tuple.vals.map(v => v.val);
        } else {
            const { vals } = <ITuple<INamedValue<Literal>>>this.query.tuple;
            raw = db.relation(this.query.rel).schema.map(attr => vals.find(val => val.attr === attr.name).val);
        }
        const _tuple = Tuple.from(raw);
        db.relation(this.query.rel).insert(_tuple);
    }
}

class SelectCQ implements IQuery {
    constructor(private query: ISelectCQ) { }

    private resolve(atoms: Array<IAtom>, schema: ISchema, varset: CQValueSet): Array<CQAtom> {
        return atoms.map(atom => {
            if (atom.type == TupleType.UNNAMED) {
                return {
                    rel: atom.rel,
                    vars: atom.vals.map((v, i) => {
                        const { type, width } = schema[atom.rel].schema[i];
                        if (v.type == ValueType.VARIABLE) {
                            return varset.variable(type, width, <string>v.val);
                        } else {
                            throw new Error("Constants are not yet supported!");
                        }
                    })
                };
            } else {
                const { rel, vals } = atom;
                return {
                    rel: rel,
                    vars: schema[rel].schema.map(spec => {
                        const v = vals.find(v => (<INamedValue<VariableName>>v).attr === spec.name);
                        if (!v) {
                            return varset.variable(spec.type, spec.width);
                        } else if (v.type == ValueType.VARIABLE) {
                            return varset.variable(spec.type, spec.width, <string>v.val);
                        } else {
                            throw new Error("Constants are not yet supported!");
                        }
                    })
                }
            }
        });
    }

    public execute(db: Database): Relation {
        const varset = new CQValueSet();
        const atoms = this.resolve(this.query.body, db.schema, varset);
        const varSchema = varset.schema();
        const resultSchema = this.query.attrs.map(_attr => {
            const { attr, val } = <INamedValue<VariableName>>_attr;
            return Attribute.create(attr, varset.get(val).type, varset.get(val).width);
        });
        const result = Relation.create(this.query.name, resultSchema, { throwsOnDuplicate: false });

        const _head = this.query.attrs.map(attr => varset.get(<string>attr.val).id);
        const _body = atoms.map(atom => ({ rel: atom.rel, vars: atom.vars.map(v => v.id) }));
        const tetris = new Tetris(db, varSchema);
        tetris.evaluate(_head, _body, result);

        return result.freeze();
    }
}

class InfoCQ implements IQuery {
    constructor(private query: IInfoCQ) { }

    public execute(db: Database): Relation {
        const str2bits = (s: string) => [...s].reduce((result, current) => (result << 8n) + BigInt(current.charCodeAt(0) & 0xFF), 0n);
        let result: Relation;

        if (!this.query.rel) {
            result = Relation.create("Database Schema", [
                Attribute.create("Relation", DataType.STRING, 32),
                Attribute.create("Arity", DataType.INT, 4),
                Attribute.create("Cardinality", DataType.INT, 4)
            ]);
            Object.entries(db.schema).forEach(([, rel]) => {
                const tuple = Tuple.from([str2bits(rel.name), BigInt(rel.arity), BigInt(rel.size)]);
                result.insert(tuple);
            });
        } else {
            result = Relation.create(`Relation Schema for "${this.query.rel}"`, [
                Attribute.create("Attribute", DataType.STRING, 32),
                Attribute.create("Data Type", DataType.STRING, 8),
                Attribute.create("Width", DataType.INT, 4)
            ]);
            db.relation(this.query.rel).schema.forEach(attr => {
                const tuple = Tuple.from([str2bits(attr.name), str2bits(attr.type), BigInt(attr.width)]);
                result.insert(tuple);
            });
        }

        return result.freeze();
    }
}

export class CQQuery {
    public static parse(q: string): IQuery {
        const _q = parse(q);
        switch (_q.type) {
            case QueryType.CREATE: return new CreateCQ(<ICreateCQ>_q);
            case QueryType.INSERT: return new InsertCQ(<IInsertCQ>_q);
            case QueryType.SELECT: return new SelectCQ(<ISelectCQ>_q);
            case QueryType.INFO: return new InfoCQ(<IInfoCQ>_q);
            default: throw new Error("Unsupported query type.");
        }
    }
}
