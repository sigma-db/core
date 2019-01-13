import { parse } from "./parsers/cq";
import Query from "./query";

interface Atom {
    name: string;
    vars: string[];
}

interface ParseResult {
    head: Atom;
    body: Atom[];
}

export default class CQQuery {
    public static parse(Q: string): Query {
        const { head, body } = <ParseResult>parse(Q);

        return new class {
            public get SAO(): string[] {
                return head.vars;
            }

            public get relations(): string[] {
                return body.map(atom => atom.name);
            }

            public variables(rel: string): string[] {
                return body.find(atom => atom.name === rel).vars;
            }
        };
    }
}
