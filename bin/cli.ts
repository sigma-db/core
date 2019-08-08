#!/usr/bin/env node
import * as readline from "readline";
import * as yargs from "yargs";
import { Database, Engine, EngineType, Query } from "../lib";

class CLI {
    private readonly repl: readline.Interface;

    constructor(private readonly db: Database, private readonly ng: Engine) {
        this.repl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: "> ",
        });
        this.repl.on("line", input => this.onLine(input));
        this.repl.on("close", () => this.onClose());
    }

    public start(): void {
        if (!this.db.isLogged) {
            console.warn("Working in a temporary database. Any data generated during this session will be lost upon closing the client.");
            console.warn("Run the client with 'sigma --database=</path/to/database>' to make changes persistent.");
        }
        this.repl.prompt();
    }

    private onClose(): void {
        this.db.close();
    }

    private onLine(input: string): void {
        try {
            const query = Query.parse(input);
            const result = this.ng.evaluate(query, this.db);
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

const { database, engine, _ } = yargs
    .scriptName("sigma")
    .option("database", { alias: "d", default: "", type: "string" })
    .option("engine", { alias: "e", default: "geometric", type: "string" })
    .help()
    .parse();

const ng = Engine.create(engine === "algebraic" ? EngineType.ALGEBRAIC : EngineType.GEOMETRIC);
const db = !!database ? Database.open(database) : Database.temp();

new CLI(db, ng).start();
