#!/usr/bin/env node
import { Database, Engine, EngineType, Program } from "../lib";
import Options from "./options";
import CLI from "./cli";
import { readFileSync } from "fs";

let { database, engine, script, relation } = Options
    .option("database", v => Database.open(v))
    .option("engine", v => Engine.create(v === "geometric" ? EngineType.GEOMETRIC : EngineType.ALGEBRAIC))
    .option("script", v => Program.parse(readFileSync(v, "utf8")))
    .option("relation", v => v)
    .parse();

const opts = !!script && !!relation ? { script, relation } : null;

CLI.start(
    database || Database.temp(),
    engine || Engine.create(),
    opts
);
