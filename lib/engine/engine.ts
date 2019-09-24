import { Attribute, Database, DataType, Relation, Tuple } from "../database";
import { ICreateQuery, IInfoQuery, IInsertQuery, QueryType, TLiteral, TQuery, TupleType } from "../query";
import { GeometricSelectProcessor } from "./geometric";
import { ICreateQueryProcessor, IInfoQueryProcessor, IInsertQueryProcessor, ISelectQueryProcessor } from "./query-processor";

export enum EngineType { ALGEBRAIC, GEOMETRIC }

class CreateProcessor implements ICreateQueryProcessor {
    public evaluate(query: ICreateQuery, db: Database): void {
        db.createRelation(query.rel, query.attrs.map(spec => Attribute.from(spec)));
    }
}

class InsertProcessor implements IInsertQueryProcessor {
    public evaluate(query: IInsertQuery, db: Database): void {
        let raw: TLiteral[];
        if (query.tuple.type === TupleType.UNNAMED) {
            const tuple = query.tuple;
            raw = tuple.values.map(v => v.value);
        } else {
            const { values: vals } = query.tuple;
            raw = db.relation(query.rel).schema.map(attr => vals.find(val => val.attr === attr.name).value.value);
        }
        const _tuple = Tuple.from(raw);
        db.relation(query.rel).insert(_tuple);
    }
}

class InfoProcessor implements IInfoQueryProcessor {
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

    public evaluate(query: IInfoQuery, db: Database): Relation {
        let result: Relation;
        if (!query.rel) {
            result = Relation.create("Database Schema", InfoProcessor.DATABASE_SCHEMA);
            Object.entries(db.schema).forEach(([, rel]) => {
                const tuple = Tuple.create([rel.name, rel.arity, rel.size, rel.isLogged, rel.isStatic]);
                result.insert(tuple);
            });
        } else {
            result = Relation.create(`Relation Schema of "${query.rel}"`, InfoProcessor.RELATION_SCHEMA);
            db.relation(query.rel).schema.forEach(attr => {
                const tuple = Tuple.create([attr.name, attr.type, attr.width]);
                result.insert(tuple);
            });
        }
        return result.freeze();
    }
}

export class Engine {
    public static create(type = EngineType.GEOMETRIC): Engine {
        switch (type) {
            case EngineType.ALGEBRAIC: return new Engine(null);
            case EngineType.GEOMETRIC: return new Engine(new GeometricSelectProcessor());
            default: throw new Error("Unsupported engine type");
        }
    }

    private readonly create: ICreateQueryProcessor;
    private readonly insert: IInsertQueryProcessor;
    private readonly info: IInfoQueryProcessor;

    private constructor(private readonly select: ISelectQueryProcessor) {
        this.create = new CreateProcessor();
        this.insert = new InsertProcessor();
        this.info = new InfoProcessor();
    }

    public evaluate(query: TQuery, db: Database): Relation | void {
        switch (query.type) {
            case QueryType.INSERT: return this.insert.evaluate(query, db);
            case QueryType.SELECT: return this.select.evaluate(query, db);
            case QueryType.CREATE: return this.create.evaluate(query, db);
            case QueryType.INFO: return this.info.evaluate(query, db);
            default: throw new Error("Unsupported query type");
        }
    }
}
