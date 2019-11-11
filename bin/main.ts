#!/usr/bin/env node
import { Database, Engine, EngineType } from "../lib";
import Options from "./options";
import CLI from "./cli";

let { database, engine } = Options
    .option("database", v => Database.open(v))
    .option("engine", v => Engine.create(v === "geometric" ? EngineType.GEOMETRIC : EngineType.ALGEBRAIC))
    .parse();

CLI.start(
    database || Database.temp(),
    engine || Engine.create(),
);
