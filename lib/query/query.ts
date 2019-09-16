import { CQQuery } from "./internal";
import { TLiteralTuple, TTuple } from "./tuple";

export enum QueryLang { CQ, SQL }
export enum QueryType { CREATE = "create", INSERT = "insert", SELECT = "select", INFO = "info" }
export enum DataType { INT = "int", STRING = "string", CHAR = "char", BOOL = "bool" }

export interface IAttribute {
    name: string;
    type: DataType;
    width: number;
}

export abstract class Query {
    /**
     * Turns the string representation of a query into an internal query object
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

    protected constructor(private readonly type: QueryType) { }

    public isCreateQuery(): this is CreateQuery {
        return this.type === QueryType.CREATE;
    }

    public isInsertQuery(): this is InsertQuery {
        return this.type === QueryType.INSERT;
    }

    public isSelectQuery(): this is SelectQuery {
        return this.type === QueryType.SELECT;
    }

    public isInfoQuery(): this is InfoQuery {
        return this.type === QueryType.INFO;
    }
}

export abstract class CreateQuery extends Query {
    public rel: string;
    public attrs: IAttribute[];
}

export abstract class InsertQuery extends Query {
    public rel: string;
    public tuple: TLiteralTuple;
}

export abstract class SelectQuery extends Query {
    public name?: string;
    public exports: IAttribute[];
    public body: Array<{ rel: string, tuple: TTuple }>;
}

export abstract class InfoQuery extends Query {
    public rel?: string;
}
