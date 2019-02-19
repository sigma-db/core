import { Database, Query } from '../lib';
import { createInterface } from 'readline';

if (process.argv.length < 3) {
    console.warn(`Working in a temporary database. Any data during this session will be lost when closing the connection.\r\nTo persist data, run: npm run -- </path/to/database>`);
}

const db = Database.open({ path: process.argv[2] });
const repl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
});

repl.prompt();
repl.on('line', input => {
    console.time("Query Evaluation");
    try {
        const query = Query.parse(input);
        const result = query.execute(db);
        if (!!result) {
            if (!!result.name) {
                console.log(`${result.name}:`);
            }
            console.table([...result.tuples()])
        } else {
            console.log("Done");
        }
    } catch (e) {
        console.log(e);
    }
    console.timeEnd("Query Evaluation");
    repl.prompt();
});
repl.on('close', db.close);
