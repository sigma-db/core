#!/usr/bin/env node
import * as readline from "readline";
import * as yargs from "yargs";
import { Database, Engine, EngineType, Query } from "../lib";

class CLI {
    public static start(database: Database, engine: Engine): void {
        if (!database.isLogged) {
            console.warn(`
                Working in a temporary database.
                Any data generated during this session will be lost upon closing the client!\n
                Run the client with 'sigma --database=</path/to/database>' to make changes persistent.`,
            );
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

const { database: db, engine: ng } = yargs
    .scriptName("sigma")
    .option("database", {
        alias: "d",
        type: "string",
    })
    .option("engine", {
        alias: "e",
        default: "geometric",
        choices: ["algebraic", "geometric"],
        type: "string",
    })
    .help()
    .argv;

CLI.start(
    !!db ? Database.open(db) : Database.temp(),
    Engine.create(ng === "algebraic" ? EngineType.ALGEBRAIC : EngineType.GEOMETRIC),
);
