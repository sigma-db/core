import { Attribute, Database, DataType, Relation, Tuple } from "../database";
import { Query } from "../query";
import { CreateQuery, InfoQuery, InsertQuery, QueryType, SelectQuery } from "../query/query";
import { ICreateProcessor, IInfoProcessor, IInsertProcessor, ISelectProcessor } from "./processor";
import { GeometricSelectProcessor } from "./geometric/geometric-engine";

export enum EngineType { ALGEBRAIC, GEOMETRIC }

class CreateProcessor implements ICreateProcessor {
    public evaluate(query: CreateQuery, db: Database): void {
        db.createRelation(query.rel, query.attrs.map(spec => Attribute.from(spec)));
    }
}

class InsertProcessor implements IInsertProcessor {
    public evaluate(query: InsertQuery, db: Database): void {
        let raw: Literal[];
        if (query.tuple.type === TupleType.UNNAMED) {
            const tuple = query.tuple;
            raw = tuple.vals.map(v => v.val);
        } else {
            const { vals } = query.tuple as ITupleCQ<INamedValueCQ<Literal>>;
            raw = db.relation(query.rel).schema.map(attr => vals.find(val => val.attr === attr.name).val);
        }
        const _tuple = Tuple.from(raw);
        db.relation(query.rel).insert(_tuple);
    }
}

class InfoProcessor implements IInfoProcessor {
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

    public evaluate(query: InfoQuery, db: Database): Relation {
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
            case EngineType.ALGEBRAIC: return new Engine(new GeometricSelectProcessor());
            case EngineType.GEOMETRIC: return new Engine(null);
            default: throw new Error("Unsupported engine type");
        }
    }

    private readonly create: ICreateProcessor;
    private readonly insert: IInsertProcessor;
    private readonly info: IInfoProcessor;

    protected constructor(private readonly select: ISelectProcessor) {
        this.create = new CreateProcessor();
        this.insert = new InsertProcessor();
        this.info = new InfoProcessor();
    }

    public evaluate(query: Query, db: Database): Relation | void {
        switch (query.type) {
            case QueryType.INSERT: return this.insert.evaluate(query as InsertQuery, db);
            case QueryType.SELECT: return this.select.evaluate(query as SelectQuery, db);
            case QueryType.CREATE: return this.create.evaluate(query as CreateQuery, db);
            case QueryType.INFO: return this.info.evaluate(query as InfoQuery, db);
            default: throw new Error("Unsupported query type");
        }
    }

    private resolve<Q extends Query>(query: Q, db: Database): Q {
        return null;
    }
}
