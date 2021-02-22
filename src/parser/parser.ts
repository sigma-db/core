import { AttributeLike, DataType } from "../database";
import Statement from "./statement";
import { ERROR } from "./constants";
import { product, union, kleene } from "./helpers";

/**
 * Parses our dialect of conjunctive queries.
 * Note that we do not implement any error recovery and thus expect valid queries as input.
 */
export class Parser {
    public static create(): Parser {
        return new Parser();
    }

    private input: Buffer;
    private pos: number;

    private constructor() { }

    public *parse(input: string): IterableIterator<Statement> {
        this.reset(input);
        while (this.pos < this.input.length) {
            this.whitespace();
            if (this.comment() === ERROR) {
                const stmt = this.statement();
                if (stmt !== ERROR) {
                    yield stmt;
                } else {
                    break;
                }
            }
        }
    }

    private reset(input: string): void {
        this.input = Buffer.from(input, "ascii");
        this.pos = 0;
    }

    private comment(): void {
        if (this.input[this.pos] === 0x25) {
            while (this.input[++this.pos] !== 0x0A);
            this.pos++;
        } else {
            return ERROR;
        }
    }

    private statement(): Statement {
        return union(
            this.insertStatement.bind(this),
            this.createStatement.bind(this),
            this.selectStatement.bind(this),
            this.infoStatement.bind(this),
            this.dumpStatement.bind(this),
        );
    }

    private insertStatement(): Statement.InsertStatement {
        const pos = this.pos;
        const rel = this.identifier();
        if (rel !== ERROR) {
            this.whitespace();
            const tuple = this.valueTuple((): Statement.LiteralValue => {
                const value = this.literal();
                if (value !== ERROR) {
                    return { type: Statement.ValueType.LITERAL, value };
                }
                return ERROR;
            });
            if (tuple !== ERROR) {
                return { type: Statement.StatementType.INSERT, rel, tuple };
            }
        }
        this.pos = pos;
        return ERROR;
    }

    private createStatement(): Statement.CreateStatement {
        const pos = this.pos;
        const rel = this.identifier();
        if (rel !== ERROR) {
            this.whitespace();
            if (this.input[this.pos] === 0x3A) {
                this.pos++;
                this.whitespace();
                const attrs = this.tuple((): AttributeLike => {
                    const pos = this.pos;
                    const name = this.identifier();
                    if (name !== ERROR) {
                        this.whitespace();
                        if (this.input[this.pos] === 0x3A) {
                            this.pos++;
                            this.whitespace();
                            const value = this.typeName();
                            if (value !== ERROR) {
                                return { name, ...value };
                            }
                        }
                    }
                    this.pos = pos;
                    return ERROR;
                });
                if (attrs !== ERROR) {  // try parsing initial values
                    this.whitespace();
                    const values = this.initialisationList();
                    return { type: Statement.StatementType.CREATE, rel, attrs, values };
                }
            }
        }
        this.pos = pos;
        return ERROR;
    }

    private selectStatement(): Statement.SelectStatement {
        const pos = this.pos;
        const name = this.identifier();
        if (name !== ERROR) {
            this.whitespace();
            const exports = this.namedValueTuple((): Statement.VariableValue => {
                const identifier = this.identifier();
                if (identifier !== ERROR) {
                    return { type: Statement.ValueType.VARIABLE, name: identifier };
                }
                return ERROR;
            });
            if (exports !== ERROR) {
                this.whitespace();
                if (this.match("<-")) {
                    this.whitespace();
                    const body = this.list(() => {
                        const rel = this.identifier();
                        if (rel !== ERROR) {
                            this.whitespace();
                            const tuple = this.valueTuple((): Statement.Value => {
                                const literal = this.literal();
                                if (literal !== ERROR) {
                                    return { type: Statement.ValueType.LITERAL, value: literal };
                                }
                                const identifier = this.identifier();
                                if (identifier !== ERROR) {
                                    return { type: Statement.ValueType.VARIABLE, name: identifier };
                                }
                                return ERROR;
                            });
                            if (tuple !== ERROR) {
                                return { rel, tuple };
                            }
                        }
                        return ERROR;
                    });
                    if (body !== ERROR) {
                        return { type: Statement.StatementType.SELECT, exports, name, body };
                    }
                }
            }
        }
        this.pos = pos;
        return ERROR;
    }

