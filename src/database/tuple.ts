import { IComparable } from "../util";
import { Attribute, DataType } from "./attribute";

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

    public slice(start: number = 0, end: number = this.length): Array<bigint> {
        return Array.prototype.slice.call(this, start, end);
    }

    public findIndex(predicate: (value: bigint, index: number, obj: any[]) => boolean): number {
        return Array.prototype.findIndex.call(this, predicate);
    }

    public compareTo(other: Tuple): number {
        let p = 0;
        while (p < this.length && this[p] === other[p]) {
            p++;
        }
        return p < this.length ? Number(this[p] - other[p]) : 0;
    }

    /**
     * Returns a string representation of the tuple.
     * @param schema The schema to be used to format the tuple's attributes.
     */
    public toString(schema: Attribute[]): string {
        const result = schema.map((attr, idx) => {
            const val = attr.valueOf(this[idx]);
            return attr.type === DataType.STRING ? `"${val}"` : val;
        });
        return `(${result.join(", ")})`;
    }

    /**
     * Returns the tuple as an array of its attributes' values.
     * @param schema The schema to be used to format the tuple's attributes.
     */
    public toArray(schema: Attribute[]): Array<string | number | boolean> {
        return schema.map((attr, idx) => attr.valueOf(this[idx]));
    }

    public *[Symbol.iterator](): IterableIterator<bigint> {
        for (let i = 0; i < this.length; i++) {
            yield this[i];
        }
    }
}
