/**
 * Data types that can be encoded and decoded
 */
type TType = number | string | boolean | Array<object> | object;

/**
 * A mapping of an object's property names to their respective data type
 */
type TSchema = { [name: string]: IType<TType> }

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

class StringType implements IType<string> {
    public encode(val: string, buf: Buffer, pos: number): void {
        buf.writeInt32LE(val.length, pos);
        buf.write(val, pos + 4, val.length, 'ascii');
    }

    public decode(buf: Buffer, pos: number): string {
        const len = buf.readInt32LE(pos);
        return buf.toString('ascii', pos + 4, pos + len + 4)
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

class ArrayType implements IType<Array<object>> {
    constructor(private type: IType<TType>) { }

    public encode(val: Array<object>, buf: Buffer, pos: number): void {
        buf.writeInt32LE(val.length, pos);
        pos += 4;
        val.forEach(v => {
            this.type.encode(v, buf, pos);
            pos += this.type.size(v);
        });
    }

    public decode(buf: Buffer, pos: number): Array<object> {
        const len = buf.readInt32LE(pos);
        const result = new Array<object>(len);
        pos += 4;
        for (let i = 0; i < len; i++) {
            result[i] = <object>(this.type.decode(buf, pos));
            pos += this.type.size(result[i]);
        }
        return result;
    }

    public size(val: Array<object>): number {
        return val.reduce((p, c) => p + this.type.size(c), 0) + 4;
    }
}

class ObjectType implements IType<object> {
    private entries: Array<[string, IType<TType>]>;

    constructor(schema: TSchema) {
        this.entries = Object.entries(schema).sort(([k1, _x], [k2, _y]) => k1.localeCompare(k2));
    }

    public encode(val: object, buf: Buffer, pos: number): void {
        this.entries.forEach(([p, t]) => {
            t.encode((<any>val)[p], buf, pos);
            pos += t.size((<any>val)[p]);
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
        return this.entries.reduce((p, [key, type]) => p + type.size((<any>val)[key]), 0);
    }
}

export const Type = Object.freeze({
    INT8: new IntType(1),
    INT16: new IntType(2),
    INT32: new IntType(4),
    INT: new IntType(4),
    STRING: new StringType(),
    BOOL: new BoolType(),
    ARRAY: (type: IType<TType>) => new ArrayType(type),
    OBJECT: (schema: TSchema) => new ObjectType(schema)
});

export class ObjectSchema {
    private static ID = 0;

    private constructor(private root: IType<TType>, private id: number) { }

    /**
     * Creates a new schema from a given object specification
     * @param type The type specification of the object to encode
     * @param id The unique identifier of the object type
     */
    public static create(type: IType<TType>, id: number = ObjectSchema.ID++): ObjectSchema {
        return new ObjectSchema(type, id);
    }

    /**
     * Writes an object to a buffer
     * @param obj The object to encode
     */
    public encode(obj: any): Buffer {
        const sz = this.root.size(obj);
        const buf = Buffer.allocUnsafe(sz + 1);
        buf.writeInt8(this.id, 0);
        this.root.encode(obj, buf, 1);
        return buf;
    }

    /**
     * Reads an object from a buffer
     * @param buf The buffer to read the object from
     * @param offset The offset to start reading from
     */
    public decode(buf: Buffer, offset = 0): [number, TType] {
        const id = buf.readInt8(offset);
        const obj = this.root.decode(buf, offset + 1);
        return [id, obj];
    }

    /**
     * Gets an object's size with respect to this schema
     * @param obj The object to get the size of
     */
    public size(obj: any): number {
        return this.root.size(obj) + 1;
    }
}
