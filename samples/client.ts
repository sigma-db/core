import Database from '../src';
import { createInterface } from 'readline';

if (process.argv.length != 3) {
    console.log(`Invalid parameters.\r\nUsage: node ${process.argv[1]} <database>`);
    process.exit(1);
}

const db = Database.open(process.argv[2]);
const repl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
});

repl.prompt();
repl.on('line', input => {
    try {
        const Ans = db.query(input);
        console.log(!!Ans ? Ans.toString() : "Done");
    } catch (e) {
        console.log(e.message);
    }
    repl.prompt();
});
repl.on('close', () => db.close());
