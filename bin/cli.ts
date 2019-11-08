import { Database, Engine, Query, ResultType, Program, Result } from "../lib";
import { Command } from "./command";
import { readFileSync } from "fs";
import * as readline from "readline";

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

    private constructor(private readonly database: Database, private readonly engine: Engine) {
        this.repl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        this.commandMode = true;

        this.repl.on("close", () => this.database.close());
        this.repl.on("line", input => {
            if (this.commandMode) {
                this.handleCommand(Command.parse(input));
            } else {
                this.handleQuery(Query.parse(input));
            }
            this.repl.prompt();
        });

        // the escape-key is used to toggle between query mode and command mode
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        process.stdin.on('keypress', (_str, key) => {
            if (key && key.name === "escape") {
                this.commandMode = !this.commandMode;
                this.repl.setPrompt(this.commandMode ? "> " : "? ");
                this.repl.prompt(true);
            }
        });
    }

    private handleCommand({ cmd, arg, opts }: Command): void {
        switch (cmd.toLowerCase()) {
            case "run":
            case "exec":
            case "eval":
                const { ans, overlay } = opts;
                try {
                    const program = Program.parse(readFileSync(arg, "utf8"));
                    const result = this.engine.evaluate(program, this.database, ans, overlay === "true");
                    this.logResult(result);
                } catch (e) {
                    console.error(e.message);
                }
                return;
            case "exit":
            case "quit":
                this.repl.close();
                process.exit(0);
        }
        console.error(`Unknown command "${cmd}"`);
    }

    private handleQuery(query: Query): void {
        try {
            const result = this.engine.evaluate(query, this.database);
            this.logResult(result);
        } catch (e) {
            console.error(e.message);
        }
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
