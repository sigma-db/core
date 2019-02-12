import { IComparable } from "../util";

export interface IValue<T> extends IComparable<IValue<T>> {
    val: T;
    pred: IValue<T>;
    succ: IValue<T>;
}

export class NumberValue implements IValue<number> {
    constructor(private value: number) { }

    public get val(): number {
        return this.value;
    }

    public get pred(): NumberValue {
        return new NumberValue(this.value - 1);
    }

    public get succ(): NumberValue {
        return new NumberValue(this.value + 1);
    }

    public compareTo(other: NumberValue): number {
        return this.value - other.value;
    }
}

export class BigIntValue implements IValue<bigint> {
    constructor(private value: bigint) { }

    public get val(): bigint {
        return this.value;
    }

    public get pred(): BigIntValue {
        return new BigIntValue(this.value - 1n);
    }

    public get succ(): BigIntValue {
        return new BigIntValue(this.value + 1n);
    }

    public compareTo(other: BigIntValue): number {
        return Number(this.value - other.value);
    }
}
