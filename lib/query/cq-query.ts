import { AttributeSpecification, Database, DataType, Relation, Schema } from "../database";
import { IQuery } from "./index";
import { Tetris } from "./evaluation/tetris";
import { IAtom, ICreateCQ, IInsertCQ, INamedValue, ISelectCQ, ITuple, parse, VariableName } from "./parsers/cq";

enum QueryType { CREATE = "create", INSERT = "insert", SELECT = "select" }
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
}

class CreateCQ implements IQuery {
    constructor(private query: ICreateCQ) { }

    public execute(db: Database): void {
        db.createRelation(this.query.rel, this.query.attrs);
    }
}

class InsertCQ implements IQuery {
    constructor(private query: IInsertCQ) { }

    public execute(db: Database): void {
        if (this.query.tuple.type == TupleType.UNNAMED) {
            const tuple = this.query.tuple;
            const raw = tuple.vals.map(v => v.val);
            db.insert(this.query.rel, raw);
        } else {
            const tuple = <ITuple<INamedValue<number>>>this.query.tuple;
            const raw = db.relationSchema(this.query.rel).map(attr => tuple.vals.find(val => val.attr === attr.name).val);
            db.insert(this.query.rel, raw);
        }
    }
}

class SelectCQ implements IQuery {
    constructor(private query: ISelectCQ) { }

    private resolve(atoms: Array<IAtom>, schema: Schema, varset: CQValueSet): Array<CQAtom> {
        return atoms.map(atom => {
            if (atom.type == TupleType.UNNAMED) {
                return {
                    rel: atom.rel,
                    vars: atom.vals.map((v, i) => {
                        const { type, width } = schema[atom.rel][i];
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
                    vars: schema[rel].map(spec => {
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
        const attrs = this.query.attrs.map(_attr => {
            const { attr, val } = (<INamedValue<VariableName>>_attr);
            return <AttributeSpecification>{
                name: attr,
                type: varset.get(val).type,
                width: varset.get(val).width
            };
        });
        const result = Relation.create(attrs, false);

        const _head = this.query.attrs.map(attr => varset.get(<string>attr.val).id);
        const _body = atoms.map(atom => ({ rel: atom.rel, vars: atom.vars.map(v => v.id) }));
        const tetris = new Tetris(db);
        tetris.evaluate(_head, _body, result);

        return result;
    }
}

export class CQQuery {
    public static parse(q: string): IQuery {
        const _q = parse(q);
        switch (_q.type) {
            case QueryType.CREATE: return new CreateCQ(<ICreateCQ>_q);
            case QueryType.INSERT: return new InsertCQ(<IInsertCQ>_q);
            case QueryType.SELECT: return new SelectCQ(<ISelectCQ>_q);
            default: throw new Error("Unsupported query type.");
        }
    }
}
