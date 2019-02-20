import { IAttributeLike } from "../../database";

type Literal = bigint;
type VariableName = string;

declare enum QueryType { CREATE = "create", INSERT = "insert", SELECT = "select", INFO = "info" }
declare enum TupleType { NAMED = "named", UNNAMED = "unnamed" }
declare enum ValueType { LITERAL = "literal", VARIABLE = "variable" }

interface IValueCQ<V> {
    type: ValueType;
    val: V;
}

interface INamedValueCQ<V> extends IValueCQ<V> {
    attr: string;
}

interface ITupleCQ<V extends IValueCQ<Literal | VariableName>> {
    type: TupleType;
    vals: Array<V>;
}

interface IAtomCQ extends ITupleCQ<IValueCQ<Literal | VariableName>> {
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
    tuple: ITupleCQ<IValueCQ<Literal>>;
}

interface ISelectCQ extends ICQ {
    name?: string;
    attrs: Array<IValueCQ<Literal | VariableName>>;
    body: Array<IAtomCQ>
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
