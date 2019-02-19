import { IAttributeLike } from "../../database";

type Literal = bigint;
type VariableName = string;

declare enum QueryType { CREATE = "create", INSERT = "insert", SELECT = "select", INFO = "info" }
declare enum TupleType { NAMED = "named", UNNAMED = "unnamed" }
declare enum ValueType { LITERAL = "literal", VARIABLE = "variable" }

interface IValue<V> {
    type: ValueType;
    val: V;
}

interface INamedValue<V> extends IValue<V> {
    attr: string;
}

interface ITuple<V extends IValue<Literal | VariableName>> {
    type: TupleType;
    vals: Array<V>;
}

interface IAtom extends ITuple<IValue<Literal | VariableName>> {
    rel: string;
}

interface ICQ {
    type: QueryType;
}

interface ICreateCQ extends ICQ {
    rel: string;
    attrs: Array<IAttributeLike>;
}

interface IInsertCQ extends ICQ {
    rel: string;
    tuple: ITuple<IValue<Literal>>;
}

interface ISelectCQ extends ICQ {
    name?: string;
    attrs: Array<IValue<Literal | VariableName>>;
    body: Array<IAtom>
}

interface IInfoCQ extends ICQ {
    rel?: string;
}

interface ParserOptions {
    startRule?: string;
    tracer?: any;
    [key: string]: any;
}

export function parse(input: string, options?: ParserOptions): ICQ;
