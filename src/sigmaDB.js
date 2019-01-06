"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const L = 10;
const MIN = 0; // inclusive
const MAX = 1 << L; // exclusive
const WILDCARD = 1;
/**
 * Reorders the element in a relation wrt. a given permutation
 * @param R The relation whose tuples are to be reordered
 * @param pi The permutation
 */
const PERMUTATE = (R, pi) => R.map(t => t.map((_, i) => t[pi[i]]));
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
        const l = (Math.log2(start ^ end) + 1) | 0; // index i of most significant bit s.t. start[j] == end[j] f.a. j > i
        const mask = (1 << l) - 1;
        if ((start & mask) == 0 && (end & mask) == mask) {
            yield (start >> l) ^ (1 << (L - l));
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
function gaps(I) {
    if (I.length == 0)
        return [];
    const k = I[0].length;
    let gaps = [];
    let t = I[0];
    for (let j = 0; j < k; j++) {
        let front = t.slice(0, j).map(z => z ^ MAX);
        let back = Array(k - j - 1).fill(WILDCARD);
        dyadic(MIN - 1, t[j]).forEach(i => gaps.push([...front, i, ...back]));
    }
    for (let i = 1; i < I.length; i++) {
        let u = I[i];
        let s = u.findIndex((_, idx) => t[idx] != u[idx]);
        for (let j = s + 1; j < k; j++) {
            let front = t.slice(0, j).map(z => z ^ MAX);
            let back = Array(k - j - 1).fill(WILDCARD);
            dyadic(t[j], MAX).forEach(i => gaps.push([...front, i, ...back]));
        }
        for (let j = s + 1; j < k; j++) {
            let front = u.slice(0, j).map(z => z ^ MAX);
            let back = Array(k - j - 1).fill(WILDCARD);
            dyadic(MIN - 1, u[j]).forEach(i => gaps.push([...front, i, ...back]));
        }
        let front = t.slice(0, s).map(z => z ^ MAX);
        let back = Array(k - s - 1).fill(WILDCARD);
        dyadic(t[s], u[s]).forEach(i => gaps.push([...front, i, ...back]));
        t = u;
    }
    for (let j = 0; j < k; j++) {
        let front = t.slice(0, j).map(z => z ^ MAX);
        let back = Array(k - j - 1).fill(WILDCARD);
        dyadic(t[j], MAX).forEach(i => gaps.push([...front, i, ...back]));
    }
    return gaps;
}
/**
 * Generates the knowledge base for a given database D and query Q wrt. the schema inferred from Q and the given SAO.
 * @param Q The query to infer the schema from
 * @param D The database
 * @param SAO The splitting attribute order
 */
function gaps_db(Q, D, SAO) {
    let B = [];
    Q.body.forEach(atom => {
        let I = index(D[atom.name]);
        let _B = gaps(I).map(b => SAO.map(v => {
            let pos = atom.vars.indexOf(v);
            return pos < 0 ? WILDCARD : b[pos];
        }));
        Array.prototype.push.apply(B, _B);
    });
    return B;
}
/**
 * Checks whether a given box a fully contains another box b
 * @param a First box
 * @param b Second box
 */
function contains(a, b) {
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
function split(b) {
    let thick = b.findIndex(i => (i & MAX) == 0);
    let b1 = [...b.slice(0, thick), b[thick] << 1, ...b.slice(thick + 1)];
    let b2 = [...b.slice(0, thick), (b[thick] << 1) + 1, ...b.slice(thick + 1)];
    return [b1, b2];
}
/**
 * Resolves two boxes into a new box
 * @param a First box
 * @param b Second box
 */
function resolve(a, b) {
    let p = a.findIndex((_, i) => b[i] == a[i] + 1);
    let r = a.map((_, i) => {
        let msb_a = Math.log2(a[i]) | 0;
        let msb_b = Math.log2(b[i]) | 0;
        return msb_a > msb_b ? a[i] : b[i];
    });
    r[p] >>= 1;
    return r;
}
/**
 * Infers the schema a given query is formulated against
 * @param Q The query to infer the schema from
 */
function schema(Q) {
    return Q.body.reduce((S, atom) => {
        S[atom.name] = atom.vars.length;
        return S;
    }, {});
}
/**
 * Turns the string representation of a join query into an internal object representation
 * @param Q The query to parse
 */
function parse(Q) {
    let atoms = [];
    let atomRegex = /(\w+\(\)|\w+\(\w+(, ?\w+)*\))/g; // this function is not yet a fully fledged parser; it simply matches atoms, the first of which being the head
    do {
        var m = atomRegex.exec(Q);
        if (m) {
            let atom = m[0];
            let lBracePos = atom.indexOf('(');
            let rBracePos = atom.indexOf(')', lBracePos);
            atoms.push({
                name: atom.substring(0, lBracePos),
                vars: atom.substring(lBracePos + 1, rBracePos).split(',').map(v => v.trim())
            });
        }
    } while (m);
    let [head, ...body] = atoms;
    return { head: head, body: body };
}
/**
 * Creates a database instance from the given specification
 * @param D The specification of the databases content
 */
function database(D) {
    return D; // function only exists to create a coherent interface and to facilitate future extensions
}
exports.database = database;
/**
 * Given a join query against some schema S, returns a query function applicable to S-databases
 * @param Q The join query
 */
function query(Q) {
    const _Q = parse(Q);
    const SAO = _Q.head.vars; // TODO
    const all = Array(_Q.head.vars.length).fill(WILDCARD); // a box covering the entire search space
    const is_tuple = (b) => b.every(i => (i & MAX) == MAX); // checks whether a given box is a tuple
    return (D) => {
        const result = [];
        const A = [];
        const B = gaps_db(_Q, D, SAO);
        let probe = (b) => {
            const a = A.find(_a => contains(_a, b));
            if (!!a) {
                return [true, a];
            }
            else if (is_tuple(b)) {
                return [false, b];
            }
            else {
                let [b1, b2] = split(b);
                let [v1, w1] = probe(b1);
                if (!v1) {
                    return [false, w1];
                }
                else if (contains(w1, b)) {
                    return [true, w1];
                }
                let [v2, w2] = probe(b2);
                if (!v2) {
                    return [false, w2];
                }
                else if (contains(w2, b)) {
                    return [true, w2];
                }
                let w = resolve(w1, w2);
                A.push(w);
                return [true, w];
            }
        };
        let [v, w] = probe(all);
        while (!v) {
            let _B = B.filter(_b => contains(_b, w));
            if (_B.length == 0) {
                result.push(w.map(i => i ^ MAX)); // remove prepended '1' for result tuple
                _B = [w];
            }
            Array.prototype.push.apply(A, _B);
            [v, w] = probe(all);
        }
        return result;
    };
}
exports.query = query;
//# sourceMappingURL=sigmaDB.js.map