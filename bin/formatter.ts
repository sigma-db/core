import { EOL } from "os";
import { Transform } from "stream";
import { Result, ResultType } from "../lib";

export class Formatter extends Transform {
    public static create() {
        return new Formatter();
    }

    private constructor() {
        super({
            readableObjectMode: false,
            writableObjectMode: true,
        });
    }

    private *table(data: IterableIterator<object>): IterableIterator<string> {
        for (const tuple of data) {
            yield Object.entries(tuple).map(([k, v]) => `${k}: ${v}`).join(", ");
        }
    }

    public _transform(result: Result, _encoding: string, done: (error?: Error | null, data?: any) => void): void {
        if (result.type === ResultType.RELATION) {
            const { name, size } = result.relation;
            done(null, `${name || "<Anonymous>"} (${size} tuples):${EOL}${[...this.table(result.relation.tuples())].join(EOL)}${EOL}`);
        } else if (result.success === true) {
            done(null, `Done.${EOL}`);
        } else {
            done(null, `An error occurred: ${result.message}${EOL}`);
        }
    }
}
