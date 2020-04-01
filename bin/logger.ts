import { EOL } from "os";
import { Transform, TransformCallback } from "stream";
import { Result, ResultType } from "../lib";

export interface LoggerOpts {
    rowLimit: number;
    isActive: boolean;
}

export abstract class Logger extends Transform {
    private static defaultOpts: LoggerOpts = {
        rowLimit: 10,
        isActive: true,
    };

    public static create(opts: Partial<LoggerOpts> = Logger.defaultOpts): Logger {
        const { rowLimit, isActive } = { ...Logger.defaultOpts, ...opts };
        if (isActive) {
            return new ActiveLogger(rowLimit);
        } else {
            return new SilentLogger();
        }
    }

    public constructor() {
        super({
            readableObjectMode: false,
            writableObjectMode: true,
        });
    }

    public abstract _transform(result: Result, _encoding: string, done: (error?: Error | null, data?: any) => void): void;
}

class ActiveLogger extends Logger {
    public constructor(private rowLimit: number) {
        super();
        this.push(`> `);
    }

    private limit(data: IterableIterator<object>, limit?: number): object[] {
        if (typeof limit === "number") {
            const result = new Array<object>(limit);
            let i = 0;
            let el = data.next();
            while (i < limit && !el.done) {
                result[i++] = el.value;
                el = data.next();
            }
            return result.slice(0, i);
        } else {
            return [...data];
        }
    }

    private log(text: string): void {
        this.push(`${text}${EOL}`);
    }

    private success(text: string): void {
        this.push(`\x1b[32m${text}\x1b[0m${EOL}`);
    }

    private error(text: string): void {
        this.push(`\x1b[31m${text}\x1b[0m${EOL}`);
    }

    private info(text: string): void {
        this.push(`\x1b[36m${text}\x1b[0m${EOL}`);
    }

    private table(data: object[]): void {
        console.table(data);
    }

    public _transform(result: Result, _encoding: string, done: TransformCallback): void {
        switch (result.type) {
            case ResultType.RELATION:
                const { name, size } = result.relation;
                const tuples = this.limit(result.relation.tuples(), this.rowLimit);
                const sizename = size > 0 ? size > 1 ? `${size} tuples` : "1 tuple" : "empty";
                this.info(`${name || "<Anonymous>"} (${sizename})${size > 0 ? ":" : ""}`);
                this.table(tuples);
                if (this.rowLimit < size) {
                    this.log(`(${size - this.rowLimit} entries omitted)`);
                }
                break;
            case ResultType.SUCCESS:
                this.success(`Done.`);
                break;
            case ResultType.ERROR:
                this.error(result.message);
                break;
        }
        done(null, `> `);
    }
}

class SilentLogger extends Logger {
    public constructor() {
        super();
    }

    public _transform(_result: Result, _encoding: string, done: (error?: Error | null, data?: any) => void): void {
        done();
    }
}
