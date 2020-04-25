import { appendFile, closeSync, existsSync, openSync, PathLike, readFileSync } from "fs";
import { ObjectSchema } from "./serialisation";

interface ITransactionHandler {
    schema: ObjectSchema;
    handler: (tx: any) => void;
}

export class TransactionLog {
    public static open(path: PathLike): TransactionLog {
        const flag = existsSync(path) ? "r+" : "w+";
        const fd = openSync(path, flag);
        return new TransactionLog(fd);
    }

    private readonly handlers: { [id: number]: ITransactionHandler };

    private constructor(private readonly fd: number) {
        this.handlers = {};
    }

    public load(): void {
        const buf = readFileSync(this.fd);
        let pos = 0;
        while (pos < buf.length) {
            const id = buf.readUInt32LE(pos);
            const schema = this.handlers[id].schema;
            const [tx] = schema.decode(buf, pos);
            pos += schema.size(tx);
            this.handlers[id].handler(tx);
        }
    }

    public handle<T>(id: number, schema: ObjectSchema, handler: (tx: T) => void): number {
        while (id in this.handlers) id++;       // if the specified id is already taken, increment until an empty slot is found
        this.handlers[id] = { schema, handler };
        return id;
    }

    public write<T>(id: number, tx: T): void {
        const buf = this.handlers[id].schema.encode(tx, id);
        appendFile(this.fd, buf, err => {
            if (!!err) {
                throw err;
            }
        });
    }

    public close(): void {
        closeSync(this.fd);
    }
}
