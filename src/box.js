"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
class Box {
    constructor(b) {
        this.b = b;
    }
    /**
     * Creates a box covering the entire d-dimensional space
     * @param d The dimensionality
     */
    static all(d) {
        return new Box(Array(d).fill(constants_1.WILDCARD));
    }
    /**
     *  Checks whether this box is a tuple
     */
    isTuple() {
        return this.b.every(i => (i & constants_1.MAX) == constants_1.MAX);
    }
    /**
     * Transforms the box into a tuple
     */
    tuple() {
        return this.b.map(i => i ^ constants_1.MAX); // remove prepended '1' for result tuple
    }
    /**
     * Returns this boxes value in a given dimension.
     * @param pos The dimension.
     */
    at(pos) {
        return this.b[pos];
    }
    /**
     * Checks whether a given box a fully contains another box b
     * @param box Other box
     */
    contains(box) {
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
    split() {
        let thick = this.b.findIndex(i => (i & constants_1.MAX) == 0);
        let b1 = [...this.b.slice(0, thick), this.b[thick] << 1, ...this.b.slice(thick + 1)];
        let b2 = [...this.b.slice(0, thick), (this.b[thick] << 1) + 1, ...this.b.slice(thick + 1)];
        return [new Box(b1), new Box(b2)];
    }
    /**
     * Resolves two boxes into a new box
     * @param box Other box
     */
    resolve(box) {
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
}
exports.Box = Box;
//# sourceMappingURL=box.js.map