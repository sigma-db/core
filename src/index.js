"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const box_1 = require("./box");
class Index {
    constructor(index) {
        this.index = index;
    }
    /**
     * Orders the tuples of a given relation wrt. to their lexicographic order
     * @param R The relation to index
     */
    static create(R) {
        const idx = R.sort((x, y) => {
            let i = x.findIndex((val, idx) => val != y[idx]);
            return i < 0 ? 0 : x[i] - y[i];
        });
        return new Index(idx);
    }
    /**
     * Decomposes an open interval (start, end) into a set of pairwise disjoint dyadic intervals.
     * @param start The start of the open interval.
     * @param end The end of the open interval.
     */
    dyadic(start, end) {
        const _dyadic = function* (start, end) {
            const root = (Math.log2(start ^ end) + 1) | 0; // index i of most significant bit s.t. start[j] == end[j] f.a. j > i
            const mask = (1 << root) - 1;
            if ((start & mask) == 0 && (end & mask) == mask) {
                yield (start >> root) ^ (1 << (constants_1.L - root));
            }
            else {
                yield* _dyadic(start, start | (mask >> 1));
                yield* _dyadic(end & ~(mask >> 1), end);
            }
        };
        if (start + 1 <= end - 1) {
            return [..._dyadic(start + 1, end - 1)];
        }
        return [];
    }
    /**
     * Computes all gap boxes inferrable from this index
     */
    gaps() {
        if (this.index.length == 0)
            return []; // TODO
        const k = this.index[0].length;
        let gaps = [];
        let t = this.index[0];
        for (let j = 0; j < k; j++) {
            let front = t.slice(0, j).map(z => z ^ constants_1.MAX);
            let back = Array(k - j - 1).fill(constants_1.WILDCARD);
            this.dyadic(constants_1.MIN - 1, t[j]).forEach(i => gaps.push(new box_1.Box([...front, i, ...back])));
        }
        for (let i = 1; i < this.index.length; i++) {
            let u = this.index[i];
            let s = u.findIndex((_, idx) => t[idx] != u[idx]);
            for (let j = s + 1; j < k; j++) {
                let front = t.slice(0, j).map(z => z ^ constants_1.MAX);
                let back = Array(k - j - 1).fill(constants_1.WILDCARD);
                this.dyadic(t[j], constants_1.MAX).forEach(i => gaps.push(new box_1.Box([...front, i, ...back])));
            }
            for (let j = s + 1; j < k; j++) {
                let front = u.slice(0, j).map(z => z ^ constants_1.MAX);
                let back = Array(k - j - 1).fill(constants_1.WILDCARD);
                this.dyadic(constants_1.MIN - 1, u[j]).forEach(i => gaps.push(new box_1.Box([...front, i, ...back])));
            }
            let front = t.slice(0, s).map(z => z ^ constants_1.MAX);
            let back = Array(k - s - 1).fill(constants_1.WILDCARD);
            this.dyadic(t[s], u[s]).forEach(i => gaps.push(new box_1.Box([...front, i, ...back])));
            t = u;
        }
        for (let j = 0; j < k; j++) {
            let front = t.slice(0, j).map(z => z ^ constants_1.MAX);
            let back = Array(k - j - 1).fill(constants_1.WILDCARD);
            this.dyadic(t[j], constants_1.MAX).forEach(i => gaps.push(new box_1.Box([...front, i, ...back])));
        }
        return gaps;
    }
}
exports.Index = Index;
//# sourceMappingURL=index.js.map