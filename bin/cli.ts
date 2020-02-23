import { createInterface } from "readline";
import { StringDecoder } from "string_decoder";
import { Instance, Engine, EngineType, ResultType, Parser } from "../lib";
import { version } from "../package.json";

export default class CLI {
    public static start(database: Instance): void {
        new CLI(database).start();
    }

    private constructor(private database: Instance) { }

    private start(): void {
        console.log(`sigmaDB ${version}`);
        if (!this.database.isLogged) {
            console.warn("Working in a temporary database.");
            console.warn("Any data generated during this session will be lost upon closing the client!\n");
            console.warn("Run the client with 'sigma --database=\"</path/to/database>\"' to make changes persistent.");
        }

        const engine = Engine.create({
            onResult: result => {
                if (result.type === ResultType.RELATION) {
                    const { name, size } = result.relation;
                    if (!!name) {
                        console.log(`${name} (${size} tuples):`);
                    }
                    console.table([...result.relation.tuples()]);
                } else if (result.success === true) {
                    console.log("Done.");
                } else {
                    console.error(result.message);
                }
            },
            type: EngineType.GEOMETRIC
        });

        const parser = Parser.create({
            onStatement: statement => {
                engine.evaluate(statement, this.database);
            }
        });

        if (process.stdin.isTTY) {
            const repl = createInterface(process.stdin, process.stdout);
            repl.on("line", line => {
                try {
                    parser.read(line);
                } catch (e) {
                    console.log(e.message);
                }
                repl.prompt();
            });
            repl.on("close", () => void this.database.close());
            repl.prompt();
        } else {
            const decoder = new StringDecoder("utf8");
            process.stdin.on("data", data => {
                try {
                    parser.read(decoder.write(data));
                } catch (e) {
                    console.log(e.message);
                }
            });
            process.stdin.on("close", () => void this.database.close());
        }
    }
}
