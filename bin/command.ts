interface MapLike {
    [key: string]: string;
}

interface Command {
    cmd: string;
    arg: string;
    opts: MapLike;
}

export class CommandParser {
    public static parse(input: string): Command {
        return new this(input).parseCommand();
    }

    private pos = 0;

    private constructor(private readonly input: string) { }

    public parseCommand(): Command {
        let cmd: string, arg: string, opts: MapLike = {};

        // ignore leading whitespace
        this.parseWhitespace();

        // parse command name
        cmd = this.parseIdentifier();
        this.parseWhitespace();

        // parse the command argument (if any)
        if (!this.isEnd) {
            this.parseLiteral(":");
            this.parseWhitespace();
            arg = this.parseString();
        }

        // if we not yet reached the end, the next char must be a whitespace
        if (!this.isEnd) {
            this.parseLiteral(" ");
            this.parseWhitespace();
        }

        // parse the command options (if any)
        while (!this.isEnd) {
            const name = this.parseIdentifier();
            this.parseWhitespace();
            this.parseLiteral(":");
            this.parseWhitespace();
            const value = this.parseString();

            if (!this.isEnd) {
                this.parseLiteral(" ");
                this.parseWhitespace();
            }

            opts[name] = value;
        }

        // ignore trailing whitespace
        this.parseWhitespace();

        if (this.isEnd) {
            return { cmd, arg, opts };
        } else {
            throw new Error("Could not process input until end.");
        }
    }

    /**
     * Parses an identifier, such as a command or parameter name
     */
    private parseIdentifier(): string {
        const startPos = this.pos;

        while (/^[A-Za-z0-9_]/.test(this.input.charAt(this.pos))) {
            this.pos++;
        }

        if (this.pos === startPos) {
            throw new Error(`Expected name but found "${this.input.charAt(this.pos)}" at ${this.pos}.`);
        } else {
            return this.input.substring(startPos, this.pos);
        }
    }

    /**
     * Parses a double quote delimited string
     */
    private parseString(): string {
        const startPos = this.pos;

        this.parseLiteral("\"", "string");
        while (this.input.charAt(this.pos) !== "\"") {
            this.pos++;
        }
        this.parseLiteral("\"", "string");

        return this.input.substring(startPos + 1, this.pos - 1);
    }

    /**
     * Parses the character specified by `literal` and throws an exception 
     * if the character at the current position does not match.
     * @param literal The character to check
     */
    private parseLiteral(literal: string, expected = `literal "${literal}"`): void {
        if (this.input.charAt(this.pos) === literal) {
            this.pos++;
        } else {
            throw new Error(`Expected ${expected} but found "${this.input.charAt(this.pos)}" at column ${this.pos}.`);
        }
    }

    /**
     * Parses an arbitrary number of whitespace character
     */
    private parseWhitespace(): void {
        while (this.input.charAt(this.pos) === " ") {
            this.pos++;
        }
    }

    /**
     * Whether the input was entirely read
     */
    private get isEnd(): boolean {
        return this.pos >= this.input.length;
    }
}
