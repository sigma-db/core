import Database from '../lib';
import { createInterface } from 'readline';

if (process.argv.length != 3) {
    console.log(`Invalid parameters.\r\nUsage: node ${process.argv[1]} </path/to/database>`);
    process.exit(1);
}

const db = Database.open(process.argv[2]);
const repl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
});

db.query('Q(id=y, name="xyz") <- Emp(id=y, divId=z), Div(id=z, name=12)');

repl.prompt();
repl.on('line', input => {
    try {
        const result = db.query(input);
        console.log(!!result ? result.toString() : "Done");
    } catch (e) {
        console.log(e.message);
    }
    repl.prompt();
});
repl.on('close', () => db.close());
