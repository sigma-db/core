import { NumberValue, BigIntValue, IValue } from "./value";

export enum DataType { INT = "int", STRING = "string", CHAR = "char", BOOL = "bool" }

export interface IAttribute {
    name: string;
    type: DataType;
    width: number;
}

abstract class Attribute<T> implements IAttribute {
    constructor(protected _name: string, protected _type: DataType, protected _width: number) { }

    public get name(): string {
        return this._name;
    }

    public get type(): DataType {
        return this._type;
    }

    public get width(): number {
        return this._width;
    }

    public abstract get min(): IValue<T>;
    public abstract get max(): IValue<T>;

    public abstract valueOf(value: IValue<any>): number | string | boolean;
}

export type TAttribute = Attribute<number> | Attribute<bigint>;

export class IntAttribute extends Attribute<number> {
    constructor(name: string) {
        super(name, DataType.INT, 4);
    }

    public get min(): NumberValue {
        return new NumberValue(0);
    }

    public get max(): NumberValue {
        return new NumberValue(1 << 31);
    }

    public valueOf(value: NumberValue): number {
        return value.val;
    }
}

export class BoolAttribute extends Attribute<number> {
    constructor(name: string) {
        super(name, DataType.BOOL, 1);
    }

    public get min(): NumberValue {
        return new NumberValue(0);
    }

    public get max(): NumberValue {
        return new NumberValue(2);
    }

    public valueOf(value: NumberValue): boolean {
        return Boolean(value.val);
    }
}

export class CharAttribute extends Attribute<number> {
    constructor(name: string) {
        super(name, DataType.CHAR, 1);
    }

    public get min(): NumberValue {
        return new NumberValue(0);
    }

    public get max(): NumberValue {
        return new NumberValue(1 << 8);
    }

    public valueOf(value: NumberValue): string {
        return String.fromCharCode(value.val);
    }
}

export class StringAttribute extends Attribute<bigint> {
    constructor(name: string, width: number) {
        super(name, DataType.STRING, width);
    }

    public get min(): BigIntValue {
        return new BigIntValue(0n);
    }

    public get max(): BigIntValue {
        return new BigIntValue(1n << BigInt(this._width * 8));
    }

    public valueOf(value: BigIntValue): string {
        const codes = new Array();
        let v = value.val;
        while (v > 0) {
            codes.push(Number(v & 0xFFn));
            v >>= 8n;
        }
        return String.fromCharCode(...codes.reverse());
    }
}
