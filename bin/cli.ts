#!/usr/bin/env node
import * as readline from "readline";
import { Database, Engine, EngineType, Query } from "../lib";

class CLI {
    public static start(database: Database, engine: Engine): void {
        if (!database.isLogged) {
            console.warn("Working in a temporary database.");
            console.warn("Any data generated during this session will be lost upon closing the client!\n");
            console.warn("Run the client with 'sigma --database=</path/to/database>' to make changes persistent.");
        }
        const cli = new CLI(database, engine);
        cli.repl.prompt();
    }

    private readonly repl: readline.Interface;

    private constructor(private readonly database: Database, private readonly engine: Engine) {
        this.repl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: "> ",
        });
        this.repl.on("line", input => this.onLine(input));
        this.repl.on("close", () => this.onClose());
    }

    private onClose(): void {
        this.database.close();
    }

    private onLine(input: string): void {
        try {
            const query = Query.parse(input);
            const result = this.engine.evaluate(query, this.database);
            if (!!result) {
                if (!!result.name) {
                    console.log(`${result.name} (${result.size} tuples):`);
                }
                console.table([...result.tuples()]);
            } else {
                console.log("Done");
            }
        } catch (e) {
            console.log(e.message);
        }
        this.repl.prompt();
    }
}

class Options<T> {
    private constructor(private opts: T, private args: { [key: string]: string } = {}) { }

    public static parse(): Options<{}> {
        return new Options({}, process.argv.slice(2).reduce((result, arg) => {
            const [, key, value] = arg.match(/--(\w+)=\'([^\']+)\'/);
            result[key] = value;
            return result;
        }, {}));
    }

    public option<K extends string, S>(key: K, evalfn: ((value: string) => S)): Options<T & { [key in K]: S }> {
        const opt = { [key]: evalfn(this.args[key]) } as { [key in K]: S };
        return new Options({ ...this.opts, ...opt }, this.args);
    }

    public get argv(): T {
        return this.opts;
    }
}

const { database, engine } = Options
    .parse()
    .option("database", v => Database.open(v))
    .option("engine", v => Engine.create(v === "geometric" ? EngineType.GEOMETRIC : EngineType.ALGEBRAIC))
    .argv;

CLI.start(
    database || Database.temp(),
    engine || Engine.create(),
);
