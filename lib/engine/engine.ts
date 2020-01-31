import * as Database from "../database";
import * as Query from "../query";
import { SkipList } from "../util/list";
import { IResolvedAtom, TetrisJoin } from "./geometric/tetris-join";
import { VariableSet } from "./variable-set";

export const enum EngineType { ALGEBRAIC, GEOMETRIC }
export const enum ResultType { RELATION, SUCCESS }

type SuccessResult = { type: ResultType.SUCCESS, success: true } | { type: ResultType.SUCCESS, success: false, message: string };
type RelationResult = { type: ResultType.RELATION, relation: Database.Relation };

const SUCCESS = (): SuccessResult => ({ type: ResultType.SUCCESS, success: true });
const ERROR = (message: string): SuccessResult => ({ type: ResultType.SUCCESS, success: false, message });
const RELATION = (relation: Database.Relation): RelationResult => ({ type: ResultType.RELATION, relation });

export type Result = RelationResult | SuccessResult;

export abstract class Engine {
    /**
     * Create a new instance of a query evaluation engine.
     * @param type The type of engine to instantiate. Defaults to `GEOMETRIC`.
     */
    public static create(type = EngineType.GEOMETRIC): Engine {
        switch (type) {
            case EngineType.ALGEBRAIC: return null;
            case EngineType.GEOMETRIC: return new GeometricEngine();
            default: throw new Error("Unsupported engine type");
        }
    }

    /**
     * The schema of the relation generated when asked for the database schema
     */
    private static readonly DATABASE_SCHEMA = [
        Database.Attribute.create("Relation", Database.DataType.STRING, 32),
        Database.Attribute.create("Arity", Database.DataType.INT),
        Database.Attribute.create("Cardinality", Database.DataType.INT),
        Database.Attribute.create("Sorted", Database.DataType.BOOL),
        Database.Attribute.create("Logged", Database.DataType.BOOL),
        Database.Attribute.create("Static", Database.DataType.BOOL),
    ];

    /**
     * The schema of the relation generated when asked for a specifiec relation's schema
     */
    private static readonly RELATION_SCHEMA = [
        Database.Attribute.create("Attribute", Database.DataType.STRING, 32),
        Database.Attribute.create("Data Type", Database.DataType.STRING, 8),
        Database.Attribute.create("Width", Database.DataType.INT),
    ];

    /**
     * Given a program and a database, evaluates the program on the database.
     * @param input The queries to evaluate
     * @param db The database to evaluate the query on
     * @param overlay Whether the evaluation should happen on an overlay instance or on `db` itself
     */
    public evaluate(statements: Iterable<Query.Statement>, db: Database.Instance, overlay = false): Result {
        db = overlay ? db.overlay() : db;
        let result: Result = SUCCESS();
        for (const statement of statements) {
            result = this.evaluateStatement(statement, db);
            if (result.type === ResultType.RELATION) {
                try {
                    db.addRelation(result.relation);
                } catch (e) {
                    return ERROR(e.message);
                }
            } else if (!result.success) {
                return result;
            }
        }
        return result;
    }

    private evaluateStatement(statement: Query.Statement, db: Database.Instance): Result {
        switch (statement.type) {
            case Query.StatementType.INSERT: return this.onInsert(statement, db);
            case Query.StatementType.SELECT: return this.onSelect(statement, db);
            case Query.StatementType.CREATE: return this.onCreate(statement, db);
            case Query.StatementType.INFO: return this.onInfo(statement, db);
            case Query.StatementType.DUMP: return this.onDump(statement, db);
            default: throw new Error("Unsupported query type");
        }
    }

    protected abstract onSelect(statement: Query.SelectStatement, db: Database.Instance): Result;

    protected project(tuples: SkipList<Database.Tuple>, map: number[]): SkipList<Database.Tuple> {
        const result = new SkipList<Database.Tuple>();
        for (const tuple of tuples) {
            const _tuple = Database.Tuple.from(map.map(p => tuple[p]));
            result.insert(_tuple);
        }
        return result;
    }

