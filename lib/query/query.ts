import { CQQuery } from "./cq-query";
import { IQuery } from "./index";
import { SQLQuery } from "./sql-query";

export enum QueryLang { CQ, SQL };
export enum EngineType { ALGEBRAIC, GEOMETRIC };

export class Query {
    private constructor() { }

    /**
     * Turns the string representation of a query into an internal object representation
     * @param query The query to parse
     * @param lang The language of the query. Defaults to CQ.
     */
    public static parse(query: string, lang: QueryLang = QueryLang.CQ): IQuery {
        switch (lang) {
            case QueryLang.CQ: return CQQuery.parse(query);
            case QueryLang.SQL: return SQLQuery.parse(query);
        }
    }
}

export class Engine {
    private constructor() {

    }

    public static create(engine = EngineType.ALGEBRAIC, lang = QueryLang.CQ): Engine {
        return null;
    }

    /**
     * Turns the string representation of a query into an internal object representation
     * @param query The query to parse
     * @param lang The language of the query. Defaults to CQ.
     */
    public parse(query: string, lang: QueryLang = QueryLang.CQ): IQuery {
        switch (lang) {
            case QueryLang.CQ: return CQQuery.parse(query);
            case QueryLang.SQL: return SQLQuery.parse(query);
        }
    }
}
