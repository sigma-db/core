#!/usr/bin/env node
import { Instance, Engine, EngineType } from "../lib";
import Options from "./options";
import CLI from "./cli";

const { database, engine } = Options
    .option("database", v => Instance.open(v))
    .option("engine", v => Engine.create(v === "geometric" ? EngineType.GEOMETRIC : EngineType.ALGEBRAIC))
    .parse();

CLI.start(
    database || Instance.temp(),
    engine || Engine.create(),
);
