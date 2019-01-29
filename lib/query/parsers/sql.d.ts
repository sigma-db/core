export interface ParserOptions {
    startRule?: string;
    tracer?: any;
    [key: string]: any;
}

export function parse(input: string, options?: ParserOptions): any;
export type SyntaxError = any;
