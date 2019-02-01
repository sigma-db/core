import { parse } from "./parsers/sql";
import { IQuery } from "./iquery";

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

export class SQLQuery {
    public static parse(Q: string): IQuery {
        const { type, query } = <ParseResult>parse(Q);

        if (type == "use") {
            throw new Error("Operation not implemented");
        }

        return null;
    }
}
