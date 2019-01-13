import { parse } from "./parsers/sql";
import Query from "./query";

interface ParseResult {
    head: string;
    body: string;
}

export default class SQLQuery {
    public static parse(Q: string): Query {
        const result = <ParseResult>parse(Q);

        return new class {
            public get SAO(): string[] {
                return null;
            }

            public get relations(): string[] {
                return null;
            }

            public variables(rel: string): string[] {
                return null;
            }
        };
    }
}
