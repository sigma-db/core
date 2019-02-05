import { AttributeSpecification, Box, Database, Relation, Schema, DataType } from "../database";
import { CDS } from "../database/cds";
import { WILDCARD } from "../database/constants";
import { IComparable } from "../util";
import { IQuery } from "./index";
import { IAtom, ICreateCQ, IInsertCQ, INamedValue, ISelectCQ, ITuple, parse, VariableName, IValue } from "./parsers/cq";

enum QueryType { CREATE = "create", INSERT = "insert", SELECT = "select" }
enum TupleType { NAMED = "named", UNNAMED = "unnamed" }
enum ValueType { LITERAL = "literal", VARIABLE = "variable" }

interface CQAtom {
    rel: string;
    vars: Array<CQVariable>;
}

class CQVariable implements IComparable<CQVariable> {
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

    public compareTo(other: CQVariable): number {
        return this._id - other._id;
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

    private gaps(atoms: Array<{ rel: string, vars: number[] }>, tuple: number[], SAO: number[], db: Database): Box[] {
        const C = new Array<Box>();
        atoms.forEach(atom => {
            const { rel, vars } = atom;
            const _tuple = vars.map(v => tuple[SAO.indexOf(v)]);
            const B = db.gaps(rel, _tuple).map(b => new Box(SAO.map(v => {
                const pos = vars.indexOf(v);
                return pos < 0 ? WILDCARD : b.at(pos);
            })));
            C.push(...B);
        });
        return C;
    }

    private tetris(head: number[], body: Array<{ rel: string, vars: number[] }>, result: Relation, db: Database) {
        const SAO = [...new Set(body.flatMap(atom => atom.vars))];
        const A: CDS = new CDS();
        const all: Box = Box.all(SAO.length); // a box covering the entire space

        let probe = (b: Box): [boolean, Box] => {
            const a = A.witness(b);
            if (!!a) {
                return [true, a];
            }
            else if (b.isPoint()) {
                return [false, b];
            }
            else {
                let [b1, b2] = b.split();

                let [v1, w1] = probe(b1);
                if (!v1) {
                    return [false, w1];
                }
                else if (w1.contains(b)) {
                    return [true, w1];
                }

                let [v2, w2] = probe(b2);
                if (!v2) {
                    return [false, w2];
                }
                else if (w2.contains(b)) {
                    return [true, w2];
                }

                let w = w1.resolve(w2);
                A.insert(w);
                return [true, w];
            }
        }

        let [v, w] = probe(all);
        while (!v) {
            let B = this.gaps(body, w.point(), SAO, db);
            if (B.length == 0) {
                result.insert(head.map(v => w.point()[SAO.indexOf(v)]));
                B = [w];
            }
            A.insert(...B);
            [v, w] = probe(all);
        }
    }

    public execute(db: Database): Relation {
        const varset = new CQValueSet();
        const atoms = this.resolve(this.query.body, db.schema, varset);
        const attrs = this.query.attrs.map(_attr => {
            const { attr, val } = (<INamedValue<VariableName>>_attr)
            return <AttributeSpecification>{
                name: attr,
                type: varset.get(val).type,
                width: varset.get(val).width
            };
        });
        const result = Relation.create(attrs, false);

        const _head = this.query.attrs.map(attr => varset.get(<string>attr.val).id);
        const _body = atoms.map(atom => ({ rel: atom.rel, vars: atom.vars.map(v => v.id) }));
        this.tetris(_head, _body, result, db);

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
