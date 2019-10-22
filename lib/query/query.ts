import { parse as parseCQ } from "./parsers/cq";
import { parse as parseSQL } from "./parsers/sql";
import { TQuery } from "./query-type";

export const enum QueryLang { CQ, SQL }

interface IOptions {
    script: boolean;
    lang: QueryLang;
}

type TParserResult<T extends Partial<IOptions>> = T["script"] extends true ? Program : Query;

abstract class QueryBase {
    private static readonly DEFAULT_OPTIONS: IOptions = {
        script: false,
        lang: QueryLang.CQ,
    } as const;

    /**
     * Turns the string representation of a query into an internal query object
     * @param query The query to parse
     * @param options The language of the query. Defaults to CQ.
     */
    public static parse<O extends Partial<IOptions>>(query: string, options?: O): TParserResult<O> {
        const { lang, script } = { ...QueryBase.DEFAULT_OPTIONS, ...options };
        return (script ? new Program(QueryBase._parse(query, lang, true)) : new Query(QueryBase._parse(query, lang, false))) as TParserResult<O>;
    }

    private static _parse<B extends boolean>(query: string, lang: QueryLang, script: B): B extends true ? TQuery[] : TQuery {
        const startRule = script ? "program" : "query";
        switch (lang) {
            case QueryLang.CQ: return parseCQ(query, { startRule });
            case QueryLang.SQL: return parseSQL(query, { startRule });
            default: throw new Error("Unsupported query language");
        }
    }
}

export class Query extends QueryBase {
    constructor(private readonly _ast: TQuery) {
        super();
    }

    public get AST(): TQuery {
        return this._ast;
    }
}

export class Program extends QueryBase {
    constructor(private readonly _stmts: TQuery[]) {
        super();
    }

    public get statements(): TQuery[] {
        return this._stmts;
    }
}
