import { appendFile, closeSync, existsSync, openSync, readFileSync, PathLike } from 'fs';

export enum TransactionType { CREATE, INSERT };

interface ITransaction {
    type: TransactionType;
}

export interface ICreateTransaction extends ITransaction {
    name: string;
    attrs: string[];
}

export interface IInsertTransaction extends ITransaction {
    rel: string;
    tuple: number[];
}

export abstract class Transaction implements ITransaction {
    protected constructor(private _type: TransactionType) { }

    public static newCreate(name: string, attrs: string[]): Transaction {
        return CreateTransaction.create(name, attrs);
    }

    public static newInsert(rel: string, tuple: number[]): Transaction {
        return InsertTransaction.create(rel, tuple);
    }

    public static isCreate(tx: ITransaction): tx is ICreateTransaction {
        return tx.type === TransactionType.CREATE;
    }

    public static isInsert(tx: ITransaction): tx is IInsertTransaction {
        return tx.type === TransactionType.INSERT;
    }

    public abstract to(buf: Buffer, pos: number): void;

    public abstract get size(): number;

    public get type(): TransactionType {
        return this._type;
    }
}

class CreateTransaction extends Transaction implements ICreateTransaction {
    private constructor(private _name: string, private _attrs: string[]) {
        super(TransactionType.CREATE);
    }

    public static create(name: string, attrs: string[]): CreateTransaction {
        return new CreateTransaction(name, attrs);
    }

    public static from(buf: Buffer, offset: number) {
        const relNameLen = buf.readUInt8(offset++);
        const relName = buf.toString('utf8', offset, offset + relNameLen);
        offset += relNameLen;
        const arity = buf.readUInt8(offset++);
        const attrs = new Array<string>(arity);

        for (var i = 0; i < arity; i++) {
            const attrNameLen = buf.readUInt8(offset++);
            attrs[i] = buf.toString('utf8', offset, offset + attrNameLen);
            offset += attrNameLen;
        }

        return new CreateTransaction(relName, attrs);
    }

    public to(buf: Buffer, offset: number): void {
        buf.writeUInt8(this._name.length, offset++);
        buf.write(this._name, offset, this._name.length);
        offset += this._name.length;
        buf.writeUInt8(this._attrs.length, offset++);
        this._attrs.forEach(attr => {
            buf.writeUInt8(attr.length, offset++);
            buf.write(attr, offset, attr.length);
            offset += attr.length;
        });
    }

    public get size(): number {
        return this._name.length + this._attrs.reduce((p, attr) => p + attr.length + 1, 0) + 2;
    }

    public get name(): string {
        return this._name;
    }

    public get attrs(): string[] {
        return this._attrs;
    }
}

class InsertTransaction extends Transaction implements IInsertTransaction {
    private constructor(private _rel: string, private _tuple: number[]) {
        super(TransactionType.INSERT);
    }

    public static create(rel: string, tuple: number[]): InsertTransaction {
        return new InsertTransaction(rel, tuple);
    }

    public static from(buf: Buffer, offset: number) {
        const relNameLen = buf.readUInt8(offset++);
        const relName = buf.toString('utf8', offset, offset + relNameLen);
        offset += relNameLen;
        const arity = buf.readUInt8(offset++);
        const tuple = new Array<number>(arity);

        for (var i = 0; i < arity; i++) {
            tuple[i] = buf.readUInt32LE(offset);
            offset += 4;
        }

        return new InsertTransaction(relName, tuple);
    }

    public to(buf: Buffer, offset: number): void {
        buf.writeUInt8(this._rel.length, offset++);
        buf.write(this._rel, offset, this._rel.length);
        offset += this._rel.length;
        buf.writeUInt8(this._tuple.length, offset++);
        this._tuple.forEach(comp => {
            buf.writeUInt32LE(comp, offset);
            offset += 4;
        });
    }

    public get size(): number {
        return this._rel.length + this._tuple.length * 4 + 2;
    }

    public get rel(): string {
        return this._rel;
    }

    public get tuple(): number[] {
        return this._tuple;
    }
}

export class TransactionLog implements Iterable<ITransaction> {
    private constructor(private fd: number) { }

    public static open(path: PathLike): TransactionLog {
        const flag = existsSync(path) ? "r+" : "w+";
        const fd = openSync(path, flag);
        return new TransactionLog(fd);
    }

    *[Symbol.iterator](): IterableIterator<ITransaction> {
        const buf = readFileSync(this.fd);
        let pos = 0;
        while (pos < buf.length) {
            const sz = buf.readUInt8(pos++);
            const type = buf.readUInt8(pos++);
            if (type == TransactionType.CREATE) {
                yield CreateTransaction.from(buf, pos);
            } else if (type == TransactionType.INSERT) {
                yield InsertTransaction.from(buf, pos);
            }
            pos += sz;
        }
    }

    public write(tx: Transaction): void {
        let buf = Buffer.allocUnsafe(tx.size + 2);
        buf.writeUInt8(tx.size, 0);
        buf.writeUInt8(tx.type, 1);
        tx.to(buf, 2);

        appendFile(this.fd, buf, err => {
            if (!!err) {
                throw new Error(err.message);
            }
        });
    }

    public close(): void {
        closeSync(this.fd);
    }
}
