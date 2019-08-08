import { CQQuery } from "./internal";

export enum QueryLang { CQ, SQL }

export abstract class Query {
    /**
     * Turns the string representation of a query into an internal object representation
     * @param query The query to parse
     * @param lang The language of the query. Defaults to CQ.
     */
    public static parse(query: string, lang = QueryLang.CQ): Query {
        switch (lang) {
            case QueryLang.CQ: return CQQuery.parse(query);
            case QueryLang.SQL: throw new Error("SQL support is not yet implemented");
            default: throw new Error("Unsupported query language");
        }
    }

    protected constructor() { }
}
