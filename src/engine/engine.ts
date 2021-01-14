import * as Database from "../database";
import { Statement } from "../parser";
import { Resolver } from "./resolver";
import { Result, ResultType } from "./result";
import { Project } from "./project";
import { TetrisJoin } from "./tetris-join";

export const enum EngineType { ALGEBRAIC, GEOMETRIC }

export interface EngineOpts {
    type: EngineType;
}

export abstract class Engine {
    /**
     * Create a new instance of a query evaluation engine.
     * @param type The type of engine to instantiate. Defaults to `GEOMETRIC`.
     */
    public static create(opts: Partial<EngineOpts> = { type: EngineType.GEOMETRIC }): Engine {
        switch (opts.type) {
            case EngineType.ALGEBRAIC: return null;
            case EngineType.GEOMETRIC: return new GeometricEngine();
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
     * Mapping from data types to their human-readable names
     */
    private static readonly DATA_TYPE_NAME_MAP: Record<Database.DataType, string> = {
        [Database.DataType.INT]: "Integer",
        [Database.DataType.STRING]: "String",
        [Database.DataType.BOOL]: "Bool",
        [Database.DataType.CHAR]: "Char",
    };

    /**
     * Given a statement and a database, evaluates the statement on the database.
     * @param statement The statement to evaluate
     * @param database The database to evaluate the statement on
     */
    public evaluate(statement: Statement, database: Database.Instance): Result {
        const result = this.evaluateStatement(statement, database);
        if (statement.type === Statement.StatementType.SELECT && result.type === ResultType.RELATION) {
            try {
                database.addRelation(result.relation);
            } catch (e) {
                return Result.Error(e.message);
            }
        }
        return result;
    }

    private evaluateStatement(statement: Statement, db: Database.Instance): Result {
        switch (statement.type) {
            case Statement.StatementType.INSERT: return this.onInsert(statement, db);
            case Statement.StatementType.SELECT: return this.onSelect(statement, db);
            case Statement.StatementType.CREATE: return this.onCreate(statement, db);
            case Statement.StatementType.INFO: return this.onInfo(statement, db);
            case Statement.StatementType.DUMP: return this.onDump(statement, db);
            default: throw new Error("Unsupported query type");
        }
    }

    private createDatabaseTuple(tuple: Statement.Tuple<Statement.LiteralValue>, schema: Database.Attribute[]): Database.Tuple | Result {
        let raw: Statement.Literal[];
        if (tuple.type === Statement.TupleType.UNNAMED) {
            raw = tuple.values.map(v => v.value);
        } else {
            const { values } = tuple;
            try {
                raw = schema.map(attr => values.find(val => val.attr === attr.name).value.value);
            } catch (e) {
                return Result.Error(`The tuple does not match the relation's schema.`);
            }
        }
        return Database.Tuple.from(raw);
    }

    protected abstract onSelect(statement: Statement.SelectStatement, db: Database.Instance): Result;

    private onCreate(statement: Statement.CreateStatement, db: Database.Instance): Result {
        // creation
        try {
            db.createRelation(statement.rel, statement.attrs.map(spec => Database.Attribute.from(spec)));
        } catch (e) {
            return Result.Error(e.message);
        }

        // initialisation
        const rel = db.getRelation(statement.rel);
        for (const tuple of statement.values) {
            const _tuple = this.createDatabaseTuple(tuple, rel.schema);
            if (Result.isResult(_tuple)) {
                return _tuple;
            } else {
                try {
                    rel.insert(_tuple);
                } catch (e) {
                    return Result.Error(e.message);
                }
            }
        }

        return Result.Success();
    }

    private onInsert(statement: Statement.InsertStatement, db: Database.Instance): Result {
        if (!db.hasRelation(statement.rel)) {
            return Result.Error(`Relation "${statement.rel}" does not exist in the given instance.`);
        }
        const tuple = this.createDatabaseTuple(statement.tuple, db.getRelation(statement.rel).schema);
        if (Result.isResult(tuple)) {
            return tuple;
        } else {
            try {
                db.getRelation(statement.rel).insert(tuple);
                return Result.Success();
            } catch (e) {
                return Result.Error(e.message);
            }
        }
    }

    private onInfo(statement: Statement.InfoStatement, db: Database.Instance): Result {
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
                db.getRelation(statement.rel).schema.forEach(({ name, type, width }) => {
                    const typename = Engine.DATA_TYPE_NAME_MAP[type];
                    const tuple = Database.Tuple.create([name, typename, width]);
                    result.insert(tuple);
                });
            } catch (e) {
                return Result.Error(e.message);
            }
        }
        return Result.Relation(result.static());
    }

    private onDump(statement: Statement.DumpStatement, db: Database.Instance): Result {
        try {
            return Result.Relation(db.getRelation(statement.rel).static());
        } catch (e) {
            return Result.Error(e.message);
        }
    }
}

export class GeometricEngine extends Engine {
    protected onSelect(statement: Statement.SelectStatement, db: Database.Instance): Result {
        const resolver = Resolver.create(db.schema);
        const [vars, atoms] = resolver.resolve(statement);
        const schema = statement.exports.values.map(({ attr, value: { name } }) => Database.Attribute.create(attr, vars.get(name).type, vars.get(name).width));
        const projectedSchema = statement.exports.values.map(({ value }) => vars.get(value.name).id);

        const joined = TetrisJoin.execute(atoms, vars);
        const projected = Project.execute(joined, projectedSchema);
        const result = Database.Relation.create(statement.name, schema, { tuples: projected });

        return Result.Relation(result.static());
    }
}

export class AlgebraicEngine extends Engine {
    protected onSelect(statement: Statement.SelectStatement, db: Database.Instance): Result {
        throw new Error("Method not implemented.");
    }
}
