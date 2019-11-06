import { parse as parseCQ } from "./parsers/cq";
import { parse as parseSQL } from "./parsers/sql";
import { TQuery } from "./query-type";

export const enum QueryLang { CQ, SQL }

export class Query {
    private constructor(private readonly _ast: TQuery) { }

    /**
     * Turns the string representation of a query into an internal query object
     * @param query The query to parse
     * @param lang The language of the query. Defaults to CQ.
     */
    public static parse(query: string, lang = QueryLang.CQ): Query {
        switch (lang) {
            case QueryLang.CQ: return new Query(parseCQ(query, { startRule: "query" }));
            case QueryLang.SQL: return new Query(parseSQL(query, { startRule: "query" }));
            default: throw new Error("Unsupported query language");
        }
    }

    public get AST(): TQuery {
        return this._ast;
    }
}

export class Program {
    private constructor(private readonly _stmts: TQuery[]) { }

    /**
     * Turns the string representation of a script into an internal script object
     * @param script The script to parse
     * @param lang The language of the script. Defaults to CQ.
     */
    public static parse(script: string, lang = QueryLang.CQ): Program {
        switch (lang) {
            case QueryLang.CQ: return new Program(parseCQ(script, { startRule: "program" }));
            case QueryLang.SQL: return new Program(parseSQL(script, { startRule: "program" }));
            default: throw new Error("Unsupported query language");
        }
    }

    public get statements(): IterableIterator<TQuery> {
        return this._stmts.values();    // TODO: Replace by manually optimised parser
    }
}