    protected resolve(cqatoms: Query.Atom[], schema: Database.Schema): [VariableSet, IResolvedAtom[]] {
        const valset = new VariableSet();
        const atoms = cqatoms.map(({ rel, tuple }) => {
            if (tuple.type === Query.TupleType.UNNAMED) {
                return {
                    rel: schema[rel],
                    vars: tuple.values.map((v, i) => {
                        const { type, width } = schema[rel].schema[i];
                        if (v.type === Query.ValueType.VARIABLE) {
                            return valset.variable(type, width, v.name);
                        } else {
                            throw new Error("Constants are not yet supported!");
                        }
                    }),
                };
            } else {
                return {
                    rel: schema[rel],
                    vars: schema[rel].schema.map(spec => {
                        const v = tuple.values.find(val => val.attr === spec.name);
                        if (!v) {
                            return valset.variable(spec.type, spec.width);
                        } else if (v.value.type === Query.ValueType.VARIABLE) {
                            return valset.variable(spec.type, spec.width, v.value.name);
                        } else {
                            throw new Error("Constants are not yet supported!");
                        }
                    }),
                };
            }
        });
        return [valset, atoms];
    }

    private onCreate(statement: Query.CreateStatement, db: Database.Instance): SuccessResult {
        try {
            db.createRelation(statement.rel, statement.attrs.map(spec => Database.Attribute.from(spec)));
            return SUCCESS();
        } catch (e) {
            return ERROR(e.message);
        }
    }

    private onInsert(statement: Query.InsertStatement, db: Database.Instance): SuccessResult {
        let raw: Query.Literal[];
        if (statement.tuple.type === Query.TupleType.UNNAMED) {
            raw = statement.tuple.values.map(v => v.value);
        } else {
            const { values } = statement.tuple;
            try {
                raw = db.getRelation(statement.rel).schema.map(attr => values.find(val => val.attr === attr.name).value.value);
            } catch (e) {
                return ERROR(e.message);
            }
        }
        const _tuple = Database.Tuple.from(raw);
        try {
            db.getRelation(statement.rel).insert(_tuple);
        } catch (e) {
            return ERROR(e.message);
        }
        return SUCCESS();
    }

    private onInfo(statement: Query.InfoStatement, db: Database.Instance): Result {
        let result: Database.Relation;
        if (!statement.rel) {
            result = Database.Relation.create("Database Schema", Engine.DATABASE_SCHEMA);
            Object.entries(db.schema).forEach(([, rel]) => {
                const tuple = Database.Tuple.create([rel.name, rel.arity, rel.size, rel.isSorted, rel.isLogged, rel.isStatic]);
                result.insert(tuple);
            });
        } else {
            result = Database.Relation.create(`Relation Schema of "${statement.rel}"`, Engine.RELATION_SCHEMA, { sorted: false });
            try {
                db.getRelation(statement.rel).schema.forEach(attr => {
                    const tuple = Database.Tuple.create([attr.name, attr.type, attr.width]);
                    result.insert(tuple);
                });
            } catch (e) {
                return ERROR(e.message);
            }
        }
        return RELATION(result.static());
    }

    private onDump(statement: Query.DumpStatement, db: Database.Instance): Result {
        try {
            return RELATION(db.getRelation(statement.rel).static());
        } catch (e) {
            return ERROR(e.message);
        }
    }
}

export class GeometricEngine extends Engine {
    protected onSelect(statement: Query.SelectStatement, db: Database.Instance): Result {
        const [vars, atoms] = super.resolve(statement.body, db.schema);
        const queryAttrs = statement.exports as Array<{ attr: string, value: Query.VariableValue }>;
        const schema = queryAttrs.map(({ attr, value }) => Database.Attribute.create(attr, vars.get(value.name).type, vars.get(value.name).width));
        const prjSchema = queryAttrs.map(({ value }) => vars.get(value.name).id);

        const joined = TetrisJoin.execute(atoms, vars);
        const projected = super.project(joined, prjSchema);
        const result = Database.Relation.create(statement.name, schema, { tuples: projected });

        return RELATION(result.static());
    }
}
