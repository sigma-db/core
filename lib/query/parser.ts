import { Transform } from "stream";
import { IAttributeLike, DataType, Schema } from "../database";
import * as stmt from "./statement";

export interface ParserOpts {
    schema: Schema
}

export class Parser extends Transform {
    private static readonly WHITESPACE: RegExp = /[ \t\r\n]/;
    private readonly ERROR: never;
    private pos: number = 0;
    private input: string = "";

    public static create(opts?: Partial<ParserOpts>): Parser {
        return new Parser();
    }

    public _transform(input: Buffer, _encoding: string, done: (error?: Error | null, data?: any) => void): void {
        this.input = this.input.substring(this.pos) + input.toString("utf8");
        this.pos = 0;
        this.parse();
        done();
    }

    protected constructor(private database?: Schema) {
        super({
            readableObjectMode: true,
            writableObjectMode: false,
        });
    }

    private parse(): void {
        while (this.pos < this.input.length) {
            this.parseWhitespace();
            if (this.parseComment() === this.ERROR) {
                const pos = this.pos;
                const stmt = this.parseStatement();
                if (stmt !== this.ERROR && (this.parseWhitespace(), this.input.charCodeAt(this.pos) === 0x2E)) {
                    this.pos++;
                    this.push(stmt);
                } else {
                    this.pos = pos;
                    return;
                }
            }
            this.parseWhitespace();
        }
    }

    private parseComment(): void {
        if (this.input.charCodeAt(this.pos) === 0x25) {
            while (this.input.charCodeAt(++this.pos) !== 0x0A);
            this.pos++;
        } else {
            return this.ERROR;
        }
    }

    private parseStatement(): stmt.Statement {
        return this.parseInsertStatement()
            || this.parseCreateStatement()
            || this.parseSelectStatement()
            || this.parseInfoStatement()
            || this.parseDumpStatement();
    }

    private parseInsertStatement(): stmt.InsertStatement {
        const pos = this.pos;
        const rel = this.parseIdentifier();
        if (rel !== this.ERROR) {
            this.parseWhitespace();
            const tuple = this.parseValueTuple((): stmt.LiteralValue => {
                const value = this.parseLiteral();
                if (value !== this.ERROR) {
                    return { type: stmt.ValueType.LITERAL, value };
                }
                return this.ERROR;
            });
            if (tuple !== this.ERROR) {
                return { type: stmt.StatementType.INSERT, rel, tuple };
            }
        }
        this.pos = pos;
        return this.ERROR;
    }

    private parseCreateStatement(): stmt.CreateStatement {
        const pos = this.pos;
        const rel = this.parseIdentifier();
        if (rel !== this.ERROR) {
            this.parseWhitespace();
            if (this.input.charCodeAt(this.pos) === 0x3A) {
                this.pos++;
                this.parseWhitespace();
                const attrs = this.parseTuple((): IAttributeLike => {
                    const pos = this.pos;
                    const name = this.parseIdentifier();
                    if (name !== this.ERROR) {
                        this.parseWhitespace();
                        if (this.input.charCodeAt(this.pos) === 0x3A) {
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
                    return { type: stmt.StatementType.CREATE, rel, attrs }
                }
            }
        }
        this.pos = pos;
        return this.ERROR;
    }

    private parseSelectStatement(): stmt.SelectStatement {
        const pos = this.pos;
        const name = this.parseIdentifier();
        if (name !== this.ERROR) {
            this.parseWhitespace();
            const exports = this.parseTuple((): { attr: string, value: stmt.VariableValue } => {
                const value = this.parseNamedValue(() => this.parseIdentifier());
                if (value !== this.ERROR) {
                    return { attr: value.attr, value: { type: stmt.ValueType.VARIABLE, name: value.value } };
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
                            const tuple = this.parseValueTuple((): stmt.Value => {
                                const literal = this.parseLiteral();
                                if (literal !== this.ERROR) {
                                    return { type: stmt.ValueType.LITERAL, value: literal };
                                }
                                const identifier = this.parseIdentifier();
                                if (identifier !== this.ERROR) {
                                    return { type: stmt.ValueType.VARIABLE, name: identifier };
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
                        return { type: stmt.StatementType.SELECT, exports, name, body };
                    }
                }
            }
        }
        this.pos = pos;
        return this.ERROR;
    }

    private parseInfoStatement(): stmt.InfoStatement {
        const pos = this.pos;
        const rel = this.parseIdentifier();
        this.parseWhitespace();
        if (this.input.charCodeAt(this.pos) === 0x3F) {
            this.pos++;
            if (rel === this.ERROR) {
                return { type: stmt.StatementType.INFO }
            } else {
                return { type: stmt.StatementType.INFO, rel };
            }
        }
        this.pos = pos;
        return this.ERROR;
    }

    private parseDumpStatement(): stmt.DumpStatement {
        const pos = this.pos;
        const rel = this.parseIdentifier();
        if (rel !== this.ERROR) {
            this.parseWhitespace();
            if (this.input.charCodeAt(this.pos) === 0x21) {
                this.pos++;
                return { type: stmt.StatementType.DUMP, rel };
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
            if (this.input.charCodeAt(this.pos) === 0x3D) {
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

    private parseValueTuple<T extends stmt.Value>(valueParser: () => T): stmt.Tuple<T> {
        const unnamedTuple = this.parseTuple((): T => valueParser());
        if (unnamedTuple !== this.ERROR) {
            return { type: stmt.TupleType.UNNAMED, values: unnamedTuple };
        }

        const namedTuple = this.parseTuple((): { attr: string, value: T } => this.parseNamedValue(() => valueParser()));
        if (namedTuple !== this.ERROR) {
            return { type: stmt.TupleType.NAMED, values: namedTuple };
        }

        return this.ERROR;
    }

    private parseTuple<T>(valueParser: () => T): T[] {
        const pos = this.pos;
        if (this.input.charCodeAt(this.pos) === 0x28) {
            this.pos++;
            this.parseWhitespace();
            const values = this.parseList((): T => valueParser());
            if (values !== this.ERROR && this.parseWhitespace(), this.input.charCodeAt(this.pos) === 0x29) {
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
            if (this.input.charCodeAt(this.pos) === 0x2C) {
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
        } else if (this.input.charCodeAt(this.pos) === 0x22) {      // parse a string
            let str = 0n;
            while (this.input.charCodeAt(++this.pos) !== 0x22) {
                str = (str << 8n) + BigInt(this.input.charCodeAt(this.pos) & 0xFF);
            }
            this.pos++;
            return str;
        } else if (this.input.charCodeAt(this.pos) === 0x27 && this.input.charCodeAt(this.pos + 2) === 0x27) {       // parse a char
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

    private parseWidthExpression(defaultWidth: number): number {
        const pos = this.pos;
        this.parseWhitespace();
        if (this.input.charCodeAt(this.pos) === 0x28) {
            this.pos++;
            this.parseWhitespace();
            if (this.input.charCodeAt(this.pos) >= 49 && this.input.charCodeAt(this.pos) <= 57) {
                let num = this.input.charCodeAt(this.pos++) - 48;
                while (this.input.charCodeAt(this.pos) >= 48 && this.input.charCodeAt(this.pos) <= 57) {
                    num = num * 10 + this.input.charCodeAt(this.pos++) - 48;
                }
                this.parseWhitespace();
                if (this.input.charCodeAt(this.pos) === 0x29) {
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

    private parseWhitespace(): void {
        while (Parser.WHITESPACE.test(this.input.charAt(this.pos))) {
            this.pos++;
        }
    }
}