type Literal = number;
type VariableName = string;

declare enum QueryType { CREATE = "create", INSERT = "insert", SELECT = "select" }
declare enum TupleType { NAMED = "named", UNNAMED = "unnamed" }
declare enum ValueType { LITERAL = "literal", VARIABLE = "variable" }
declare enum DataType { INT = "int", STRING = "string", CHAR = "char", BOOL = "bool" }

interface IAttrSpec {
    name: string;
    type: DataType;
    width: number;
}

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

interface ISelectTuple<V extends IValue<Literal | VariableName>> extends ITuple<V> {
    rel: string;
}

interface IAtom {
    type: TupleType;
    rel: string;
}

interface INamedAtom extends IAtom {
    vals: ISelectTuple<INamedValue<Literal | VariableName>>;
}

interface IUnnamedAtom extends IAtom {
    vals: ISelectTuple<IValue<Literal | VariableName>>;
}

interface ICQ {
    type: QueryType;
}

interface ICreateCQ extends ICQ {
    rel: string;
    attrs: Array<IAttrSpec>;
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

interface ParserOptions {
    startRule?: string;
    tracer?: any;
    [key: string]: any;
}

export function parse(input: string, options?: ParserOptions): ICQ;
