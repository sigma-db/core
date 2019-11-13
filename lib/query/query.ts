import { TQuery, QueryType, IDumpQuery, IInfoQuery, ICreateQuery, IInsertQuery, ISelectQuery, ValueType, TTuple, ILiteralValue, TValue, TupleType, IVariableValue } from "./query-type";
import { DataType, IAttributeLike } from "../database";

class QueryParser {
    public readonly ERROR: never;
    private pos = 0;

    constructor(private input: string) { }

    public *parseProgram(): IterableIterator<TQuery> {
        while (!this.isEnd) {
            this.parseWhitespace();
            if (this.parseComment() === this.ERROR) {
                const pos = this.pos;
                const stmt = this.parseStatement();
                if (stmt !== this.ERROR && (this.parseWhitespace(), this.input.charAt(this.pos) === ".")) {
                    this.pos++;
                    yield stmt;
                } else {
                    this.pos = pos;
                    return this.ERROR;
                }
            }
            this.parseWhitespace();
        }
    }

    public parseQuery(): TQuery {
        const pos = this.pos;
        this.parseWhitespace();
        const stmt = this.parseStatement();
        if (stmt !== this.ERROR) {
            this.parseWhitespace();
            return stmt;
        }
        this.pos = pos;
        return this.ERROR;
    }

    private parseComment(): void {
        if (this.input.charAt(this.pos) === "%") {
            this.pos++;
            while (this.input.charAt(this.pos) !== "\n") {
                this.pos++;
            }
            this.pos++;
            return;
        }
        return this.ERROR;
    }

    private parseStatement(): TQuery {
        return this.parseInsertStatement()
            || this.parseCreateStatement()
            || this.parseSelectStatement()
            || this.parseInfoStatement()
            || this.parseDumpStatement();
    }

    private parseInsertStatement(): IInsertQuery {
        const pos = this.pos;
        const rel = this.parseIdentifier();
        if (rel !== this.ERROR) {
            this.parseWhitespace();
            const tuple = this.parseValueTuple((): ILiteralValue => {
                const value = this.parseLiteral();
                if (value !== this.ERROR) {
                    return { type: ValueType.LITERAL, value };
                }
                return this.ERROR;
            });
            if (tuple !== this.ERROR) {
                return { type: QueryType.INSERT, rel, tuple };
            }
        }
        this.pos = pos;
        return this.ERROR;
    }

    private parseCreateStatement(): ICreateQuery {
        const pos = this.pos;
        const rel = this.parseIdentifier();
        if (rel !== this.ERROR) {
            this.parseWhitespace();
            if (this.input.charAt(this.pos) === ":") {
                this.pos++;
                this.parseWhitespace();
                const attrs = this.parseTuple((): IAttributeLike => {
                    const pos = this.pos;
                    const name = this.parseIdentifier();
                    if (name !== this.ERROR) {
                        this.parseWhitespace();
                        if (this.input.charAt(this.pos) === ":") {
                            this.pos++;
                            this.parseWhitespace();
                            const value = this.parseTypeName();
                            if (value !== this.ERROR) {
                                return { name, ...value };
                            }
                        }
                    }
                    this.pos = pos;
                    return this.ERROR;
                });
                if (attrs !== this.ERROR) {
                    return { type: QueryType.CREATE, rel, attrs }
                }
            }
        }
        this.pos = pos;
        return this.ERROR;
    }

    private parseSelectStatement(): ISelectQuery {
        const pos = this.pos;
        const name = this.parseIdentifier();
        if (name !== this.ERROR) {
            this.parseWhitespace();
            const exports = this.parseTuple((): { attr: string, value: IVariableValue } => {
                const value = this.parseNamedValue(() => this.parseIdentifier());
                if (value !== this.ERROR) {
                    return { attr: value.attr, value: { type: ValueType.VARIABLE, name: value.value } };
                }
                return this.ERROR;
            });
            if (exports !== this.ERROR) {
                this.parseWhitespace();
                if (this.parseString("<-")) {
                    this.parseWhitespace();
                    const body = this.parseList(() => {
                        const rel = this.parseIdentifier();
                        if (rel !== this.ERROR) {
                            this.parseWhitespace();
                            const tuple = this.parseValueTuple((): TValue => {
                                const literal = this.parseLiteral();
                                if (literal !== this.ERROR) {
                                    return { type: ValueType.LITERAL, value: literal };
                                }
                                const identifier = this.parseIdentifier();
                                if (identifier !== this.ERROR) {
                                    return { type: ValueType.VARIABLE, name: identifier };
                                }
                                return this.ERROR;
                            });
                            if (tuple !== this.ERROR) {
                                return { rel, tuple };
                            }
                        }
                        return this.ERROR;
                    });
                    if (body !== this.ERROR) {
                        return { type: QueryType.SELECT, exports, name, body };
                    }
                }
            }
        }
        this.pos = pos;
        return this.ERROR;
    }

