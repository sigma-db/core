import { CQQuery } from "./cq-query";
import { SQLQuery } from "./sql-query";
import { IQuery } from "./iquery";

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
/*
Emp: (name: string, age: int)
Emp("Marc", 21)
db.query('Q(id=y, name="xyz") <- Emp(id=y, divId=z), Div(id=z, name=12)')
*/