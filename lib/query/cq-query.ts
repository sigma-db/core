import { Attribute, Database, DataType, ISchema, Relation, Tuple } from "../database";
import { Tetris } from "./evaluation/tetris";
import { IQuery } from "./index";
import { IAtom, ICreateCQ, IInfoCQ, IInsertCQ, INamedValue, ISelectCQ, ITuple, Literal, parse, VariableName } from "./parsers/cq";
import { ValueSet, Variable } from "./variable";

enum QueryType { CREATE = "create", INSERT = "insert", SELECT = "select", INFO = "info" }
enum TupleType { NAMED = "named", UNNAMED = "unnamed" }
enum ValueType { LITERAL = "literal", VARIABLE = "variable" }

interface Atom {
    rel: string;
    vars: Array<Variable>;
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

    private resolve(atoms: Array<IAtom>, schema: ISchema): [ValueSet, Array<Atom>] {
        const valset = new ValueSet();
        const cqatoms = atoms.map(atom => {
            if (atom.type == TupleType.UNNAMED) {
                return {
                    rel: atom.rel,
                    vars: atom.vals.map((v, i) => {
                        const { type, width } = schema[atom.rel].schema[i];
                        if (v.type == ValueType.VARIABLE) {
                            return valset.variable(type, width, <string>v.val);
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
                            return valset.variable(spec.type, spec.width);
                        } else if (v.type == ValueType.VARIABLE) {
                            return valset.variable(spec.type, spec.width, <string>v.val);
                        } else {
                            throw new Error("Constants are not yet supported!");
                        }
                    })
                }
            }
        });
        return [valset, cqatoms];
    }

    public execute(db: Database): Relation {
        const [valset, atoms] = this.resolve(this.query.body, db.schema);
        const tetris = new Tetris(db, valset.schema());
        const head = this.query.attrs.map(attr => valset.get(<string>attr.val));
        const tuples = tetris.evaluate(head, valset.variables, atoms);
        const schema = this.query.attrs.map(_attr => {
            const { attr, val } = <INamedValue<VariableName>>_attr;
            return Attribute.create(attr, valset.get(val).type, valset.get(val).width);
        });
        const result = Relation.from(this.query.name, schema, tuples).freeze();
        return result;
    }
}

class InfoCQ implements IQuery {
    private static readonly DATABASE_SCHEMA = [
        Attribute.create("Relation", DataType.STRING, 32),
        Attribute.create("Arity", DataType.INT, 4),
        Attribute.create("Cardinality", DataType.INT, 4)
    ];
    private static readonly RELATION_SCHEMA = [
        Attribute.create("Attribute", DataType.STRING, 32),
        Attribute.create("Data Type", DataType.STRING, 8),
        Attribute.create("Width", DataType.INT, 4)
    ];

    constructor(private query: IInfoCQ) { }

    private str2bits(str: string) {
        return [...str].reduce((result, current) => (result << 8n) + BigInt(current.charCodeAt(0) & 0xFF), 0n);
    }

    public execute(db: Database): Relation {
        let result: Relation;
        if (!this.query.rel) {
            result = Relation.create("Database Schema", InfoCQ.DATABASE_SCHEMA);
            Object.entries(db.schema).forEach(([, rel]) => {
                const tuple = Tuple.from([this.str2bits(rel.name), BigInt(rel.arity), BigInt(rel.size)]);
                result.insert(tuple);
            });
        } else {
            result = Relation.create(`Relation Schema of "${this.query.rel}"`, InfoCQ.RELATION_SCHEMA);
            db.relation(this.query.rel).schema.forEach(attr => {
                const tuple = Tuple.from([this.str2bits(attr.name), this.str2bits(attr.type), BigInt(attr.width)]);
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
