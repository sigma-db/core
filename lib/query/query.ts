import { TQuery, QueryType, IDumpQuery, IInfoQuery, ICreateQuery, IInsertQuery, ISelectQuery, ValueType, TTuple, TLiteral, ILiteralValue } from "./query-type";
import { DataType } from "../database";

class QueryParser {
    public readonly ERROR: never;
    private pos = 0;

    constructor(private input: string) { }

    public *parseProgram(): IterableIterator<TQuery> {
        while (!this.isEnd) {
            this.parseWhitespace();
            if (this.parseComment() !== this.ERROR) {
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

    private parseStatement(): TQuery {
        return this.parseInsertStatement()
            || this.parseCreateStatement()
            || this.parseSelectStatement()
            || this.parseInfoStatement()
            || this.parseDumpStatement();
    }

    private parseComment(): void {
        if (this.input.charAt(this.pos) === "%") {
            this.pos++;
            while (this.parseLineFeed() === this.ERROR) {
                this.pos++;
            }
            return;
        }
        return this.ERROR;
    }

    private parseDumpStatement(): IDumpQuery {
        const pos = this.pos;
        const relName = this.parseIdentifier();

        if (relName !== this.ERROR) {
            this.parseWhitespace();
            if (this.input.charAt(this.pos) === "!") {
                this.pos++;
                return { type: QueryType.DUMP, rel: relName };
            }
        }

        this.pos = pos;
        return this.ERROR;
    }

    private parseInfoStatement(): IInfoQuery {
        const pos = this.pos;

        let relName = this.parseIdentifier();
        this.parseWhitespace();
        if (this.input.charAt(this.pos) === "?") {
            this.pos++;
            if (relName === this.ERROR) {
                relName = null;
            }
            return { type: QueryType.INFO, rel: relName };
        }

        this.pos = pos;
        return this.ERROR;
    }

    private parseCreateStatement(): ICreateQuery {
        var s0, r, s2, s3, s4, s5, s6, head, tail, s9, s10, s11, s12, s13;

        s0 = this.pos;
        r = this.parseIdentifier();
        if (r !== this.ERROR) {
            s2 = this.parseWhitespace();
            if (this.input.charCodeAt(this.pos) === 58) {
                s3 = ":";
                this.pos++;
            } else {
                s3 = this.ERROR;
            }
            if (s3 !== this.ERROR) {
                s4 = this.parseWhitespace();
                if (this.input.charCodeAt(this.pos) === 40) {
                    s5 = "(";
                    this.pos++;
                } else {
                    s5 = this.ERROR;
                }
                if (s5 !== this.ERROR) {
                    s6 = this.parseWhitespace();
                    head = this.parseAttributeSpecification();
                    if (head !== this.ERROR) {
                        tail = [];
                        s9 = this.pos;
                        s10 = this.parseWhitespace();
                        if (this.input.charCodeAt(this.pos) === 44) {
                            s11 = ",";
                            this.pos++;
                        } else {
                            s11 = this.ERROR;
                        }
                        if (s11 !== this.ERROR) {
                            s12 = this.parseWhitespace();
                            s13 = this.parseAttributeSpecification();
                            if (s13 !== this.ERROR) {
                                s9 = s13;
                            } else {
                                this.pos = s9;
                                s9 = this.ERROR;
                            }
                        } else {
                            this.pos = s9;
                            s9 = this.ERROR;
                        }
                        while (s9 !== this.ERROR) {
                            tail.push(s9);
                            s9 = this.pos;
                            s10 = this.parseWhitespace();
                            if (this.input.charCodeAt(this.pos) === 44) {
                                s11 = ",";
                                this.pos++;
                            } else {
                                s11 = this.ERROR;
                            }
                            if (s11 !== this.ERROR) {
                                s12 = this.parseWhitespace();
                                s13 = this.parseAttributeSpecification();
                                if (s13 !== this.ERROR) {
                                    s9 = s13;
                                } else {
                                    this.pos = s9;
                                    s9 = this.ERROR;
                                }
                            } else {
                                this.pos = s9;
                                s9 = this.ERROR;
                            }
                        }
                        s9 = this.parseWhitespace();
                        if (this.input.charCodeAt(this.pos) === 41) {
                            s10 = ")";
                            this.pos++;
                        } else {
                            s10 = this.ERROR;
                        }
                        if (s10 !== this.ERROR) {
                            s0 = { type: "create", rel: r, attrs: [head, ...tail] };
                        } else {
                            this.pos = s0;
                            s0 = this.ERROR;
                        }
                    } else {
                        this.pos = s0;
                        s0 = this.ERROR;
                    }
                } else {
                    this.pos = s0;
                    s0 = this.ERROR;
                }
            } else {
                this.pos = s0;
                s0 = this.ERROR;
            }
        } else {
            this.pos = s0;
            s0 = this.ERROR;
        }

        return s0;
    }

    private parseAttributeSpecification() {
        var s0, a, s2, s3, s4, t;

        s0 = this.pos;
        a = this.parseIdentifier();
        if (a !== this.ERROR) {
            s2 = this.parseWhitespace();
            if (this.input.charCodeAt(this.pos) === 58) {
                s3 = ":";
                this.pos++;
            } else {
                s3 = this.ERROR;
            }
            if (s3 !== this.ERROR) {
                s4 = this.parseWhitespace();
                t = this.parseTypeSpec();
                if (t !== this.ERROR) {
                    s0 = { name: a, ...t };
                } else {
                    this.pos = s0;
                    s0 = this.ERROR;
                }
            } else {
                this.pos = s0;
                s0 = this.ERROR;
            }
        } else {
            this.pos = s0;
            s0 = this.ERROR;
        }

        return s0;
    }

    private parseInsertStatement(): IInsertQuery {
        const pos = this.pos;
        const relName = this.parseIdentifier();
        if (relName !== this.ERROR) {
            this.parseWhitespace();
            if (this.input.charAt(this.pos) === "(") {
                this.pos++;
                this.parseWhitespace();
                const t = this.parseTuple();
                if (t !== this.ERROR) {
                    this.parseWhitespace();
                    if (this.input.charAt(this.pos) === ")") {
                        this.pos++;
                        return { type: QueryType.INSERT, rel: relName, tuple: t };
                    }
                }
            }
        }
        this.pos = pos;
        return this.ERROR;
    }

    private parseTuple(): TTuple<ILiteralValue> {
        var s0, head, tail, s3, s4, s5, s6, s7;

        s0 = this.pos;
        head = this.parseUnnamedValue();
        if (head !== this.ERROR) {
            tail = [];
            s3 = this.pos;
            s4 = this.parseWhitespace();
            if (this.input.charCodeAt(this.pos) === 44) {
                s5 = ",";
                this.pos++;
            } else {
                s5 = this.ERROR;
            }
            if (s5 !== this.ERROR) {
                s6 = this.parseWhitespace();
                s7 = this.parseUnnamedValue();
                if (s7 !== this.ERROR) {
                    s3 = s7;
                } else {
                    this.pos = s3;
                    s3 = this.ERROR;
                }
            } else {
                this.pos = s3;
                s3 = this.ERROR;
            }
            while (s3 !== this.ERROR) {
                tail.push(s3);
                s3 = this.pos;
                s4 = this.parseWhitespace();
                if (this.input.charCodeAt(this.pos) === 44) {
                    s5 = ",";
                    this.pos++;
                } else {
                    s5 = this.ERROR;
                }
                if (s5 !== this.ERROR) {
                    s6 = this.parseWhitespace();
                    s7 = this.parseUnnamedValue();
                    if (s7 !== this.ERROR) {
                        s3 = s7;
                    } else {
                        this.pos = s3;
                        s3 = this.ERROR;
                    }
                } else {
                    this.pos = s3;
                    s3 = this.ERROR;
                }
            }
            s0 = { type: "unnamed", values: [head, ...tail] };
        } else {
            this.pos = s0;
            s0 = this.ERROR;
        }
        if (s0 === this.ERROR) {
            s0 = this.pos;
            head = this.parseNamedValue();
            if (head !== this.ERROR) {
                tail = [];
                s3 = this.pos;
                s4 = this.parseWhitespace();
                if (this.input.charCodeAt(this.pos) === 44) {
                    s5 = ",";
                    this.pos++;
                } else {
                    s5 = this.ERROR;
                }
                if (s5 !== this.ERROR) {
                    s6 = this.parseWhitespace();
                    s7 = this.parseNamedValue();
                    if (s7 !== this.ERROR) {
                        s3 = s7;
                    } else {
                        this.pos = s3;
                        s3 = this.ERROR;
                    }
                } else {
                    this.pos = s3;
                    s3 = this.ERROR;
                }
                while (s3 !== this.ERROR) {
                    tail.push(s3);
                    s3 = this.pos;
                    s4 = this.parseWhitespace();
                    if (this.input.charCodeAt(this.pos) === 44) {
                        s5 = ",";
                        this.pos++;
                    } else {
                        s5 = this.ERROR;
                    }
                    if (s5 !== this.ERROR) {
                        s6 = this.parseWhitespace();
                        s7 = this.parseNamedValue();
                        if (s7 !== this.ERROR) {
                            s3 = s7;
                        } else {
                            this.pos = s3;
                            s3 = this.ERROR;
                        }
                    } else {
                        this.pos = s3;
                        s3 = this.ERROR;
                    }
                }
                s0 = { type: "named", values: [head, ...tail] };
            } else {
                this.pos = s0;
                s0 = this.ERROR;
            }
        }

        return s0;
    }

    private parseNamedValue() {
        var s0, a, s2, s3, s4, v;

        s0 = this.pos;
        a = this.parseIdentifier();
        if (a !== this.ERROR) {
            s2 = this.parseWhitespace();
            if (this.input.charCodeAt(this.pos) === 61) {
                s3 = "=";
                this.pos++;
            } else {
                s3 = this.ERROR;
            }
            if (s3 !== this.ERROR) {
                s4 = this.parseWhitespace();
                v = this.parseLiteral();
                if (v !== this.ERROR) {
                    s0 = { attr: a, value: { type: "literal", value: v } };
                } else {
                    this.pos = s0;
                    s0 = this.ERROR;
                }
            } else {
                this.pos = s0;
                s0 = this.ERROR;
            }
        } else {
            this.pos = s0;
            s0 = this.ERROR;
        }

        return s0;
    }

    private parseUnnamedValue() {
        const v = this.parseLiteral();
        if (v !== this.ERROR) {
            return { type: ValueType.LITERAL, value: v };
        }
        return this.ERROR;
    }

    private parseSelectStatement(): ISelectQuery {
        var s0, name, s2, s3, s4, attrs, s6, s7, s8, s9, s10, body;

        s0 = this.pos;
        name = this.parseIdentifier();
        if (name === this.ERROR) {
            name = null;
        }
        s2 = this.parseWhitespace();
        if (this.input.charCodeAt(this.pos) === 40) {
            s3 = "(";
            this.pos++;
        } else {
            s3 = this.ERROR;
        }
        if (s3 !== this.ERROR) {
            s4 = this.parseWhitespace();
            attrs = this.parseNamedTuple();
            if (attrs !== this.ERROR) {
                s6 = this.parseWhitespace();
                if (this.input.charCodeAt(this.pos) === 41) {
                    s7 = ")";
                    this.pos++;
                } else {
                    s7 = this.ERROR;
                }
                if (s7 !== this.ERROR) {
                    s8 = this.parseWhitespace();
                    if (this.input.substr(this.pos, 2) === "<-") {
                        s9 = "<-";
                        this.pos += 2;
                    } else {
                        s9 = this.ERROR;
                    }
                    if (s9 !== this.ERROR) {
                        s10 = this.parseWhitespace();
                        body = this.parseSelectStatementBody();
                        if (body !== this.ERROR) {
                            s0 = { type: "select", name: name, exports: attrs.values, body: body };
                        } else {
                            this.pos = s0;
                            s0 = this.ERROR;
                        }
                    } else {
                        this.pos = s0;
                        s0 = this.ERROR;
                    }
                } else {
                    this.pos = s0;
                    s0 = this.ERROR;
                }
            } else {
                this.pos = s0;
                s0 = this.ERROR;
            }
        } else {
            this.pos = s0;
            s0 = this.ERROR;
        }

        return s0;
    }

    private parseSelectStatementBody() {
        var s0, head, tail, s3, s4, s5, s6, s7;

        s0 = this.pos;
        head = this.parseAtom();
        if (head !== this.ERROR) {
            tail = [];
            s3 = this.pos;
            s4 = this.parseWhitespace();
            if (this.input.charCodeAt(this.pos) === 44) {
                s5 = ",";
                this.pos++;
            } else {
                s5 = this.ERROR;
            }
            if (s5 !== this.ERROR) {
                s6 = this.parseWhitespace();
                s7 = this.parseAtom();
                if (s7 !== this.ERROR) {
                    s3 = s7;
                } else {
                    this.pos = s3;
                    s3 = this.ERROR;
                }
            } else {
                this.pos = s3;
                s3 = this.ERROR;
            }
            while (s3 !== this.ERROR) {
                tail.push(s3);
                s3 = this.pos;
                s4 = this.parseWhitespace();
                if (this.input.charCodeAt(this.pos) === 44) {
                    s5 = ",";
                    this.pos++;
                } else {
                    s5 = this.ERROR;
                }
                if (s5 !== this.ERROR) {
                    s6 = this.parseWhitespace();
                    s7 = this.parseAtom();
                    if (s7 !== this.ERROR) {
                        s3 = s7;
                    } else {
                        this.pos = s3;
                        s3 = this.ERROR;
                    }
                } else {
                    this.pos = s3;
                    s3 = this.ERROR;
                }
            }
            s0 = [head, ...tail];
        } else {
            this.pos = s0;
            s0 = this.ERROR;
        }

        return s0;
    }

    private parseAtom() {
        var s0, r, s2, s3, s4, t, s6, s7;

        s0 = this.pos;
        r = this.parseIdentifier();
        if (r !== this.ERROR) {
            s2 = this.parseWhitespace();
            if (this.input.charCodeAt(this.pos) === 40) {
                s3 = "(";
                this.pos++;
            } else {
                s3 = this.ERROR;
            }
            if (s3 !== this.ERROR) {
                s4 = this.parseWhitespace();
                t = this.pos;
                s6 = this.parseNamedTuple();
                if (s6 !== this.ERROR) {
                    t = s6;
                } else {
                    this.pos = t;
                    t = this.ERROR;
                }
                if (t === this.ERROR) {
                    t = this.pos;
                    s6 = this.parseUnnamedTuple();
                    if (s6 !== this.ERROR) {
                        t = s6;
                    } else {
                        this.pos = t;
                        t = this.ERROR;
                    }
                }
                if (t !== this.ERROR) {
                    s6 = this.parseWhitespace();
                    if (this.input.charCodeAt(this.pos) === 41) {
                        s7 = ")";
                        this.pos++;
                    } else {
                        s7 = this.ERROR;
                    }
                    if (s7 !== this.ERROR) {
                        s0 = { rel: r, tuple: t };
                    } else {
                        this.pos = s0;
                        s0 = this.ERROR;
                    }
                } else {
                    this.pos = s0;
                    s0 = this.ERROR;
                }
            } else {
                this.pos = s0;
                s0 = this.ERROR;
            }
        } else {
            this.pos = s0;
            s0 = this.ERROR;
        }

        return s0;
    }

    private parseNamedTuple() {
        var s0, head, tail, s3, s4, s5, s6, s7;

        s0 = this.pos;
        head = this.parseNamedAttributeValue();
        if (head !== this.ERROR) {
            tail = [];
            s3 = this.pos;
            s4 = this.parseWhitespace();
            if (this.input.charCodeAt(this.pos) === 44) {
                s5 = ",";
                this.pos++;
            } else {
                s5 = this.ERROR;
            }
            if (s5 !== this.ERROR) {
                s6 = this.parseWhitespace();
                s7 = this.parseNamedAttributeValue();
                if (s7 !== this.ERROR) {
                    s3 = s7;
                } else {
                    this.pos = s3;
                    s3 = this.ERROR;
                }
            } else {
                this.pos = s3;
                s3 = this.ERROR;
            }
            while (s3 !== this.ERROR) {
                tail.push(s3);
                s3 = this.pos;
                s4 = this.parseWhitespace();
                if (this.input.charCodeAt(this.pos) === 44) {
                    s5 = ",";
                    this.pos++;
                } else {
                    s5 = this.ERROR;
                }
                if (s5 !== this.ERROR) {
                    s6 = this.parseWhitespace();
                    s7 = this.parseNamedAttributeValue();
                    if (s7 !== this.ERROR) {
                        s3 = s7;
                    } else {
                        this.pos = s3;
                        s3 = this.ERROR;
                    }
                } else {
                    this.pos = s3;
                    s3 = this.ERROR;
                }
            }
            s0 = { type: "named", values: [head, ...tail] };
        } else {
            this.pos = s0;
            s0 = this.ERROR;
        }

        return s0;
    }

    private parseUnnamedTuple() {
        var s0, head, tail, s3, s4, s5, s6, s7;

        s0 = this.pos;
        head = this.parseAttributeValue();
        if (head !== this.ERROR) {
            tail = [];
            s3 = this.pos;
            s4 = this.parseWhitespace();
            if (this.input.charCodeAt(this.pos) === 44) {
                s5 = ",";
                this.pos++;
            } else {
                s5 = this.ERROR;
            }
            if (s5 !== this.ERROR) {
                s6 = this.parseWhitespace();
                s7 = this.parseAttributeValue();
                if (s7 !== this.ERROR) {
                    s3 = s7;
                } else {
                    this.pos = s3;
                    s3 = this.ERROR;
                }
            } else {
                this.pos = s3;
                s3 = this.ERROR;
            }
            while (s3 !== this.ERROR) {
                tail.push(s3);
                s3 = this.pos;
                s4 = this.parseWhitespace();
                if (this.input.charCodeAt(this.pos) === 44) {
                    s5 = ",";
                    this.pos++;
                } else {
                    s5 = this.ERROR;
                }
                if (s5 !== this.ERROR) {
                    s6 = this.parseWhitespace();
                    s7 = this.parseAttributeValue();
                    if (s7 !== this.ERROR) {
                        s3 = s7;
                    } else {
                        this.pos = s3;
                        s3 = this.ERROR;
                    }
                } else {
                    this.pos = s3;
                    s3 = this.ERROR;
                }
            }
            s0 = { type: "unnamed", values: [head, ...tail] };
        } else {
            this.pos = s0;
            s0 = this.ERROR;
        }

        return s0;
    }

    private parseNamedAttributeValue() {
        var s0, s3, v;

        s0 = this.pos;
        const attrName = this.parseIdentifier();
        if (attrName !== this.ERROR) {
             this.parseWhitespace();
            if (this.input.charCodeAt(this.pos) === 61) {
                s3 = "=";
                this.pos++;
            } else {
                s3 = this.ERROR;
            }
            if (s3 !== this.ERROR) {
                this.parseWhitespace();
                v = this.parseAttributeValue();
                if (v !== this.ERROR) {
                    s0 = { attr: attrName, value: v };
                } else {
                    this.pos = s0;
                    s0 = this.ERROR;
                }
            } else {
                this.pos = s0;
                s0 = this.ERROR;
            }
        } else {
            this.pos = s0;
            s0 = this.ERROR;
        }

        return s0;
    }

    private parseAttributeValue() {
        const literal = this.parseLiteral();
        if (literal !== this.ERROR) {
            return { type: ValueType.LITERAL, value: literal };
        }
        const identifier = this.parseIdentifier();
        if (identifier !== this.ERROR) {
            return { type: ValueType.VARIABLE, name: identifier };
        }
        return this.ERROR;
    }

    private parseIdentifier(): string {
        const pos = this.pos;
        if (/^[A-Za-z_]/.test(this.input.charAt(this.pos))) {
            this.pos++;
            while (/^[A-Za-z0-9_]/.test(this.input.charAt(this.pos++)));
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
            while (this.input.charAt(this.pos) !== "\"") {
                str = (str << 8n) + BigInt(this.input.charCodeAt(this.pos++) & 0xFF);
            }
            return str;
        } else if (this.input.charAt(this.pos) === "'" && this.input.charAt(this.pos + 2) === "'") {       // parse a char
            const c = this.input.charCodeAt(this.pos + 1);
            this.pos += 3;
            return BigInt(c);
        } else if (this.parseStringLiteral("true")) {           // parse a boolean true
            return 1n;
        } else if (this.parseStringLiteral("false")) {          // parse a boolean false
            return 0n;
        } else {
            return this.ERROR;
        }
    }

    private parseTypeSpec() {
        if (this.parseStringLiteral("integer") || this.parseStringLiteral("int")) {
            return { type: DataType.INT, width: this.parseWidthExpression(4) };
        } else if (this.parseStringLiteral("string") || this.parseStringLiteral("varchar")) {
            return { type: DataType.STRING, width: this.parseWidthExpression(256) };
        } else if (this.parseStringLiteral("char")) {
            return { type: DataType.CHAR, width: 1 };
        } else if (this.parseStringLiteral("boolean") || this.parseStringLiteral("bool")) {
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

    private parseStringLiteral(str: string): boolean {
        const isMatch = this.input.substr(this.pos, str.length).toLowerCase() === str;
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

    private parseLineFeed(): void {
        if (this.input.charCodeAt(this.pos) === 10) {
            this.pos++;
        } else if (this.input.charCodeAt(this.pos) === 13 && this.input.charCodeAt(this.pos + 1) === 10) {
            this.pos += 2;
        } else {
            return this.ERROR;
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

        if (result !== parser.ERROR && parser.isEnd) {
            return new Program(result);
        } else {
            throw new Error("Could not process input until end.");
        }
    }

    constructor(private readonly _ast: IterableIterator<TQuery>) { }

    public get statements(): IterableIterator<TQuery> {
        return this._ast;
    }
}
