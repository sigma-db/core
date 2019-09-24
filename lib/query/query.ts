import { parse as parseCQ } from "./parsers/cq";
import { TQuery } from "./query-type";

export enum QueryLang { CQ, SQL }

export class Query {
    /**
     * Turns the string representation of a query into an internal query object
     * @param query The query to parse
     * @param lang The language of the query. Defaults to CQ.
     */
    public static parse(query: string, lang = QueryLang.CQ): TQuery {
        switch (lang) {
            case QueryLang.CQ: return parseCQ(query);
            case QueryLang.SQL: throw new Error("SQL support is not yet implemented");
            default: throw new Error("Unsupported query language");
        }
    }

    private constructor() { }
}
