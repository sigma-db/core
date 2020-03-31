import { pipeline } from "stream";
import { Engine, Instance, Parser } from "../lib";
import { version } from "../package.json";
import { Logger } from "./logger";

const database = Instance.create({ path: process.argv[2] });
const parser = Parser.create({ schema: database.schema });
const engine = Engine.create({ instance: database });
const logger = Logger.create({ rowLimit: 10, isActive: process.stdin.isTTY });

console.log(`sigmaDB ${version}`);
if (!database.isLogged) {
    console.warn("Working in a temporary database.");
    console.warn("Any data generated during this session will be lost upon closing the client!\n");
    console.warn("Run the client with 'sigma --database=\"</path/to/database>\"' to make changes persistent.");
}

pipeline(
    process.stdin,
    parser,
    engine,
    logger,
    process.stdout,
    error => !!error && console.error(error.message),
);
