import { IComparable } from "../util/comparable";

export class Tuple implements IComparable<Tuple> {
    private constructor(private tuple: number[]) { }

    public findIndex: typeof Array.prototype.findIndex = Array.prototype.findIndex.bind(this.tuple);

    public static from(tuple: number[]): Tuple {
        return new Tuple(tuple);
    }

    public at(i: number): number;
    public at(i: number, j: number): number[];
    public at(i: number, j?: number): number | number[] {
        return typeof j !== "undefined" ? this.tuple.slice(i, j) : this.tuple[i];
    }

    public compareTo(other: Tuple): number {
        const p = this.tuple.findIndex((_, i) => this.tuple[i] != other.tuple[i]);
        return p < 0 ? 0 : this.tuple[p] - other.tuple[p];
    }

    public toString(): string {
        return `(${this.tuple.join(", ")})`;
    }
}
