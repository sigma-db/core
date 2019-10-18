import { TQuery } from "../query-type";

interface ParserOptions {
    startRule?: "query" | "program";
}

type TReturnType<T extends ParserOptions> =
    T["startRule"] extends "query" ? TQuery :
    T["startRule"] extends "program" ? TQuery[] :
    never;

export function parse<T extends ParserOptions>(input: string, options?: T): TReturnType<T>;
