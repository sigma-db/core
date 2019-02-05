import { CQQuery } from "./cq-query";
import { SQLQuery } from "./sql-query";
import { IQuery } from "./index";

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
Emp("Sam", 23)
Q(age=x, name=y) <- Emp(age=x, name=y)
Q(name=y) <- Emp(age=x, name=y)
*/
