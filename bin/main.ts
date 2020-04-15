#!/usr/bin/env node
import { createServer, createConnection, Socket } from "net";
import { pipeline } from "stream";
import * as yargs from "yargs";
import { Engine, Instance, Parser } from "../lib";

const { path } = yargs
    .option("path", { alias: "p", description: "Load a specific database instance", type: "string" })
    .scriptName("sigma")
    .help()
    .argv;

const database = Instance.create({ path });
const parser = Parser.create({ schema: database.schema });
const engine = Engine.create({ instance: database });

createServer().listen("\\\\?\\pipe\\sigmaDB").on("connection", () => console.log("listening"));
const input = new Socket({ readable: true, writable: true })
    .connect("\\\\?\\pipe\\sigmaDB", () => console.log("connecting"))
    .on("connect", () => {
        console.log("connected");
        input.write("Hi");
        input.end();
    })
    .on("data", data => console.log(data.toString()));

pipeline(
    input,
    parser,
    engine,
    process.stdout,
    err => err && console.error(err.message),
);

//     private limit(data: IterableIterator < object >, limit ?: number): object[] {
//     if (typeof limit === "number") {
//         const result = new Array<object>(limit);
//         let i = 0;
//         let el = data.next();
//         while (i < limit && !el.done) {
//             result[i++] = el.value;
//             el = data.next();
//         }
//         return result.slice(0, i);
//     } else {
//         return [...data];
//     }
// }

//     public _transform(result: Result, _encoding: string, done: TransformCallback): void {
//     const { name, size } = result.relation;
//     const tuples = this.limit(result.relation.tuples(), this.rowLimit);
//     const sizename = size > 0 ? size > 1 ? `${size} tuples` : "1 tuple" : "empty";
//     this.info(`${name || "<Anonymous>"} (${sizename})${size > 0 ? ":" : ""}`);
//     this.table(tuples);
//     if(this.rowLimit < size) {
//     this.log(`(${size - this.rowLimit} entries omitted)`);
// }
//     }