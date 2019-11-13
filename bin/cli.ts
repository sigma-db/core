import { Database, Engine, Query, ResultType, Program, Result, EngineType } from "../lib";
import { Command } from "./command";
import { readFileSync } from "fs";
import * as readline from "readline";
import { version } from "../package.json";

export default class CLI {
    public static start(database: Database, engine: Engine): void {
        if (!database.isLogged) {
            console.warn("Working in a temporary database.");
            console.warn("Any data generated during this session will be lost upon closing the client!\n");
            console.warn("Run the client with 'sigma --database=\"</path/to/database>\"' to make changes persistent.");
        }
        new CLI(database, engine).repl.prompt();
    }

    private readonly repl: readline.Interface;
    private commandMode: boolean;

    private constructor(private database: Database, private engine: Engine) {
        this.repl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        this.commandMode = false;

        this.repl.on("close", () => this.database.close());
        this.repl.on("line", input => {
            try {
                if (this.commandMode) {
                    this.handleCommand(Command.parse(input));
                } else {
                    const result = this.engine.evaluate(Query.parse(input), this.database);
                    this.logResult(result);
                }
            } catch (e) {
                console.log(e.message);
            }
            this.repl.prompt();
        });

        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        process.stdin.on('keypress', (_str, key) => {
            if (key && key.name === "escape") { // the escape-key is used to toggle between query mode and command mode
                this.toggleMode();
            }
        });
    }

    private isFlagSet(flag: string): boolean {
        flag = flag.toLowerCase();
        return flag === "true" || flag === "yes" || flag === "y";
    }

    private toggleMode(preserveCursor = true): void {
        this.commandMode = !this.commandMode;
        this.repl.setPrompt(this.commandMode ? "! " : "> ");
        this.repl.prompt(preserveCursor);
    }

    private unindent(strings: TemplateStringsArray, ...keys: any[]): string {
        // build the raw string by "inserting" variable values and split resulting string into lines
        let lines = strings.reduce((res, str, idx) => `${res}${keys[idx - 1]}${str}`).split("\n");

        if (lines.length > 0) {
            let depth = 0;
            // remove leading newlines
            while (!lines[0]) lines.shift();
            // remove trailing newlines
            while (!lines[lines.length - 1]) lines.pop();
            // use the first line's leading whitespace as the entire string's indentation level
            while (lines[0].charAt(depth) === " ") depth++;

            return lines.map(str => str.substring(depth)).join("\r\n");
        } else {
            return "";
        }
    }

    private handleCommand({ cmd, arg, opts }: Command): void {
        switch (cmd.toLowerCase()) {
            case "run":
            case "exec":
            case "eval":
                const { ans, overlay } = opts;
                try {
                    const program = Program.parse(readFileSync(arg, "utf8"));
                    const result = this.engine.evaluate(program, this.database, ans || "", this.isFlagSet(overlay));
                    this.logResult(result);
                } catch (e) {
                    console.error(e.message);
                }
                return;
            case "query":
                this.toggleMode(false);
                return;
            case "use":
            case "database":
                this.database.close();
                this.database = !!arg ? Database.open(arg) : Database.temp();
                console.log(!! arg ? `Loaded database from ${arg}.` : "Opened temporary database.")
                return;
            case "engine":
                this.engine = Engine.create(arg === "geometric" ? EngineType.GEOMETRIC : EngineType.ALGEBRAIC);
                return;
            case "help":
            case "info":
            case "?":
                console.info(this.unindent`
                    This is sigma-db ${version}. Supported commands are:
                    
                    run|exec|eval: "<path/to/script>" ans: "<answer_relation>" overlay: "true"|"false"
                    use|database:  "<path/to/database>"
                    engine:        "geometric"|"algebraic"
                    help|info|?
                    exit|quit`);
                return;
            case "exit":
            case "quit":
                console.log("Bye");
                this.repl.close();
                process.exit(0);
        }
        console.error(`Unknown command "${cmd}"`);
    }

    private logResult(result: Result): void {
        switch (result.type) {
            case ResultType.RELATION:
                const { name, size } = result.relation;
                if (!!name) {
                    console.log(`${name} (${size} tuples):`);
                }
                console.table([...result.relation.tuples()]);
                break;
            case ResultType.SUCCESS:
                if (result.success === true) {
                    console.log("Done.");
                } else {
                    console.error(result.message);
                }
                break;
        }
    }
}
