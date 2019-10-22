import * as readline from "readline";
import { Database, Engine, Query, ResultType, Program } from "../lib";

export default class CLI {
    public static start(database: Database, engine: Engine, script?: Program): void {
        if (!database.isLogged) {
            console.warn("Working in a temporary database.");
            console.warn("Any data generated during this session will be lost upon closing the client!\n");
            console.warn("Run the client with 'sigma --database=\"</path/to/database>\"' to make changes persistent.");
        }

        const cli = new CLI(database, engine);

        if (!!script) {
            cli.onQuery(script)
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
            this.onQuery(Query.parse(input));
            this.repl.prompt();
        });
    }

    private onQuery(input: Query | Program) {
        const result = this.engine.evaluate(input, this.database);
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
