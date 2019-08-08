type Identifier = string;

interface Reference {
    table?: Identifier;
    column: Identifier;
}

interface EqualityPredicate {
    left: Reference;
    right: Reference;
}

type ConditionList = EqualityPredicate[];

interface TableReference {
    table: Identifier;
    alias?: Identifier;
}

type FromList = TableReference[];

interface ColumnReference {
    column: Reference;
    alias?: Identifier;
}

interface SelectionList {
    type: "list" | "*";
    columns?: ColumnReference[];
}

interface SelectStatement {
    select: SelectionList;
    from?: FromList;
    where?: ConditionList;
}

interface ParseResult {
    type: "select" | "use";
    query: SelectStatement;
}

export interface ParserOptions {
    startRule?: string;
    tracer?: any;
    [key: string]: any;
}

export function parse(input: string, options?: ParserOptions): any;
export type SyntaxError = any;
