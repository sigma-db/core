#!/usr/bin/env node
import { Instance } from "../lib";
import Options from "./options";
import CLI from "./cli";

const { database } = Options
    .option("database", v => Instance.open(v))
    .parse();

CLI.start(database || Instance.temp(),);
