import { parse as parseCQ } from "./parsers/cq";
import { parse as parseSQL } from "./parsers/sql";
import { TQuery } from "./query-type";

export const enum QueryLang { CQ, SQL }

export interface IQueryOptions {
    lang: QueryLang;
    script: boolean;
}

export class Query<T extends TQuery | TQuery[]> {
    private static readonly DEFAULT_OPTIONS: IQueryOptions = {
        lang: QueryLang.CQ,
        script: false
    } as const;

    /**
     * Turns the string representation of a query into an internal query object
     * @param query The query to parse
     * @param lang The language of the query. Defaults to CQ.
     */
    public static parse<T extends Partial<IQueryOptions>>(query: string, options?: T): Query<T["script"] extends true ? TQuery[] : TQuery> {
        const { lang, script } = { ...Query.DEFAULT_OPTIONS, ...options };
        const startRule = script ? "program" : "query";

        switch (lang) {
            case QueryLang.CQ: return new Query(parseCQ(query, { startRule }));
            case QueryLang.SQL: return new Query(parseSQL(query, { startRule }));
            default: throw new Error("Unsupported query language");
        }
    }

    private constructor(private readonly _ast: T) { }

    public get AST(): T {
        return this._ast;
    }

    public isProgram(): this is Query<TQuery[]> {
        return Array.isArray(this._ast);
    }

    public isQuery(): this is Query<TQuery> {
        return !Array.isArray(this._ast);
    }
}
