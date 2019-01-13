import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

type Schema = { [name: string]: string[] };

interface IOptions {
    name: string;
    schema: Schema;
}

export default class Database {
    private static readonly CONFIG_NAME: string = 'db.json';

    private constructor(private _name: string, private _schema: Schema) {
    }

    public static open(path: string, options?: IOptions): Database {
        const configFile = join(path, this.CONFIG_NAME);

        if (!!options) {    // new database
            mkdirSync(path);
            writeFileSync(configFile, JSON.stringify(options), 'utf8');
        }
        else {  // existing database
            const configRaw = readFileSync(configFile, 'utf8');
            options = <IOptions>JSON.parse(configRaw); 
        }

        const { name, schema } = options;
        return new Database(name, schema);
    }

    public sync(): void {
    }

    public get name(): string {
        return this._name;
    }

    public get schema(): Schema {
        return this._schema;
    }
}
