import { EOL } from "os";
import { Transform } from "stream";
import { Result, ResultType } from "../lib";

export interface LoggerOpts {
    rowLimit: number;
    logRelation: boolean;
    logSuccess: boolean;
    logError: boolean;
}

export class Logger extends Transform {
    private static defaultOpts: LoggerOpts = {
        rowLimit: 10,
        logRelation: true,
        logSuccess: true,
        logError: true
    };

    public static create(opts: Partial<LoggerOpts> = Logger.defaultOpts) {
        return new Logger({ ...Logger.defaultOpts, ...opts });
    }

    private rowLimit: number;
    private logRelation: boolean;
    private logSuccess: boolean;
    private logError: boolean;

    private constructor({ rowLimit, logRelation, logSuccess, logError }: LoggerOpts) {
        super({
            readableObjectMode: false,
            writableObjectMode: true,
        });
        this.rowLimit = rowLimit;
        this.logRelation = logRelation;
        this.logSuccess = logSuccess;
        this.logError = logError;
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
        this.push(text);
        this.push(EOL);
    }

    public _transform(result: Result, _encoding: string, done: (error?: Error | null, data?: any) => void): void {
        switch (result.type) {
            case ResultType.RELATION:
                if (this.logRelation) {
                    const { name, size } = result.relation;
                    const tuples = this.limit(result.relation.tuples(), this.rowLimit);
                    this.log(`${name || "<Anonymous>"} (${size} tuple${size != 1 && "s"}):`);
                    this.log(JSON.stringify(tuples));
                    if (this.rowLimit < size) {
                        this.log(`(${size - this.rowLimit} entries omitted)`);
                    }
                }
                break;
            case ResultType.SUCCESS:
                this.logSuccess && this.log(`Done.`);
                break;
            case ResultType.ERROR:
                this.logError && this.log(`An error occurred: ${result.message}`);
                break;
        }
        done();
    }
}
