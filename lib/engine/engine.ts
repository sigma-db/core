import { Database, Relation } from "../database";
import { Query } from "../query/query";

export enum EngineType { ALGEBRAIC, GEOMETRIC }

export abstract class Engine {
    public static create(type = EngineType.GEOMETRIC): Engine {
        switch (type) {
            case EngineType.ALGEBRAIC: return null;
            case EngineType.GEOMETRIC: return null;
            default: throw new Error("Unsupported engine type");
        }
    }

    protected constructor() { }

    public abstract evaluate(query: Query, db: Database): Relation | void;
}
