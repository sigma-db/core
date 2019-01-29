import CQQuery from "./cq-query";
import SQLQuery from "./sql-query";

export enum QueryLang { CQ, SQL };
export enum QueryType { CREATE, INSERT, SELECT };

export abstract class Query {
    /**
     * Turns the string representation of a query into an internal object representation
     * @param query The query to parse
     * @param lang The language of the query
     */
    public static parse(query: string, lang: QueryLang): Query {
        switch (lang) {
            case QueryLang.CQ: return CQQuery.parse(query);
            case QueryLang.SQL: return SQLQuery.parse(query);
        }
    }

    public static isCreate(q: Query): q is CreateQuery {
        return q.type === QueryType.CREATE;
    }

    public static isInsert(q: Query): q is InsertQuery {
        return q.type === QueryType.INSERT;
    }

    public static isSelect(q: Query): q is SelectQuery {
        return q.type === QueryType.SELECT;
    }

    public abstract get type(): QueryType;
}

export interface CreateQuery extends Query {
    relation: string;
    attributes: string[];
}

export interface InsertQuery extends Query {
    relation: string;
    tuple: string[];
}

export interface SelectQuery extends Query {
    SAO: string[];
    relations: string[];
    variables(rel: string): string[];
}
