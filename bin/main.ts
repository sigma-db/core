#!/usr/bin/env node
import { Database, Engine, EngineType, Program, ResultType } from "../lib";
import Options from "./options";
import CLI from "./cli";
import { readFileSync } from "fs";

let { database, engine, script } = Options
    .option("database", v => Database.open(v))
    .option("engine", v => Engine.create(v === "geometric" ? EngineType.GEOMETRIC : EngineType.ALGEBRAIC))
    .option("script", v => Program.parse(readFileSync(v, "utf8")))
    .parse();

CLI.start(
    database || Database.temp(),
    engine || Engine.create(),
    script
);
