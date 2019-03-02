import { Dyadic } from "../util/dyadic";
import { Attribute } from "./attribute";
import { Tuple } from "./tuple";

export class Box implements ArrayLike<bigint> {
    [n: number]: bigint;
    public readonly length: number;

    /**
     * Creates a box from the given array of intervals
     * @param values The intervals the box will be made of
     */
    public static from(values: Array<bigint>): Box {
        return Object.setPrototypeOf(values, Box.prototype);
    }

    /**
     * Creates a box from the given sequence of intervals
     * @param values The intervals the box will be made of
     */
    public static of(...values: Array<bigint>): Box {
        return Object.setPrototypeOf(values, Box.prototype);
    }

    /**
     *  Checks whether this box is a tuple
     */
    public isTuple(schema: Array<Attribute>): boolean {
        return this.every((v, i) => (v & schema[i].max) == schema[i].max);
    }

    /**
     * Transforms the box into a tuple
     */
    public tuple(schema: Array<Attribute>): Tuple {
        const tuple = this.map((v, i) => v ^ schema[i].max);
        return Tuple.from(tuple);
    }

    /**
     * Checks whether this box fully contains another box
     * @param other Other box
     */
    public contains(other: Box): boolean {
        return this.every((_, i) => {
            let msb_a = Dyadic.msb(this[i]);
            let msb_b = Dyadic.msb(other[i]);
            return other[i] >> BigInt(Math.abs(msb_b - msb_a)) == this[i];
        });
    }

    /**
     * Splits a given box b along its first thick dimension
     * @param b The box to be split
     */
    public split(schema: Array<Attribute>): [Box, Box] {
        let thick = this.findIndex((int, idx) => (int & schema[idx].max) == 0n);
        let b1 = Box.of(...this.slice(0, thick), this[thick] << 1n, ...this.slice(thick + 1));
        let b2 = Box.of(...this.slice(0, thick), (this[thick] << 1n) + 1n, ...this.slice(thick + 1));
        return [b1, b2];
    }

    /**
     * Resolves two boxes into a new box
     * @param other Other box
     */
    public resolve(other: Box): Box {
        let p = this.findIndex((_, i) => other[i] == this[i] + 1n);
        let r = this.map((_, i) => {
            let msb_a = Dyadic.msb(this[i]);
            let msb_b = Dyadic.msb(other[i]);
            return msb_a > msb_b ? this[i] : other[i];
        });
        r[p] >>= 1n;
        return Box.from(r);
    }

    private every(callbackfn: (value: bigint, index: number, array: any[]) => boolean): boolean {
        return Array.prototype.every.call(this, callbackfn);
    }

    private findIndex(predicate: (value: bigint, index: number, obj: any[]) => boolean): number {
        return Array.prototype.findIndex.call(this, predicate);
    }

    private map<U>(callbackfn: (value: bigint, index: number, array: any[]) => U): Array<U> {
        return Array.prototype.map.call(this, callbackfn);
    }

    private slice(start?: number, end?: number): Array<bigint> {
        return Array.prototype.slice.call(this, start, end);
    }
}
