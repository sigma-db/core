import { IComparable } from "../util/list";
import { Attribute } from "./attribute";

export class Tuple implements ArrayLike<bigint>, Iterable<bigint>, IComparable<Tuple> {
    readonly [n: number]: bigint;

    /**
     * Turns the given array into a tuple and returns it
     * @param tuple The array of avlues to create the tuple from
     */
    public static from(tuple: Array<bigint>): Tuple {
        return Object.setPrototypeOf(tuple, Tuple.prototype);
    }

    /**
     * Turns the given sequence into a tuple and returns it
     * @param tuple The array of avlues to create the tuple from
     */
    public static of(...tuple: Array<bigint>): Tuple {
        return Object.setPrototypeOf(tuple, Tuple.prototype);
    }

    /**
     * Turns a tuple from its human-readable representation into its internal representation
     * @param tuple The human-readable tuple
     */
    public static create(tuple: Array<number | string | boolean>): Tuple {
        const _tuple = tuple.map(val => {
            switch (typeof val) {
                case "number": return BigInt(val);
                case "string": return [...val].reduce((result, current) => (result << 8n) + BigInt(current.charCodeAt(0) & 0xFF), 0n);
                case "boolean": return val ? 1n : 0n;
                default: throw new Error("Unsupported data type");
            }
        });
        return Tuple.from(_tuple);
    }

    public readonly length: number;

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
        const p = this.findIndex((_, i) => this[i] !== other[i]);
        return p < 0 ? 0 : Number(this[p] - other[p]);
    }

    /**
     * Returns a string representation of the tuple.
     * @param schema The schema to be used to format the tuple's attributes.
     */
    public toString(schema: Attribute[]): string {
        const result = schema.map((attr, idx) => attr.valueOf(this[idx]));
        return `(${result.join(", ")})`;
    }

    /**
     * Returns an object representation of the tuple.
     * @param schema The schema to be used to format the tuple's attributes.
     */
    public toObject(schema: Attribute[]): { [attr: string]: string | number | boolean } {
        return Object.assign({}, ...schema.map((attr, idx) => ({ [attr.name]: attr.valueOf(this[idx]) })));
    }

    public *[Symbol.iterator](): IterableIterator<bigint> {
        for (let i = 0; i < this.length; i++) {
            yield this[i];
        }
    }
}
