"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const global_1 = require("./global");
/**
 * Orders the tuples of a given relation wrt. to their lexicographic order
 * @param R The relation to index
 */
function index(R) {
    return R.sort((x, y) => {
        let i = x.findIndex((val, idx) => val != y[idx]);
        return i < 0 ? 0 : x[i] - y[i];
    });
}
/**
 * Decomposes an open interval (start, end) into a set of pairwise disjoint dyadic intervals.
 * @param start The start of the open interval.
 * @param end The end of the open interval.
 */
function dyadic(start, end) {
    const _dyadic = function* (start, end) {
        const root = (Math.log2(start ^ end) + 1) | 0; // index i of most significant bit s.t. start[j] == end[j] f.a. j > i
        const mask = (1 << root) - 1;
        if ((start & mask) == 0 && (end & mask) == mask) {
            yield (start >> root) ^ (1 << (global_1.L - root));
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
 * Computes all gap boxes inferrable from a given index
 * @param I The index to retrieve gap boxes from
 */
function _gaps(I) {
    if (I.length == 0)
        return [];
    const k = I[0].length;
    let gaps = [];
    let t = I[0];
    for (let j = 0; j < k; j++) {
        let front = t.slice(0, j).map(z => z ^ global_1.MAX);
        let back = Array(k - j - 1).fill(global_1.WILDCARD);
        dyadic(global_1.MIN - 1, t[j]).forEach(i => gaps.push([...front, i, ...back]));
    }
    for (let i = 1; i < I.length; i++) {
        let u = I[i];
        let s = u.findIndex((_, idx) => t[idx] != u[idx]);
        for (let j = s + 1; j < k; j++) {
            let front = t.slice(0, j).map(z => z ^ global_1.MAX);
            let back = Array(k - j - 1).fill(global_1.WILDCARD);
            dyadic(t[j], global_1.MAX).forEach(i => gaps.push([...front, i, ...back]));
        }
        for (let j = s + 1; j < k; j++) {
            let front = u.slice(0, j).map(z => z ^ global_1.MAX);
            let back = Array(k - j - 1).fill(global_1.WILDCARD);
            dyadic(global_1.MIN - 1, u[j]).forEach(i => gaps.push([...front, i, ...back]));
        }
        let front = t.slice(0, s).map(z => z ^ global_1.MAX);
        let back = Array(k - s - 1).fill(global_1.WILDCARD);
        dyadic(t[s], u[s]).forEach(i => gaps.push([...front, i, ...back]));
        t = u;
    }
    for (let j = 0; j < k; j++) {
        let front = t.slice(0, j).map(z => z ^ global_1.MAX);
        let back = Array(k - j - 1).fill(global_1.WILDCARD);
        dyadic(t[j], global_1.MAX).forEach(i => gaps.push([...front, i, ...back]));
    }
    return gaps;
}
/**
 * Generates the knowledge base for a given database D and query Q wrt. the schema inferred from Q and the given SAO.
 * @param Q The query to infer the schema from
 * @param D The database
 * @param SAO The splitting attribute order
 */
function gaps(Q, D, SAO) {
    let B = [];
    Q.body.forEach(atom => {
        let I = index(D[atom.name]);
        let _B = _gaps(I).map(b => SAO.map(v => {
            let pos = atom.vars.indexOf(v);
            return pos < 0 ? global_1.WILDCARD : b[pos];
        }));
        Array.prototype.push.apply(B, _B);
    });
    return B;
}
exports.gaps = gaps;
//# sourceMappingURL=gaps.js.map