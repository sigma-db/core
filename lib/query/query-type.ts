import { IAttributeLike } from "../database";

export const enum QueryType { CREATE, INSERT, SELECT, INFO, DUMP }
export const enum TupleType { NAMED, UNNAMED }
export const enum ValueType { VARIABLE, LITERAL }

export type TLiteral = bigint;
export type TVariableName = string;

export interface IVariableValue {
    type: ValueType.VARIABLE;
    name: TVariableName;
}

export interface ILiteralValue {
    type: ValueType.LITERAL;
    value: TLiteral;
}

export type TValue = IVariableValue | ILiteralValue;

export interface INamedTuple<T extends TValue> {
    type: TupleType.NAMED;
    values: Array<{ attr: string, value: T }>;
}

export interface IUnnamedTuple<T extends TValue> {
    type: TupleType.UNNAMED;
    values: T[];
}

export type TTuple<T extends TValue> = INamedTuple<T> | IUnnamedTuple<T>;

export interface IAtom {
    rel: string;
    tuple: TTuple<TValue>;
}

export interface ICreateQuery {
    type: QueryType.CREATE;
    rel: string;
    attrs: IAttributeLike[];
}

export interface IInsertQuery {
    type: QueryType.INSERT;
    rel: string;
    tuple: TTuple<ILiteralValue>;
}

export interface ISelectQuery {
    type: QueryType.SELECT;
    name?: string;
    exports: Array<{ attr: string, value: TValue }>;
    body: IAtom[];
}

export interface IInfoQuery {
    type: QueryType.INFO;
    rel?: string;
}

export interface IDumpQuery {
    type: QueryType.DUMP;
    rel: string;
}

export type TQuery = ICreateQuery | IInsertQuery | ISelectQuery | IInfoQuery | IDumpQuery;
