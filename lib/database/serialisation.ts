/**
 * Data types that can be encoded and decoded
 */
type TType = number | bigint | string | boolean | object[] | object;

/**
 * A mapping of an object's property names to their respective data type
 */
interface ISchema { [name: string]: IType<TType>; }

interface IType<T> {
    /**
     * Encodes a given value into a buffer at the given position
     * @param val The value to encode
     * @param buf The buffer to write to
     * @param pos The position within the buffer to start writing to
     */
    encode(val: T, buf: Buffer, pos: number): void;

    /**
     * Decodes a value from a buffer, starting at the given psoition
     * @param buf The buffer to read from
     * @param pos The position to start reading from
     */
    decode(buf: Buffer, pos: number): T;

    /**
     * Gets a given value's size in bytes
     * @param val The value to get the size from
     */
    size(val: T): number;
}

class IntType implements IType<number> {
    constructor(private width: 1 | 2 | 4) { }

    public encode(val: number, buf: Buffer, pos: number): void {
        switch (this.width) {
            case 1: buf.writeInt8(val, pos);
                return;
            case 2: buf.writeInt16LE(val, pos);
                return;
            case 4: buf.writeInt32LE(val, pos);
                return;
        }
    }

    public decode(buf: Buffer, pos: number): number {
        switch (this.width) {
            case 1: return buf.readInt8(pos);
            case 2: return buf.readInt16LE(pos);
            case 4: return buf.readInt32LE(pos);
        }
    }

    public size(_val: number): number {
        return this.width;
    }
}

class BigIntType implements IType<bigint> {
    public encode(val: bigint, buf: Buffer, pos: number): void {
        let offset: number;
        for (offset = 4; val > 0n; offset++) {
            // tslint:disable-next-line: no-bitwise
            buf.writeUInt8(Number(val & 0xFFn), pos + offset);
            val >>= 8n;
        }
        buf.writeUInt32LE(offset - 4, pos);
    }

    public decode(buf: Buffer, pos: number): bigint {
        const len = buf.readUInt32LE(pos);
        let result = 0n;
        pos += 4;
        for (let i = 0; i < len; i++) {
            result += BigInt(buf.readUInt8(pos)) << BigInt(i * 8);
            pos++;
        }
        return result;
    }

    public size(val: bigint): number {
        let len = 0;
        while (val > 0) {
            val >>= 8n;
            len++;
        }
        return len + 4;
    }
}

class StringType implements IType<string> {
    public encode(val: string, buf: Buffer, pos: number): void {
        buf.writeInt32LE(val.length, pos);
        buf.write(val, pos + 4, val.length, "ascii");
    }

    public decode(buf: Buffer, pos: number): string {
        const len = buf.readInt32LE(pos);
        return buf.toString("ascii", pos + 4, pos + len + 4);
    }

    public size(val: string): number {
        return val.length + 4;
    }
}

class BoolType implements IType<boolean> {
    public encode(val: boolean, buf: Buffer, pos: number): void {
        buf.writeInt8(val ? 1 : 0, pos);
    }

    public decode(buf: Buffer, pos: number): boolean {
        return buf.readInt8(pos) === 1;
    }

    public size(_val: boolean): number {
        return 1;
    }
}

class CharType implements IType<string> {
    public encode(val: string, buf: Buffer, pos: number): void {
        buf.writeUInt8(val.charCodeAt(0) & 0xFF, pos);
    }

    public decode(buf: Buffer, pos: number): string {
        return String.fromCharCode(buf.readUInt8(pos));
    }

    public size(_val: string): number {
        return 1;
    }
}

class ArrayType implements IType<object[]> {
    constructor(private type: IType<TType>) { }

    public encode(val: object[], buf: Buffer, pos: number): void {
        buf.writeInt32LE(val.length, pos);
        pos += 4;
        val.forEach(v => {
            this.type.encode(v, buf, pos);
            pos += this.type.size(v);
        });
    }

    public decode(buf: Buffer, pos: number): object[] {
        const len = buf.readInt32LE(pos);
        const result = new Array<object>(len);
        pos += 4;
        for (let i = 0; i < len; i++) {
            result[i] = this.type.decode(buf, pos) as object;
            pos += this.type.size(result[i]);
        }
        return result;
    }

    public size(val: object[]): number {
        return val.reduce((p, c) => p + this.type.size(c), 0) + 4;
    }
}

class TupleType implements IType<object[]> {
    constructor(private type: Array<IType<TType>>) { }

    public encode(val: object[], buf: Buffer, pos: number): void {
        buf.writeInt32LE(val.length, pos);
        pos += 4;
        val.forEach((v, i) => {
            this.type[i].encode(v, buf, pos);
            pos += this.type[i].size(v);
        });
    }

    public decode(buf: Buffer, pos: number): object[] {
        const len = buf.readInt32LE(pos);
        const result = new Array<object>(len);
        pos += 4;
        for (let i = 0; i < len; i++) {
            result[i] = this.type[i].decode(buf, pos) as object;
            pos += this.type[i].size(result[i]);
        }
        return result;
    }

    public size(val: object[]): number {
        return val.reduce((p, c, i) => p + this.type[i].size(c), 0) + 4;
    }
}

class ObjectType implements IType<object> {
    private entries: Array<[string, IType<TType>]>;

    constructor(schema: ISchema) {
        this.entries = Object.entries(schema).sort(([k1, _x], [k2, _y]) => k1.localeCompare(k2));
    }

    public encode(val: object, buf: Buffer, pos: number): void {
        this.entries.forEach(([p, t]) => {
            t.encode((val as any)[p], buf, pos);
            pos += t.size((val as any)[p]);
        });
    }

    public decode(buf: Buffer, pos: number): object {
        const result: any = {};

        this.entries.forEach(([p, t]) => {
            result[p] = t.decode(buf, pos);
            pos += t.size(result[p]);
        });

        return result;
    }

    public size(val: object): number {
        return this.entries.reduce((p, [key, type]) => p + type.size((val as any)[key]), 0);
    }
}

export const Type = Object.freeze({
    INT8: new IntType(1),
    INT16: new IntType(2),
    INT32: new IntType(4),
    INT: new IntType(4),
    CHAR: new CharType(),
    STRING: new StringType(),
    BOOL: new BoolType(),
    BIGINT: new BigIntType(),
    ARRAY: (type: IType<TType>) => new ArrayType(type),
    TUPLE: (types: Array<IType<TType>>) => new TupleType(types),
    OBJECT: (schema: ISchema) => new ObjectType(schema),
});

export class ObjectSchema {
    /**
     * Creates a new schema from a given object specification
     * @param type The type specification of the object to encode
     */
    public static create(type: IType<TType>): ObjectSchema {
        return new ObjectSchema(type);
    }

    private constructor(private root: IType<TType>) { }

    /**
     * Writes an object to a buffer
     * @param obj The object to encode
     */
    public encode(obj: any, id: number): Buffer {
        const sz = this.size(obj);
        const buf = Buffer.allocUnsafe(sz);
        buf.writeUInt8(id, 0);
        this.root.encode(obj, buf, 1);
        return buf;
    }

    /**
     * Reads an object from a buffer
     * @param buf The buffer to read the object from
     * @param offset The offset to start reading from
     */
    public decode(buf: Buffer, offset = 0): [TType, number] {
        const id = buf.readUInt8(offset);
        const obj = this.root.decode(buf, offset + 1);
        return [obj, id];
    }

    /**
     * Gets an object's size with respect to this schema
     * @param obj The object to get the size of
     */
    public size(obj: any): number {
        return this.root.size(obj) + 1;
    }
}
