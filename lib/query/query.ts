import { CQQuery } from "./cq-query";
import { TQuery } from "./query-types";

export enum QueryLang { CQ, SQL }

export class Query {
    /**
     * Turns the string representation of a query into an internal query object
     * @param query The query to parse
     * @param lang The language of the query. Defaults to CQ.
     */
    public static parse(query: string, lang = QueryLang.CQ): TQuery {
        switch (lang) {
            case QueryLang.CQ: return CQQuery.parse(query);
            case QueryLang.SQL: throw new Error("SQL support is not yet implemented");
            default: throw new Error("Unsupported query language");
        }
    }

    private constructor() { }
}
