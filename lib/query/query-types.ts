import { IAttributeLike } from "../database";
import { TLiteralTuple, TTuple } from "./tuple";

export enum QueryType { CREATE = "create", INSERT = "insert", SELECT = "select", INFO = "info" }

export interface ICreateQuery {
    type: QueryType.CREATE;
    rel: string;
    attrs: IAttributeLike[];
}

export interface IInsertQuery {
    type: QueryType.INSERT;
    rel: string;
    tuple: TLiteralTuple;
}

export interface ISelectQuery {
    type: QueryType.SELECT;
    name?: string;
    exports: IAttributeLike[];
    body: Array<{ rel: string, tuple: TTuple }>;
}

export interface IInfoQuery {
    type: QueryType.INFO;
    rel?: string;
}

export type TQuery = ICreateQuery | IInsertQuery | ISelectQuery | IInfoQuery;
