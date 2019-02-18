import { IComparable } from "../util";
import { Attribute } from "./attribute";

export class Tuple implements ArrayLike<bigint>, IComparable<Tuple> {
    readonly [n: number]: bigint;
    public readonly length: number;

    /**
     * Turns the given array into a tuple and returns it
     * @param tuple The array of avlues to create the tuple from
     */
    public static from(tuple: Array<bigint>): Tuple {
        return Object.setPrototypeOf(tuple, Tuple.prototype);
    }

    public slice(start?: number, end?: number): Array<bigint> {
        return Array.prototype.slice.call(this, start, end);
    }

    public findIndex(predicate: (value: bigint, index: number, obj: any[]) => boolean): number {
        return Array.prototype.findIndex.call(this, predicate);
    }

    public forEach(callbackfn: (value: bigint, index: number, array: any[]) => void): void {
        Array.prototype.forEach.call(this, callbackfn);
    }

    public compareTo(other: Tuple): number {
        const p = this.findIndex((_, i) => this[i] != other[i]);
        return p < 0 ? 0 : Number(this[p] - other[p]);
    }

    /**
     * Returns a string representation of the tuple.
     * @param schema The schema to be used to format the tuple's attributes.
     */
    public toString(schema: Array<Attribute>): string {
        const result = schema.map((attr, idx) => attr.valueOf(this[idx]));
        return `(${result.join(", ")})`;
    }

    /**
     * Returns an object representation of the tuple.
     * @param schema The schema to be used to format the tuple's attributes.
     */
    public toObject(schema: Array<Attribute>): { [attr: string]: string | number | boolean } {
        return Object.assign({}, ...schema.map((attr, idx) => ({ [attr.name]: attr.valueOf(this[idx]) })));
    }
}
