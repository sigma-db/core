export enum DataType { INT = "int", STRING = "string", CHAR = "char", BOOL = "bool" }

export interface IAttributeLike {
    name: string;
    type: DataType;
    width: number;
}

export abstract class Attribute implements IAttributeLike {
    public static create(name: string, type: DataType, width?: number): Attribute {
        switch (type) {
            case DataType.INT: return new IntAttribute(name, width || 4);
            case DataType.CHAR: return new CharAttribute(name);
            case DataType.STRING: return new StringAttribute(name, width || 32);
            case DataType.BOOL: return new BoolAttribute(name);
            default: throw new Error("Unsupported data type!");
        }
    }

    public static from(attr: IAttributeLike): Attribute {
        switch (attr.type) {
            case DataType.INT: return Object.setPrototypeOf(attr, IntAttribute.prototype);
            case DataType.CHAR: return Object.setPrototypeOf(attr, CharAttribute.prototype);
            case DataType.STRING: return Object.setPrototypeOf(attr, StringAttribute.prototype);
            case DataType.BOOL: return Object.setPrototypeOf(attr, BoolAttribute.prototype);
            default: throw new Error("Unsupported data type!");
        }
    }

    constructor(private _name: string, private _type: DataType, private _width: number) { }

    public get name(): string {
        return this._name;
    }

    public get type(): DataType {
        return this._type;
    }

    public get width(): number {
        return this._width;
    }

    public abstract get exp(): number;
    public abstract get min(): bigint;
    public abstract get max(): bigint;
    public abstract get wildcard(): bigint;

    public abstract valueOf(value: bigint): number | string | boolean;
}

class IntAttribute extends Attribute {
    constructor(name: string, width: number) {
        super(name, DataType.INT, width);
    }

    public get exp(): number {
        return 31;
    }

    public get min(): bigint {
        return 0n;
    }

    public get max(): bigint {
        return 0x80000000n; // 2 ** 31
    }

    public get wildcard(): bigint {
        return 1n;
    }

    public valueOf(value: bigint): number {
        return Number(value);
    }
}

class BoolAttribute extends Attribute {
    constructor(name: string) {
        super(name, DataType.BOOL, 1);
    }

    public get exp(): number {
        return 1;
    }

    public get min(): bigint {
        return 0n;
    }

    public get max(): bigint {
        return 2n;
    }

    public get wildcard(): bigint {
        return 1n;
    }

    public valueOf(value: bigint): boolean {
        return Boolean(value);
    }
}

class CharAttribute extends Attribute {
    constructor(name: string) {
        super(name, DataType.CHAR, 1);
    }

    public get exp(): number {
        return 8;
    }

    public get min(): bigint {
        return 0n;
    }

    public get max(): bigint {
        return 256n;
    }

    public get wildcard(): bigint {
        return 1n;
    }

    public valueOf(value: bigint): string {
        return String.fromCharCode(Number(value));
    }
}

class StringAttribute extends Attribute {
    constructor(name: string, width: number) {
        super(name, DataType.STRING, width);
    }

    public get exp(): number {
        return this.width * 8;
    }

    public get min(): bigint {
        return 0n;
    }

    public get max(): bigint {
        return 1n << BigInt(this.width * 8);
    }

    public get wildcard(): bigint {
        return 1n;
    }

    public valueOf(value: bigint): string {
        const codes = new Array();
        while (value > 0) {
            codes.push(Number(value & 0xFFn));
            value >>= 8n;
        }
        const valueStr = String.fromCharCode(...codes.reverse());
        return `"${valueStr}"`;
    }
}
