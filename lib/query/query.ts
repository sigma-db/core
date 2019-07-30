import { CQQuery } from "./cq-query";
import { IQuery } from "./index";
import { SQLQuery } from "./sql-query";

export enum QueryLang { CQ, SQL }
export enum EngineType { ALGEBRAIC, GEOMETRIC }

export class Query {
    /**
     * Turns the string representation of a query into an internal object representation
     * @param query The query to parse
     * @param lang The language of the query. Defaults to CQ.
     */
    public static parse(query: string, lang = QueryLang.CQ): IQuery {
        switch (lang) {
            case QueryLang.CQ: return CQQuery.parse(query);
            case QueryLang.SQL: return SQLQuery.parse(query);
        }
    }

    private constructor() { }
}

export class Engine {
    public static create(type = EngineType.ALGEBRAIC): Engine {
        return null;
    }

    private constructor() { }

    public evaluate(query: IQuery) {

    }
}
