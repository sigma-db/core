import * as readline from "readline";
import { Database, Engine, Query } from "../lib";
import { ResultType } from "../lib/engine/engine";
import { Relation } from "../lib/database";

export default class CLI {
    public static start(database: Database, engine: Engine): void {
        if (!database.isLogged) {
            console.warn("Working in a temporary database.");
            console.warn("Any data generated during this session will be lost upon closing the client!\n");
            console.warn("Run the client with 'sigma --database=\"</path/to/database>\"' to make changes persistent.");
        }
        const cli = new CLI(database, engine);
        cli.repl.prompt();
    }

    private readonly repl: readline.Interface;

    private constructor(private readonly database: Database, private readonly engine: Engine) {
        this.repl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        this.repl.on("line", input => this.onLine(input));
        this.repl.on("close", () => this.onClose());
    }

    private onClose(): void {
        this.database.close();
    }

    private onLine(input: string): void {
        const query = Query.parse(input);
        const result = this.engine.evaluate(query, this.database);
        switch (result.type) {
            case ResultType.RELATION:
                this.dumpRelation(result.relation);
                break;
            case ResultType.DATABASE:
                const { schema } = result.database;
                for (const relation of Object.values(schema)) {
                    this.dumpRelation(relation);
                }
                break;
            case ResultType.SUCCESS:
                if (result.success === true) {
                    console.log("Done.");
                } else {
                    console.error(result.message);
                }
                break;
        }
        this.repl.prompt();
    }

    private dumpRelation(relation: Relation): void {
        const { name, size } = relation;
        if (!!name) {
            console.log(`${name} (${size} tuples):`);
        }
        console.table([...relation.tuples()]);
    }
}