    private parseInfoStatement(): IInfoQuery {
        const pos = this.pos;
        const rel = this.parseIdentifier();
        this.parseWhitespace();
        if (this.input.charAt(this.pos) === "?") {
            this.pos++;
            if (rel === this.ERROR) {
                return { type: QueryType.INFO }
            } else {
                return { type: QueryType.INFO, rel };
            }
        }
        this.pos = pos;
        return this.ERROR;
    }

    private parseDumpStatement(): IDumpQuery {
        const pos = this.pos;
        const rel = this.parseIdentifier();
        if (rel !== this.ERROR) {
            this.parseWhitespace();
            if (this.input.charAt(this.pos) === "!") {
                this.pos++;
                return { type: QueryType.DUMP, rel };
            }
        }
        this.pos = pos;
        return this.ERROR;
    }

    private parseNamedValue<T>(valueParser: () => T): { attr: string, value: T } {
        const pos = this.pos;
        const attr = this.parseIdentifier();
        if (attr !== this.ERROR) {
            this.parseWhitespace();
            if (this.input.charAt(this.pos) === "=") {
                this.pos++;
                this.parseWhitespace();
                const value = valueParser();
                if (value !== this.ERROR) {
                    return { attr, value };
                }
            }
        }
        this.pos = pos;
        return this.ERROR;
    }

    private parseValueTuple<T extends TValue>(valueParser: () => T): TTuple<T> {
        const unnamedTuple = this.parseTuple((): T => valueParser());
        if (unnamedTuple !== this.ERROR) {
            return { type: TupleType.UNNAMED, values: unnamedTuple };
        }

        const namedTuple = this.parseTuple((): { attr: string, value: T } => this.parseNamedValue(() => valueParser()));
        if (namedTuple !== this.ERROR) {
            return { type: TupleType.NAMED, values: namedTuple };
        }

        return this.ERROR;
    }

    private parseTuple<T>(valueParser: () => T): T[] {
        const pos = this.pos;
        if (this.input.charAt(this.pos) === "(") {
            this.pos++;
            this.parseWhitespace();
            const values = this.parseList((): T => valueParser());
            if (values !== this.ERROR && this.parseWhitespace(), this.input.charAt(this.pos) === ")") {
                this.pos++;
                return values;
            }
        }
        this.pos = pos;
        return this.ERROR;
    }

    private parseList<T>(valueParser: () => T): T[] {
        const values = new Array<T>();
        let pos = this.pos;

        let value = valueParser();
        while (value !== this.ERROR) {
            values.push(value);
            pos = this.pos;
            this.parseWhitespace();
            if (this.input.charAt(this.pos) === ",") {
                this.pos++;
                this.parseWhitespace();
                value = valueParser();
            } else {
                value = this.ERROR;
            }
        }
        this.pos = pos;

        return values.length > 0 ? values : this.ERROR;
    }

    private parseIdentifier(): string {
        const pos = this.pos;
        if (/^[A-Za-z_]/.test(this.input.charAt(this.pos))) {
            this.pos++;
            while (/^[A-Za-z0-9_]/.test(this.input.charAt(this.pos))) {
                this.pos++;
            }
            return this.input.substring(pos, this.pos);
        }
        return this.ERROR;
    }

