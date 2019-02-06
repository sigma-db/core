import { Database, Query } from '../lib';
import { createInterface } from 'readline';

if (process.argv.length < 3) {
    console.log(`Working in temporary database. Any data during this session will be lost on closing the client.\r\nTo persist data, run: node ${process.argv[1]} </path/to/database>`);
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
        const query = Query.parse(input);
        const result = query.execute(db);
        if (!!result) {
            console.table([...result.tuples()])
        } else {
            console.log("Done");
        }
    } catch (e) {
        console.log(e.message);
    }
    repl.prompt();
});
repl.on('close', db.close);
