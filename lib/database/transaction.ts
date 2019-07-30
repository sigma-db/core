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

    private handlers: { [id: number]: ITransactionHandler };

    private constructor(private fd: number) {
        this.handlers = {};
    }

    public load(): void {
        const buf = readFileSync(this.fd);
        let pos = 0;
        while (pos < buf.length) {
            const id = buf.readUInt8(pos);
            const schema = this.handlers[id].schema;
            const [tx] = schema.decode(buf, pos);
            pos += schema.size(tx);
            this.handlers[id].handler(tx);
        }
    }

    public handle<T>(type: number, schema: ObjectSchema, handler: (tx: T) => void): void {
        this.handlers[type] = { schema, handler };
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
