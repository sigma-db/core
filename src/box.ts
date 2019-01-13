import { Tuple, MAX, WILDCARD } from './common';

export default class Box {
    constructor(private b: number[]) { }

    public forEach: typeof Array.prototype.forEach = Array.prototype.forEach.bind(this.b);

    /**
     * Creates a box covering the entire d-dimensional space
     * @param d The dimensionality
     */
    public static all(d: number): Box {
        return new Box(Array(d).fill(WILDCARD));
    }

    /** 
     *  Checks whether this box is a tuple 
     */
    public isTuple(): boolean {
        return this.b.every(i => (i & MAX) == MAX);
    }

    /**
     * Transforms the box into a tuple
     */
    public tuple(): Tuple {
        return this.b.map(i => i ^ MAX);    // remove prepended '1' for result tuple
    }

    /**
     * Returns this boxes value in a given dimension
     * @param pos The dimension.
     */
    public at(pos: number): number {
        return this.b[pos];
    }

    /**
     * Checks whether a given box a fully contains another box b
     * @param box Other box
     */
    public contains(box: Box): boolean {
        const a = this.b;
        const b = box.b;
        return a.every((_, i) => {
            let msb_a = Math.log2(a[i]) | 0;
            let msb_b = Math.log2(b[i]) | 0;
            return b[i] >> (msb_b - msb_a) == a[i];
        });
    }

    /**
     * Splits a given box b along its first thick dimension
     * @param b The box to be split
     */
    public split(): [Box, Box] {
        let thick = this.b.findIndex(i => (i & MAX) == 0);
        let b1 = [...this.b.slice(0, thick), this.b[thick] << 1, ...this.b.slice(thick + 1)];
        let b2 = [...this.b.slice(0, thick), (this.b[thick] << 1) + 1, ...this.b.slice(thick + 1)];
        return [new Box(b1), new Box(b2)];
    }

    /**
     * Resolves two boxes into a new box
     * @param box Other box
     */
    public resolve(box: Box): Box {
        const a = this.b;
        const b = box.b;
        let p = a.findIndex((_, i) => b[i] == a[i] + 1);
        let r = a.map((_, i) => {
            let msb_a = Math.log2(a[i]) | 0;
            let msb_b = Math.log2(b[i]) | 0;
            return msb_a > msb_b ? a[i] : b[i];
        });
        r[p] >>= 1;
        return new Box(r);
    }

    get length(): number {
        return this.b.length;
    }
}