    private parseLiteral(): bigint {
        if (this.input.charCodeAt(this.pos) >= 49 && this.input.charCodeAt(this.pos) <= 57) {   // parse an integer > 0
            let num = this.input.charCodeAt(this.pos++) - 48;
            while (this.input.charCodeAt(this.pos) >= 48 && this.input.charCodeAt(this.pos) <= 57) {
                num = num * 10 + this.input.charCodeAt(this.pos++) - 48;
            }
            return BigInt(num);
        } else if (this.input.charCodeAt(this.pos) === 48) {    // parse the integer 0
            this.pos++;
            return 0n;
        } else if (this.input.charAt(this.pos) === "\"") {      // parse a string
            let str = 0n;
            while (this.input.charAt(++this.pos) !== "\"") {
                str = (str << 8n) + BigInt(this.input.charCodeAt(this.pos) & 0xFF);
            }
            this.pos++;
            return str;
        } else if (this.input.charAt(this.pos) === "'" && this.input.charAt(this.pos + 2) === "'") {       // parse a char
            this.pos += 3;
            return BigInt(this.input.charCodeAt(this.pos - 2));
        } else if (this.parseString("true")) {           // parse a boolean true
            return 1n;
        } else if (this.parseString("false")) {          // parse a boolean false
            return 0n;
        } else {
            return this.ERROR;
        }
    }

    private parseTypeName() {
        if (this.parseString("integer") || this.parseString("int")) {
            return { type: DataType.INT, width: this.parseWidthExpression(4) };
        } else if (this.parseString("string") || this.parseString("varchar")) {
            return { type: DataType.STRING, width: this.parseWidthExpression(256) };
        } else if (this.parseString("char")) {
            return { type: DataType.CHAR, width: 1 };
        } else if (this.parseString("boolean") || this.parseString("bool")) {
            return { type: DataType.BOOL, width: 1 };
        } else {
            return this.ERROR;
        }
    }

    /**
     * Parses an expression of the form `(\s*[1-9][0-9]*\s*)`, e.g. `(64)` or `( 64 )`
     * @param defaultWidth The default value to return if the regex does not match
     */
    private parseWidthExpression(defaultWidth: number): number {
        const pos = this.pos;
        this.parseWhitespace();
        if (this.input.charAt(this.pos) === "(") {
            this.pos++;
            this.parseWhitespace();
            if (this.input.charCodeAt(this.pos) >= 49 && this.input.charCodeAt(this.pos) <= 57) {
                let num = this.input.charCodeAt(this.pos++) - 48;
                while (this.input.charCodeAt(this.pos) >= 48 && this.input.charCodeAt(this.pos) <= 57) {
                    num = num * 10 + this.input.charCodeAt(this.pos++) - 48;
                }
                this.parseWhitespace();
                if (this.input.charAt(this.pos) === ")") {
                    this.pos++;
                    return num;
                }
            }
        }
        this.pos = pos;
        return defaultWidth;
    }

    private parseString(str: string): boolean {
        const isMatch = this.input.substring(this.pos, this.pos + str.length).toLowerCase() === str;
        if (isMatch) this.pos += str.length;
        return isMatch;
    }

    /**
     * Greedily parses an arbitrary amount of whitespace characters.
     */
    private parseWhitespace(): void {
        while (/^[ \t\r\n]/.test(this.input.charAt(this.pos))) {
            this.pos++;
        }
    }

    public get isEnd(): boolean {
        return this.pos >= this.input.length;
    }
}

export class Query {
    /**
     * Turns the string representation of a query into an internal object
     * @param input The query or script to parse
     */
    public static parse(input: string): Query {
        const parser = new QueryParser(input);
        const result = parser.parseQuery();

        if (result !== parser.ERROR && parser.isEnd) {
            return new Query(result);
        } else {
            throw new Error("Could not process input until end.");
        }
    }

    protected constructor(private readonly _ast: TQuery) { }

    public get AST(): TQuery {
        return this._ast;
    }
}

export class Program {
    /**
     * Turns the string representation of a script into an internal object
     * @param input The query or script to parse
     */
    public static parse(input: string): Program {
        const parser = new QueryParser(input);
        const result = parser.parseProgram();
        return new Program(result);
    }

    constructor(private readonly _ast: IterableIterator<TQuery>) { }

    public get statements(): IterableIterator<TQuery> {
        return this._ast;
    }
}
