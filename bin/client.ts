#!/usr/bin/env node
import * as express from "express";
import * as readline from "readline";
import * as yargs from "yargs";
import { Database, Query } from "../lib";

abstract class Client {
    constructor(protected db: Database) {
        if (!db.isLogged) {
            console.warn("Working in a temporary database. Any data generated during this session will be lost upon closing the client.");
            console.warn("Run the client with 'sigma cli </path/to/database>' to make changes persistent.");
        }
    }

    public abstract start(): void;
}

class Server extends Client {
    private app: express.Application;

    constructor(db: Database, private port: number) {
        super(db);
        this.app = express();
        this.app.get("/query/:query", (req, res) => {
            const result = this.onQuery(req.params.query);
            res.json(result);
        });
    }

    public start(): void {
        this.app.listen(this.port, () => console.log(`Listening on port ${this.port}.`));
    }

    private onQuery(query: string): object {
        try {
            const result = Query.parse(query).execute(this.db);
            if (!!result) {
                return {
                    success: true,
                    name: result.name,
                    size: result.size,
                    tuples: [...result.tuples()],
                };
            } else {
                return { success: true };
            }
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class CLI extends Client {
    private readonly repl: readline.Interface;

    constructor(db: Database) {
        super(db);
        this.repl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: "> ",
        });
        this.repl.on("line", input => this.onLine(input));
        this.repl.on("close", () => this.onClose());
    }

    public start(): void {
        this.repl.prompt();
    }

    private onClose(): void {
        this.db.close();
    }

    private onLine(input: string): void {
        try {
            const result = Query.parse(input).execute(this.db);
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

// tslint:disable-next-line: no-unused-expression
yargs
    .scriptName("sigma")
    .command(
        "serve",
        "Makes the database instance accessible via a TCP port",
        yargs => yargs
            .positional("port", { alias: "p", default: 54711, type: "number" })
            .positional("temp", { alias: "t", default: true, type: "boolean" })
            .positional("engine", { alias: "e", default: "geometric", type: "string" }),
        ({ port, temp, _ }) => {
            const db = temp ? Database.temp() : Database.open(_[1]);
            new Server(db, port).start();
        })
    .command(
        "cli",
        "Provides a CLI for instant interaction with the database instance",
        yargs => yargs
            .positional("temp", { alias: "t", default: true, type: "boolean" })
            .positional("engine", { alias: "e", default: "geometric", type: "string" }),
        ({ temp, _ }) => {
            const db = temp ? Database.temp() : Database.open(_[1]);
            new CLI(db).start();
        })
    .demandCommand(1, 1, "Specify how to connect to the database")
    .help()
    .argv;
