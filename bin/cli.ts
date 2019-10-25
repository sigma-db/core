import * as readline from "readline";
import { Database, Engine, Query, ResultType, Program } from "../lib";
import { TResult } from "../lib/engine/engine";

interface CLIOptions {
    script: Program;
    relation: string;
}

export default class CLI {
    public static start(database: Database, engine: Engine, options?: CLIOptions): void {
        if (!database.isLogged) {
            console.warn("Working in a temporary database.");
            console.warn("Any data generated during this session will be lost upon closing the client!\n");
            console.warn("Run the client with 'sigma --database=\"</path/to/database>\"' to make changes persistent.");
        }

        const cli = new CLI(database, engine);

        if (!!options) {
            const { script, relation } = options;
            const result = engine.evaluate(script, database, relation);
            cli.logResult(result);
        }

        cli.repl.prompt();
    }

    private readonly repl: readline.Interface;

    private constructor(private readonly database: Database, private readonly engine: Engine) {
        this.repl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        this.repl.on("close", () => this.database.close());
        this.repl.on("line", input => {
            const result = this.engine.evaluate(Query.parse(input), this.database);
            this.logResult(result);
            this.repl.prompt();
        });
    }

    private logResult(result: TResult) {
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
