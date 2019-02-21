﻿import { Database, Query } from '../lib';
import { createInterface } from 'readline';

if (process.argv.length < 3) {
    console.warn("Working in a temporary database. Any data generated during this session will be lost upon closing the client.");
    console.warn("Run the client with 'npm run -- </path/to/database>' to make changes persistent.")
}

const db = Database.open({ path: process.argv[2] });
const repl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
});

repl.prompt();
repl.on('line', input => {
    try {
        const result = Query.parse(input).execute(db);
        if (!!result) {
            if (!!result.name) {
                console.log(`${result.name} (${result.size} tuples):`);
            }
            console.table([...result.tuples()]);
        } else {
            console.log("Done");
        }
    } catch (e) {
        console.log(e.message);
    }
    repl.prompt();
});
repl.on('close', () => db.close());
