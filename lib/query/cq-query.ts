import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { Attribute, Database, DataType, ISchema, Relation, Tuple } from "../database";
import { IAtom } from "./evaluation/atom";
import { Projection, TetrisJoin, SelingerJoin } from "./evaluation/operators";
import { ValueSet } from "./evaluation/variable";
import { IQuery } from "./index";
import { IAtomCQ, ICreateCQ, IInfoCQ, IInsertCQ, ILoadCQ, INamedValueCQ, ISelectCQ, ITupleCQ, Literal, parse, VariableName } from "./parsers/cq";

enum QueryType { CREATE = "create", INSERT = "insert", SELECT = "select", INFO = "info", LOAD = "load" }
enum TupleType { NAMED = "named", UNNAMED = "unnamed" }
enum ValueType { LITERAL = "literal", VARIABLE = "variable" }

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
            const { vals } = <ITupleCQ<INamedValueCQ<Literal>>>this.query.tuple;
            raw = db.relation(this.query.rel).schema.map(attr => vals.find(val => val.attr === attr.name).val);
        }
        const _tuple = Tuple.from(raw);
        db.relation(this.query.rel).insert(_tuple);
    }
}

class SelectCQ implements IQuery {
    private static readonly JOIN = new SelingerJoin();
    private static readonly PROJECT = new Projection();

    constructor(private query: ISelectCQ) { }

    private resolve(cqatoms: Array<IAtomCQ>, schema: ISchema): [ValueSet, Array<IAtom>] {
        const valset = new ValueSet();
        const atoms = cqatoms.map(atom => {
            if (atom.type == TupleType.UNNAMED) {
                return {
                    rel: schema[atom.rel],
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
                    rel: schema[atom.rel],
                    vars: schema[rel].schema.map(spec => {
                        const v = vals.find(v => (<INamedValueCQ<VariableName>>v).attr === spec.name);
                        if (!v) {
                            return valset.variable(spec.type, spec.width);
                        } else if (v.type == ValueType.VARIABLE) {
                            return valset.variable(spec.type, spec.width, <string>v.val);
                        } else {
                            throw new Error("Constants are not yet supported!");
                        }
                    })
                };
            }
        });
        return [valset, atoms];
    }

    public execute(db: Database): Relation {
        const [valset, atoms] = this.resolve(this.query.body, db.schema);
        const queryAttrs = <Array<INamedValueCQ<VariableName>>>this.query.attrs;
        const schema = queryAttrs.map(({ attr, val }) => Attribute.create(attr, valset.get(val).type, valset.get(val).width));
        const prjSchema = queryAttrs.map(({ val }) => valset.get(val).id);

        const joined = SelectCQ.JOIN.execute(atoms, valset);
        const projected = SelectCQ.PROJECT.execute(joined, prjSchema);
        const result = Relation.from(this.query.name, schema, projected);

        return result.freeze();
    }
}

class InfoCQ implements IQuery {
    private static readonly DATABASE_SCHEMA = [
        Attribute.create("Relation", DataType.STRING, 32),
        Attribute.create("Arity", DataType.INT),
        Attribute.create("Cardinality", DataType.INT),
        Attribute.create("Logged", DataType.BOOL),
        Attribute.create("Static", DataType.BOOL)
    ];
    private static readonly RELATION_SCHEMA = [
        Attribute.create("Attribute", DataType.STRING, 32),
        Attribute.create("Data Type", DataType.STRING, 8),
        Attribute.create("Width", DataType.INT)
    ];

    constructor(private query: IInfoCQ) { }

    public execute(db: Database): Relation {
        let result: Relation;
        if (!this.query.rel) {
            result = Relation.create("Database Schema", InfoCQ.DATABASE_SCHEMA);
            Object.entries(db.schema).forEach(([, rel]) => {
                const tuple = Tuple.create([rel.name, rel.arity, rel.size, rel.isLogged, rel.isStatic]);
                result.insert(tuple);
            });
        } else {
            result = Relation.create(`Relation Schema of "${this.query.rel}"`, InfoCQ.RELATION_SCHEMA);
            db.relation(this.query.rel).schema.forEach(attr => {
                const tuple = Tuple.create([attr.name, attr.type, attr.width]);
                result.insert(tuple);
            });
        }
        return result.freeze();
    }
}

class LoadCQ implements IQuery {
    constructor(private query: ILoadCQ) { }

    public execute(db: Database): void {
        const reader = createInterface(createReadStream(this.query.fpath));
        reader.on('line', line => {
            CQQuery.parse(line).execute(db);
        });
        reader.close();
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
            case QueryType.LOAD: return new LoadCQ(<ILoadCQ>_q);
            default: throw new Error("Unsupported query type.");
        }
    }
}
