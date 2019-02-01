import { appendFile, closeSync, existsSync, openSync, readFileSync, PathLike } from 'fs';
import { ObjectSchema, Type } from './serialisation';
import { AttributeSpecification } from './relation';

export enum TransactionType { CREATE, INSERT };

export abstract class Transaction {
    public static isCreate(tx: Transaction): tx is CreateTransaction {
        return tx.type == TransactionType.CREATE;
    }

    public static isInsert(tx: Transaction): tx is InsertTransaction {
        return tx.type == TransactionType.INSERT;
    }

    abstract get type(): TransactionType;
}

export interface CreateTransaction extends Transaction {
    name: string;
    attrs: AttributeSpecification[];
}

export interface InsertTransaction extends Transaction {
    rel: string;
    tuple: number[];
}

export class TransactionLog implements Iterable<Transaction> {
    private createSchema: ObjectSchema;
    private insertSchema: ObjectSchema;

    private constructor(private fd: number) {
        this.createSchema = ObjectSchema.create(Type.OBJECT({
            name: Type.STRING,
            attrs: Type.ARRAY(Type.OBJECT({
                name: Type.STRING,
                type: Type.STRING,
                width: Type.INT16
            }))
        }), TransactionType.CREATE);

        this.insertSchema = ObjectSchema.create(Type.OBJECT({
            rel: Type.STRING,
            tuple: Type.ARRAY(Type.INT32)
        }), TransactionType.INSERT);
    }

    public static open(path: PathLike): TransactionLog {
        const flag = existsSync(path) ? "r+" : "w+";
        const fd = openSync(path, flag);
        return new TransactionLog(fd);
    }

    *[Symbol.iterator](): IterableIterator<Transaction> {
        const buf = readFileSync(this.fd);
        let pos = 0;
        while (pos < buf.length) {
            const type = buf.readUInt8(pos);
            const schema = type == TransactionType.CREATE ? this.createSchema : this.insertSchema;
            const [id, tx] = schema.decode(buf, pos);
            pos += schema.size(tx);
            yield Object.assign(tx, { type: id });
        }
    }

    public write(tx: Transaction): void {
        const schema = tx.type == TransactionType.CREATE ? this.createSchema : this.insertSchema;
        const buf = schema.encode(tx);
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
