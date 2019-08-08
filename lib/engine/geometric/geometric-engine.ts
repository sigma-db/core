import { Engine } from "..";
import { Attribute, Database, DataType, ISchema, Relation, Tuple } from "../../database";
import { IAtom } from "../../query/evaluation/atom";
import { ValueSet } from "../../query/evaluation/variable";
import { Query } from "../../query/internal";
import {
    IAtomCQ,
    ICreateCQ,
    IInfoCQ,
    IInsertCQ,
    INamedValueCQ,
    ISelectCQ,
    ITupleCQ,
    Literal,
    parse,
    VariableName,
} from "../../query/parsers/cq";
import { Projection, TetrisJoin } from "./operators";

enum QueryType { CREATE = "create", INSERT = "insert", SELECT = "select", INFO = "info" }
enum TupleType { NAMED = "named", UNNAMED = "unnamed" }
enum ValueType { LITERAL = "literal", VARIABLE = "variable" }

class CreateCQ extends Engine {
    constructor(private readonly query: ICreateCQ) {
        super();
    }

    public evaluate(db: Database): void {
        db.createRelation(this.query.rel, this.query.attrs.map(spec => Attribute.from(spec)));
    }
}

class InsertCQ extends Engine {
    constructor(private readonly query: IInsertCQ) {
        super();
    }

    public evaluate(db: Database): void {
        let raw: Literal[];
        if (this.query.tuple.type === TupleType.UNNAMED) {
            const tuple = this.query.tuple;
            raw = tuple.vals.map(v => v.val);
        } else {
            const { vals } = this.query.tuple as ITupleCQ<INamedValueCQ<Literal>>;
            raw = db.relation(this.query.rel).schema.map(attr => vals.find(val => val.attr === attr.name).val);
        }
        const _tuple = Tuple.from(raw);
        db.relation(this.query.rel).insert(_tuple);
    }
}

class SelectCQ extends Engine {
    private static readonly JOIN = new TetrisJoin();
    private static readonly PROJECT = new Projection();

    constructor(private readonly query: ISelectCQ) {
        super();
    }

    public evaluate(db: Database): Relation {
        const [valset, atoms] = this.resolve(this.query.body, db.schema);
        const queryAttrs = this.query.attrs as Array<INamedValueCQ<VariableName>>;
        const schema = queryAttrs.map(({ attr, val }) => Attribute.create(attr, valset.get(val).type, valset.get(val).width));
        const prjSchema = queryAttrs.map(({ val }) => valset.get(val).id);

        const joined = SelectCQ.JOIN.execute(atoms, valset);
        const projected = SelectCQ.PROJECT.execute(joined, prjSchema);
        const result = Relation.from(this.query.name, schema, projected);

        return result.freeze();
    }

    private resolve(cqatoms: IAtomCQ[], schema: ISchema): [ValueSet, IAtom[]] {
        const valset = new ValueSet();
        const atoms = cqatoms.map(atom => {
            if (atom.type === TupleType.UNNAMED) {
                return {
                    rel: schema[atom.rel],
                    vars: atom.vals.map((v, i) => {
                        const { type, width } = schema[atom.rel].schema[i];
                        if (v.type === ValueType.VARIABLE) {
                            return valset.variable(type, width, v.val as string);
                        } else {
                            throw new Error("Constants are not yet supported!");
                        }
                    }),
                };
            } else {
                const { rel, vals } = atom;
                return {
                    rel: schema[atom.rel],
                    vars: schema[rel].schema.map(spec => {
                        const v = vals.find(val => (val as INamedValueCQ<VariableName>).attr === spec.name);
                        if (!v) {
                            return valset.variable(spec.type, spec.width);
                        } else if (v.type === ValueType.VARIABLE) {
                            return valset.variable(spec.type, spec.width, v.val as string);
                        } else {
                            throw new Error("Constants are not yet supported!");
                        }
                    }),
                };
            }
        });
        return [valset, atoms];
    }
}

class InfoCQ extends Engine {
    private static readonly DATABASE_SCHEMA = [
        Attribute.create("Relation", DataType.STRING, 32),
        Attribute.create("Arity", DataType.INT),
        Attribute.create("Cardinality", DataType.INT),
        Attribute.create("Logged", DataType.BOOL),
        Attribute.create("Static", DataType.BOOL),
    ];
    private static readonly RELATION_SCHEMA = [
        Attribute.create("Attribute", DataType.STRING, 32),
        Attribute.create("Data Type", DataType.STRING, 8),
        Attribute.create("Width", DataType.INT),
    ];

    constructor(private readonly query: IInfoCQ) {
        super();
    }

    public evaluate(db: Database): Relation {
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

export class CQQuery {
    public static parse(q: string): Query {
        const _q = parse(q);
        switch (_q.type) {
            case QueryType.CREATE: return new CreateCQ(_q as ICreateCQ);
            case QueryType.INSERT: return new InsertCQ(_q as IInsertCQ);
            case QueryType.SELECT: return new SelectCQ(_q as ISelectCQ);
            case QueryType.INFO: return new InfoCQ(_q as IInfoCQ);
            default: throw new Error("Unsupported query type.");
        }
    }
}
