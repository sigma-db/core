import CQQuery from "./cq-query";
import SQLQuery from "./sql-query";
import { IComparable } from "../util";

export type Value = Literal | Variable;

export enum QueryLang { CQ, SQL };
export enum QueryType { CREATE = "create", INSERT = "insert", SELECT = "select" }
export enum DataType { INT = "int", STRING = "string", CHAR = "char", BOOL = "bool" }

export interface Schema {
    [name: string]: string[];
}

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

    public resolve(schema: Schema): Query {
        Object.keys(schema).map(rel => schema[rel].map(attr => {
            const p = vals.find(v => v.attr === attr);
            if (!!p) {
                return p.val;
            } else {
                return this.varset.get();
            }
        }));
    }

    public abstract get type(): QueryType;
}

export interface NamedValue {
    attr: string;
    val: Value;
}

export class Variable implements IComparable<Variable> {
    constructor(private id: number) { }

    public compareTo(other: Variable): number {
        return this.id - other.id;
    }
}

export class Literal {
    private constructor(private _value: number | bigint) { }

    public static from(value: number | bigint): Literal {
        return new Literal(value);
    }

    public get value(): number | bigint {
        return this._value;
    }
}

export class VariableSet {
    private count: number = 0;
    private vars: { [name: string]: Variable } = {};

    public get(name: string = `@${this.count}`): Variable {
        this.vars[name] = this.vars[name] || new Variable(this.count++);
        return this.vars[name];
    }
}

interface Atom {
    rel: string;
    vals: Array<Value>;
}

export interface AttrSpec {
    name: string;
    type: DataType;
    width: number;
}

export interface CreateQuery extends Query {
    rel: string;
    attrs: Array<AttrSpec>;
}

export interface InsertQuery extends Query {
    rel: string;
    tuple: Array<Literal>;
}

export interface SelectQuery extends Query {
    name?: string;
    export: Array<Value>;
    SAO: Array<Variable>;
    atoms: Array<Atom>;
}
