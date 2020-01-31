import { createInterface } from "readline";
import { Instance, Engine, Parser, ResultType, EngineType, Result } from "../lib";
import { version } from "../package.json";
import { Command } from "./command";

export default class CLI {
    public static start(database: Instance, engine: Engine): void {
        new CLI(database, engine).start();
    }

    private constructor(private database: Instance, private engine: Engine) { }

    private start(): void {
        console.log(`sigmaDB ${version}`);
        if (!this.database.isLogged) {
            console.warn("Working in a temporary database.");
            console.warn("Any data generated during this session will be lost upon closing the client!\n");
            console.warn("Run the client with 'sigma --database=\"</path/to/database>\"' to make changes persistent.");
        }

        const parser = Parser.create(stmt => {
            const result = this.engine.evaluate(stmt, this.database);
            this.handleResult(result);
        });

        if (process.stdin.isTTY) {
            let commandMode = false;
            process.stdin.setRawMode(true);
            process.stdin.on("keypress", (_str, key) => {
                if (key && key.name === "escape") { // the escape-key is used to toggle between query mode and command mode
                    commandMode = !commandMode;
                    repl.setPrompt(commandMode ? "! " : "> ");
                    repl.prompt(true);
                }
            });

            const repl = createInterface(process.stdin, process.stdout);
            repl.on("line", line => {
                try {
                    if (commandMode) {
                        this.handleCommand(Command.parse(line));
                    } else {
                        parser.read(line);
                    }
                } catch (e) {
                    console.log(e.message);
                }
                repl.prompt();
            });
            repl.on("close", () => this.database.close())
            repl.prompt();
        } else {
            process.stdin.on("data", data => {
                try {
                    parser.read(data);
                } catch (e) {
                    console.log(e.message);
                }
            });
        }
    }

    private handleCommand({ cmd, arg }: Command): void {
        switch ((cmd || "").toLowerCase()) {
            case "database":
                this.database.close();
                this.database = !!arg ? Instance.open(arg) : Instance.temp();
                console.log(!!arg ? `Loaded database from ${arg}.` : "Opened temporary database.")
                return;
            case "engine":
                this.engine = Engine.create(arg === "geometric" ? EngineType.GEOMETRIC : EngineType.ALGEBRAIC);
                return;
            case "help":
                console.info(`Supported commands:`);
                console.info();
                console.info(`database: "<path/to/database>"`);
                console.info(`engine: "geometric"|"algebraic"`);
                console.info(`help`);
                console.info(`exit`);
                return;
            case "exit":
                console.log("Bye");
                process.exit(0);
            default:
                console.error(`Unknown command "${cmd}"`);
                return;
        }
    }

    private handleResult(result: Result): void {
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
