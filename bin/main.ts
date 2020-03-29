#!/usr/bin/env node
import { pipeline } from "stream";
import { Engine, Instance, Parser } from "../lib";
import { version } from "../package.json";
import { Formatter } from "./formatter";

const database = Instance.create({ path: process.argv[2] });
const parser = Parser.create();
const engine = Engine.create({ database });
const formatter = Formatter.create();

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
    formatter,
    process.stdout,
    error => {
        if (!!error) {
            console.error(error.message);
        }
    }
);
