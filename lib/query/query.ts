import { CQQuery } from "./cq-query";
import { IQuery } from "./index";
import { SQLQuery } from "./sql-query";

export enum QueryLang { CQ, SQL };

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