    private infoStatement(): Statement.InfoStatement {
        const pos = this.pos;
        const rel = this.identifier();
        this.whitespace();
        if (this.input[this.pos] === 0x3F) {
            this.pos++;
            if (rel === ERROR) {
                return { type: Statement.StatementType.INFO };
            } else {
                return { type: Statement.StatementType.INFO, rel };
            }
        }
        this.pos = pos;
        return ERROR;
    }

    private dumpStatement(): Statement.DumpStatement {
        const pos = this.pos;
        const rel = this.identifier();
        if (rel !== ERROR) {
            this.whitespace();
            if (this.input[this.pos] === 0x21) {
                this.pos++;
                return { type: Statement.StatementType.DUMP, rel };
            }
        }
        this.pos = pos;
        return ERROR;
    }

    private initialisationList(): Array<Statement.Tuple<Statement.LiteralValue>> {
        const pos = this.pos;
        if (this.match(":=")) {
            this.whitespace();
            const values = this.list(() => this.valueTuple((): Statement.LiteralValue => {
                const value = this.literal();
                if (value !== ERROR) {
                    return { type: Statement.ValueType.LITERAL, value };
                }
                return ERROR;
            }));
            if (values !== ERROR) {
                return values;
            }
        }
        this.pos = pos;
        return [];
    }

    private namedValue<T>(valueParser: () => T): { attr: string, value: T } {
        const pos = this.pos;
        const attr = this.identifier();
        if (attr !== ERROR) {
            this.whitespace();
            if (this.input[this.pos] === 0x3D) {
                this.pos++;
                this.whitespace();
                const value = valueParser();
                if (value !== ERROR) {
                    return { attr, value };
                }
            }
        }
        this.pos = pos;
        return ERROR;
    }

    private valueTuple<T extends Statement.Value>(valueParser: () => T): Statement.Tuple<T> {
        return union(
            () => this.unnamedValueTuple(valueParser),
            () => this.namedValueTuple(valueParser),
        );
    }

    private unnamedValueTuple<T extends Statement.Value>(valueParser: () => T): Statement.UnnamedTuple<T> {
        const tuple = this.tuple(() => valueParser());
        if (tuple !== ERROR) {
            return { type: Statement.TupleType.UNNAMED, values: tuple };
        }
        return ERROR;
    }

    private namedValueTuple<T extends Statement.Value>(valueParser: () => T): Statement.NamedTuple<T> {
        const tuple = this.tuple(() => this.namedValue(() => valueParser()));
        if (tuple !== ERROR) {
            return { type: Statement.TupleType.NAMED, values: tuple };
        }
        return ERROR;
    }

    private tuple<T>(valueParser: () => T, min = 0, max = -1, optionalSingletonBrace = true): T[] {
        const pos = this.pos;
        if (this.input[this.pos] === 0x28) {
            this.pos++;
            this.whitespace();
            const values = this.list((): T => valueParser(), min, max);
            if (values !== ERROR && this.whitespace(), this.input[this.pos] === 0x29) {
                this.pos++;
                return values;
            }
        } else if (optionalSingletonBrace && min == 1 && 1 == max) {  // try parsing a single value without surrounding braces
            const value = valueParser();
            if (value !== ERROR) {
                return [value];
            }
        }
        this.pos = pos;
        return ERROR;
    }

