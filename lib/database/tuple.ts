import { IComparable } from "../util";
import { IValue, NumberValue, BigIntValue } from "./value";

export class Tuple implements ArrayLike<IValue<number | bigint>>, IComparable<Tuple> {
    [n: number]: IValue<number | bigint>;
    private readonly _length: number;

    private constructor(tuple: Array<IValue<number | bigint>>) {
        tuple.forEach((val, idx) => this[idx] = val);
        this._length = tuple.length;
    }

    public slice: typeof Array.prototype.slice = Array.prototype.slice.bind(this);
    public findIndex: typeof Array.prototype.findIndex = Array.prototype.findIndex.bind(this);
    public forEach: typeof Array.prototype.forEach = Array.prototype.forEach.bind(this);

    public static create(tuple: Array<number | bigint>): Tuple {
        return new Tuple(tuple.map(val => {
            if (typeof val == 'number') {
                return new NumberValue(val);
            } else if (typeof val == 'bigint') {
                return new BigIntValue(val);
            } else {
                throw new Error('Unsupported data representation');
            }
        }));
    }

    public compareTo(other: Tuple): number {
        const p = this.findIndex((_, i) => this[i].compareTo(other[i]) != 0);
        return p < 0 ? 0 : this[p].compareTo(other[p]);
    }

    public get length(): number {
        return this._length;
    }

    [Symbol.toStringTag](): string {
        const result = Array.from(this).map(v => v.valueOf());
        return `(${result.join(", ")})`;
    }
}
