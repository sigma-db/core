#!/usr/bin/env node
import { createServer } from "net";
import { pipeline } from "stream";
import * as yargs from "yargs";
import { Engine, Instance, Parser } from "../lib";

const { path } = yargs
    .option("path", { alias: "p", description: "Load a specific database instance", type: "string" })
    .scriptName("sigma")
    .help()
    .argv;

const database = Instance.create({ path });

createServer().listen("/var/run/sigmaDB").on("connection", socket => {
    const parser = Parser.create({ schema: database.schema });
    const engine = Engine.create({ instance: database });

    pipeline(
        socket,
        parser,
        engine,
        socket,
        err => err && socket.write(err.message),
    );
});