    /**
     * Parses a list of n comma-separated entries with min <= n <= max and max = -1 == infinity
     */
    private list<T>(entry: () => T, min = 0, max = -1): T[] {
        const separator = () => this.separator(0x2C);
        const pos = this.pos;
        const head = entry();
        if (head !== ERROR) {
            const _min = min === 0 ? 0 : min - 1;
            const tail = kleene(() => product(separator, entry), _min, max - 1);
            if (tail !== ERROR) {
                return [head, ...tail.map(([, x]) => x)];
            }
        } else if (min === 0) {
            return [];
        }
        this.pos = pos;
        return ERROR;
    }

    /**
     * Matches [A-Za-z_][A-Za-z0-9_]*
     */
    private identifier(): string {
        const pos = this.pos;
        let c = this.input[this.pos];
        if ((c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A) || c == 0x5F) {
            do {
                c = this.input[++this.pos];
            } while ((c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A) || (c >= 0x30 && c <= 0x39) || c == 0x5F);
            return this.input.toString("ascii", pos, this.pos);
        }
        return ERROR;
    }

    private literal(): bigint {
        return union(
            this.intLiteral.bind(this),
            this.stringLiteral.bind(this),
            this.charLiteral.bind(this),
            this.booleanLiteral.bind(this),
        );
    }

    private intLiteral(): bigint {
        if (this.input[this.pos] >= 49 && this.input[this.pos] <= 57) { // parse an integer > 0
            let num = this.input[this.pos++] - 48;
            while (this.input[this.pos] >= 48 && this.input[this.pos] <= 57) {
                num = num * 10 + this.input[this.pos++] - 48;
            }
            return BigInt(num);
        } else if (this.input[this.pos] === 48) {   // parse the integer 0
            this.pos++;
            return 0n;
        }
        return ERROR;
    }

    private stringLiteral(): bigint {
        if (this.input[this.pos] === 0x22) { // parse a string
            let str = 0n;
            while (this.input[++this.pos] !== 0x22) {
                str = (str << 8n) + BigInt(this.input[this.pos]);
            }
            this.pos++;
            return str;
        }
        return ERROR;
    }

    private charLiteral(): bigint {
        if (this.input[this.pos] === 0x27 && this.input[this.pos + 2] === 0x27) {
            this.pos += 3;
            return BigInt(this.input[this.pos - 2]);
        }
        return ERROR;
    }

    private booleanLiteral(): bigint {
        if (this.match("true")) {    // parse a boolean true
            return 1n;
        } else if (this.match("false")) {   // parse a boolean false
            return 0n;
        }
        return ERROR;
    }

    private typeName(): Omit<AttributeLike, "name"> {
        if (this.match("integer") || this.match("int")) {
            return { type: DataType.INT, width: this.widthExpression() ?? 4 };
        } else if (this.match("string") || this.match("varchar")) {
            return { type: DataType.STRING, width: this.widthExpression() ?? 256 };
        } else if (this.match("char")) {
            return { type: DataType.CHAR, width: 1 };
        } else if (this.match("boolean") || this.match("bool")) {
            return { type: DataType.BOOL, width: 1 };
        } else {
            return ERROR;
        }
    }

    private widthExpression(): number {
        const pos = this.pos;
        const tuple = this.tuple(() => this.intLiteral(), 1, 1, false);
        if (tuple !== ERROR) {
            return Number(tuple[0]);
        }
        this.pos = pos;
        return null;
    }

    private separator(s: number): void {
        this.whitespace();
        if (this.input[this.pos] === s) {
            this.pos++;
            this.whitespace();
        } else {
            return ERROR;
        }
    }

    /**
     * Matches `pattern` case-insensitively
     */
    private match(pattern: string): boolean {
        const template = this.input.toString("ascii", this.pos, this.pos + pattern.length);
        const isMatch = pattern.toLowerCase() === template.toLowerCase();
        if (isMatch) {
            this.pos += pattern.length;
        }
        return isMatch;
    }

    /**
     * Matches `[ \t\r\n]*`
     */
    private whitespace(): void {
        let c = this.input[this.pos];
        while (c == 0x09 || c == 0x0A || c == 0x0D || c == 0x20) {
            c = this.input[++this.pos];
        }
    }
}
