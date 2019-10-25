import { Attribute, Database, DataType, ISchema, Relation, Tuple } from "../database";
import { IAtom, ICreateQuery, IInfoQuery, IInsertQuery, ISelectQuery, IVariableValue, Program, Query, QueryType, TLiteral, TProgram, TQuery, TupleType, ValueType } from "../query";
import { VariableSet } from "./variable-set";
import { IResolvedAtom, TetrisJoin } from "./geometric";
import { Projection } from "./common";

export const enum EngineType { ALGEBRAIC, GEOMETRIC }
export const enum ResultType { RELATION, SUCCESS }

type TSuccessResult = { type: ResultType.SUCCESS, success: true } | { type: ResultType.SUCCESS, success: false, message: string };
type TRelationResult = { type: ResultType.RELATION, relation: Relation };
export type TResult = TRelationResult | TSuccessResult;

export abstract class Engine {
    /**
     * Creates a new instance of an engine that can be subsequently used to
     * evaluate queries against a database.
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
        Attribute.create("Relation", DataType.STRING, 32),
        Attribute.create("Arity", DataType.INT),
        Attribute.create("Cardinality", DataType.INT),
        Attribute.create("Logged", DataType.BOOL),
        Attribute.create("Static", DataType.BOOL),
    ];

    /**
     * The schema of the relation generated when asked for a specifiec relation's schema
     */
    private static readonly RELATION_SCHEMA = [
        Attribute.create("Attribute", DataType.STRING, 32),
        Attribute.create("Data Type", DataType.STRING, 8),
        Attribute.create("Width", DataType.INT),
    ];

    /**
     * Given a query and a database, evaluates the query on the database
     * and, depending on the query, returns a resulting relation or nothing.
     * @param query The query to evaluate
     * @param db The database to evaluate the query on
     */
    public evaluate(query: Query, db: Database): TResult;

    /**
     * Given a program and a database, evaluates the program on the database
     * and, depending on whether a result relation is specified,
     * returns the relation or only a success message.
     * @param program The program to evaluate
     * @param db The database to evaluate the query on
     * @param relation The relation to return after evaluation of the program
     */
    public evaluate(program: Program, db: Database, relation: string): TResult;

    public evaluate(query: Query | Program, db: Database, relation?: string): TResult {
        return query instanceof Program ?
            this.evaluateProgram(query.statements, db, relation) :
            this.evaluateQuery(query.AST, db);
    }

    private evaluateProgram(statements: TProgram, db: Database, relation: string): TResult {
        if (statements.length > 0) {
            const overlay = db.createOverlay();
            for (let i = 0; i < statements.length; i++) {
                const result = this.evaluateQuery(statements[i], overlay);
                if (result.type === ResultType.RELATION) {
                    try {
                        overlay.addOverlayRelation(result.relation);
                    } catch (e) {
                        return this.error(e.message);
                    }
                } else if (result.success === false) {
                    return result;
                }
            }
            if (!!relation) {
                return this.relation(overlay.relation(relation));
            }
        }
        return this.success();
    }

    private evaluateQuery(query: TQuery, db: Database): TResult {
        switch (query.type) {
            case QueryType.INSERT: return this.onInsert(query, db);
            case QueryType.SELECT: return this.onSelect(query, db);
            case QueryType.CREATE: return this.onCreate(query, db);
            case QueryType.INFO: return this.onInfo(query, db);
            default: throw new Error("Unsupported query type");
        }
    }

    protected abstract onSelect(query: ISelectQuery, db: Database): TResult;

    protected resolve(cqatoms: IAtom[], schema: ISchema): [VariableSet, IResolvedAtom[]] {
        const valset = new VariableSet();
        const atoms = cqatoms.map(({ rel, tuple }) => {
            if (tuple.type === TupleType.UNNAMED) {
                return {
                    rel: schema[rel],
                    vars: tuple.values.map((v, i) => {
                        const { type, width } = schema[rel].schema[i];
                        if (v.type === ValueType.VARIABLE) {
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
                        } else if (v.value.type === ValueType.VARIABLE) {
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

    private onCreate(query: ICreateQuery, db: Database): TSuccessResult {
        try {
            db.createRelation(query.rel, query.attrs.map(spec => Attribute.from(spec)));
            return this.success();
        } catch (e) {
            return this.error(e.message);
        }
    }

    private onInsert(query: IInsertQuery, db: Database): TSuccessResult {
        let raw: TLiteral[];
        if (query.tuple.type === TupleType.UNNAMED) {
            const tuple = query.tuple;
            raw = tuple.values.map(v => v.value);
        } else {
            const { values } = query.tuple;
            try {
                raw = db.relation(query.rel).schema.map(attr => values.find(val => val.attr === attr.name).value.value);
            } catch (e) {
                return this.error(e.message);
            }
        }
        const _tuple = Tuple.from(raw);
        try {
            db.relation(query.rel).insert(_tuple);
        } catch (e) {
            return this.error(e.message);
        }
        return this.success();
    }

    private onInfo(query: IInfoQuery, db: Database): TResult {
        let result: Relation;
        if (!query.rel) {
            result = Relation.create("Database Schema", Engine.DATABASE_SCHEMA);
            Object.entries(db.schema).forEach(([, rel]) => {
                const tuple = Tuple.create([rel.name, rel.arity, rel.size, rel.isLogged, rel.isStatic]);
                result.insert(tuple);
            });
        } else {
            result = Relation.create(`Relation Schema of "${query.rel}"`, Engine.RELATION_SCHEMA, { sorted: false });
            try {
                db.relation(query.rel).schema.forEach(attr => {
                    const tuple = Tuple.create([attr.name, attr.type, attr.width]);
                    result.insert(tuple);
                });
            } catch (e) {
                return this.error(e.message);
            }
        }
        return this.relation(result.freeze());
    }

    protected success(): TSuccessResult {
        return { type: ResultType.SUCCESS, success: true };
    }

    protected error(message: string): TSuccessResult {
        return { type: ResultType.SUCCESS, success: false, message };
    }

    protected relation(relation: Relation): TRelationResult {
        return { type: ResultType.RELATION, relation };
    }
}

export class GeometricEngine extends Engine {
    protected onSelect(query: ISelectQuery, db: Database): TResult {
        const [vars, atoms] = super.resolve(query.body, db.schema);
        const queryAttrs = query.exports as Array<{ attr: string, value: IVariableValue }>;
        const schema = queryAttrs.map(({ attr, value }) => Attribute.create(attr, vars.get(value.name).type, vars.get(value.name).width));
        const prjSchema = queryAttrs.map(({ value }) => vars.get(value.name).id);

        const joined = TetrisJoin.execute(atoms, vars);
        const projected = Projection.execute(joined, prjSchema);
        const result = Relation.from(query.name, schema, projected);

        return super.relation(result.freeze());
    }
}
