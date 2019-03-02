#!/usr/bin/env node

import * as express from 'express';
import * as readline from 'readline';
import * as yargs from 'yargs';
import { Database, Query } from '../lib';

abstract class Client {
    constructor(protected db: Database) {
        if (!db.isLogged) {
            console.warn("Working in a temporary database. Any data generated during this session will be lost upon closing the client.");
            console.warn("Run the client with 'sigmaDB </path/to/database>' to make changes persistent.");
        }
    }

    public abstract start(): void;
}

class Server extends Client {
    private app: express.Application;

    constructor(db: Database, private port: number) {
        super(db);
        this.app = express();
        this.app.get('/query/:query', (req, res) => {
            const result = this.onQuery(req.params.query);
            res.write(JSON.stringify(result));
            res.end();
        });
    }

    public start(): void {
        this.app.listen(this.port, () => console.log(`Listening on port ${this.port}.`));
    }

    private onQuery(query: string): object {
        let result = {};

        try {
            const qresult = Query.parse(query).execute(this.db);
            if (!!qresult) {
                result = {
                    success: true,
                    name: qresult.name,
                    size: qresult.size,
                    tuples: [...qresult.tuples()]
                }
            } else {
                result = { success: true }
            }
        } catch (e) {
            result = { success: false, error: e.message };
        }

        return result;
    }
}

class CLI extends Client {
    private readonly repl: readline.Interface;

    constructor(db: Database) {
        super(db);
        this.repl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> '
        });
        this.repl.on('line', input => this.onLine(input));
        this.repl.on('close', () => this.onClose());
    }

    public start(): void {
        this.repl.prompt();
    }

    private onClose(): void {
        this.db.close()
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

yargs
    .command(
        'serve',
        'expose the database instance via http',
        yargs => yargs.positional('port', { alias: 'p', default: 4711, type: 'number' }),
        argv => {
            const { path, port } = { path: argv._[1], port: argv.port };
            const db = Database.open({ path: path });
            const client = new Server(db, port);
            client.start();
        })
    .command(
        'cli',
        'connect to the database instance via CLI',
        yargs => yargs.positional('engine', { alias: 'e', default: 'geometric', type: 'string' }),
        argv => {
            const { path } = { path: argv._[1] };
            const db = Database.open({ path: path });
            const client = new CLI(db);
            client.start();
        })
    .demandCommand(1, 1, 'You need to specify how to connect to the database')
    .help()
    .argv;
