import { AttributeLike } from "../database";

namespace Statement {
    export const enum StatementType { CREATE, INSERT, SELECT, INFO, DUMP }
    export const enum TupleType { NAMED, UNNAMED }
    export const enum ValueType { VARIABLE, LITERAL }

    export type Literal = bigint;
    export type VariableName = string;

    export interface VariableValue {
        type: ValueType.VARIABLE;
        name: VariableName;
    }

    export interface LiteralValue {
        type: ValueType.LITERAL;
        value: Literal;
    }

    export type Value = VariableValue | LiteralValue;

    export interface NamedTuple<T extends Value> {
        type: TupleType.NAMED;
        values: Array<{ attr: string, value: T }>;
    }

    export interface UnnamedTuple<T extends Value> {
        type: TupleType.UNNAMED;
        values: T[];
    }

    export type Tuple<T extends Value> = NamedTuple<T> | UnnamedTuple<T>;

    export interface Atom {
        rel: string;
        tuple: Tuple<Value>;
    }

    export interface CreateStatement {
        type: StatementType.CREATE;
        rel: string;
        attrs: AttributeLike[];
    }

    export interface InsertStatement {
        type: StatementType.INSERT;
        rel: string;
        tuple: Tuple<LiteralValue>;
    }

    export interface SelectStatement {
        type: StatementType.SELECT;
        name?: string;
        exports: Array<{ attr: string, value: Value }>;
        body: Atom[];
    }

    export interface InfoStatement {
        type: StatementType.INFO;
        rel?: string;
    }

    export interface DumpStatement {
        type: StatementType.DUMP;
        rel: string;
    }
}

type Statement =
    | Statement.CreateStatement
    | Statement.InsertStatement
    | Statement.SelectStatement
    | Statement.InfoStatement
    | Statement.DumpStatement;

export default Statement;
