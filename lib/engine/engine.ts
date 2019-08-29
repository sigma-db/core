import { Database, Relation } from "../database";
import { Query } from "../query";
import { CreateQuery, InfoQuery, InsertQuery, QueryType, SelectQuery } from "../query/query";
import { CreateProcessor, InfoProcessor, InsertProcessor } from "./base";
import { ICreateProcessor, IInfoProcessor, IInsertProcessor, ISelectProcessor } from "./processor";

export enum EngineType { ALGEBRAIC, GEOMETRIC }

export abstract class Engine {
    public static create(type = EngineType.GEOMETRIC): Engine {
        switch (type) {
            case EngineType.ALGEBRAIC: return new EngineBase();
            case EngineType.GEOMETRIC: return new EngineBase();
            default: throw new Error("Unsupported engine type");
        }
    }

    private readonly create: ICreateProcessor;
    private readonly insert: IInsertProcessor;
    private readonly info: IInfoProcessor;
    private readonly select: ISelectProcessor;

    protected constructor({ create, insert, info, select }: {
        select: ISelectProcessor;
        insert: InsertProcessor;
        create: CreateProcessor;
        info: InfoProcessor;
    }) {
        this.create = create;
        this.insert = insert;
        this.info = info;
        this.select = select;
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
}

class EngineBase extends Engine {
    constructor(select: ISelectProcessor) {
        super({
            select,
            insert: new InsertProcessor(),
            create: new CreateProcessor(),
            info: new InfoProcessor(),
        });
    }
}
