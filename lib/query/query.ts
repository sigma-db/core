import { FreeTuple } from "./free-tuple";
import { CQQuery } from "./internal";

export enum QueryLang { CQ, SQL }
export enum QueryType { CREATE = "create", INSERT = "insert", SELECT = "select", INFO = "info" }
export enum ValueType { LITERAL = "literal", VARIABLE = "variable" }

class Tuple {

}

class ConstTuple extends Tuple {

}

export class Atom<T extends Tuple> {
    public relation: string;
    public tuple: T;
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

    public type: QueryType;

    protected constructor() { }
}

export abstract class CreateQuery extends Query {
    public rel: string;
    public attrs: object[];
}

export abstract class InsertQuery extends Query {
    public rel: string;
    public tuple: ConstTuple;
}

export abstract class SelectQuery extends Query {
    public name?: string;
    public attrs: Tuple;
    public body: Array<Atom<Tuple>>;
}

export abstract class InfoQuery extends Query {
    public rel?: string;
}
