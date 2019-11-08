interface MapLike {
    [key: string]: string;
}

interface CommandLike {
    cmd: string;
    arg: string;
    opts: MapLike;
}

class CommandParser {
    private pos = 0;

    constructor(private readonly input: string) { }

    public parseCommand(): CommandLike {
        let cmd: string, arg: string, opts: MapLike;

        // ignore leading whitespace
        this.parseOptionalWhitespace();

        // parse command name
        cmd = this.parseName();
        this.parseOptionalWhitespace();

        // parse the command argument (if any)
        if (!this.isEnd) {
            this.parseLiteral(":");
            this.parseOptionalWhitespace();
            arg = this.parseValue();
        }

        // parse the command options (if any)
        const params = new Array<MapLike>();
        while (!this.isEnd) {
            this.parseRequiredWhitespace();
            const name = this.parseName();
            this.parseOptionalWhitespace();
            this.parseLiteral(":");
            this.parseOptionalWhitespace();
            const value = this.parseValue();

            params.push({ [name]: value });
        }
        opts = Object.assign({}, ...params);

        // ignore trailing whitespace
        this.parseOptionalWhitespace();

        if (this.isEnd) {
            return { cmd, arg, opts };
        } else {
            throw new Error("Could not process input until end.");
        }
    }

    private parseName(): string {
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

    private parseValue(): string {
        const startPos = this.pos;

        this.parseLiteral("\"", "string");
        while (this.input.charAt(this.pos) !== "\"") {
            this.pos++;
        }

        return this.input.substring(startPos + 1, this.pos++);
    }

    private parseLiteral(literal: string, expected = `literal "${literal}"`): void {
        if (this.input.charAt(this.pos) === literal) {
            this.pos++;
        } else {
            throw new Error(`Expected ${expected} but found "${this.input.charAt(this.pos)}" at column ${this.pos}.`);
        }
    }

    private parseOptionalWhitespace(): void {
        while (this.input.charAt(this.pos) === " ") {
            this.pos++;
        }
    }

    private parseRequiredWhitespace(): void {
        this.parseLiteral(" ");
        this.parseOptionalWhitespace();
    }

    private get isEnd(): boolean {
        return this.pos === this.input.length;
    }
}

export class Command {
    public static parse(input: string): Command {
        const { cmd, arg, opts } = new CommandParser(input).parseCommand();
        return new Command(cmd, arg, opts);
    }

    private constructor(private readonly _cmd: string, private readonly _arg?: string, private readonly _opts?: MapLike) { }

    public get cmd(): string {
        return this._cmd;
    }

    public get arg(): string {
        return this._arg;
    }

    public get opts(): MapLike {
        return this._opts;
    }
}
