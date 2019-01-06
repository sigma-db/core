import { Tuple, Relation } from './types';
import { L, MIN, MAX, WILDCARD } from './constants';
import { Box } from './box';

export class Index {
    private constructor(private index: Relation) { }

    /**
     * Orders the tuples of a given relation wrt. to their lexicographic order
     * @param R The relation to index
     */
    public static create(R: Relation): Index {
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
    private dyadic(start: number, end: number): number[] {
        const _dyadic = function* (start: number, end: number): IterableIterator<number> {
            const root = (Math.log2(start ^ end) + 1) | 0; // index i of most significant bit s.t. start[j] == end[j] f.a. j > i
            const mask = (1 << root) - 1;

            if ((start & mask) == 0 && (end & mask) == mask) {
                yield (start >> root) ^ (1 << (L - root));
            }
            else {
                yield* _dyadic(start, start | (mask >> 1));
                yield* _dyadic(end & ~(mask >> 1), end);
            }
        }

        if (start + 1 <= end - 1) {
            return [..._dyadic(start + 1, end - 1)];
        }

        return [];
    }

    /**
     * Computes all gap boxes inferrable from this index
     */
    public gaps(): Box[] {
        if (this.index.length == 0) return [];  // TODO

        const k = this.index[0].length;

        let gaps: Box[] = [];
        let t: Tuple = this.index[0];

        for (let j = 0; j < k; j++) {
            let front = t.slice(0, j).map(z => z ^ MAX);
            let back = Array(k - j - 1).fill(WILDCARD);
            this.dyadic(MIN - 1, t[j]).forEach(i => gaps.push(new Box([...front, i, ...back])));
        }

        for (let i = 1; i < this.index.length; i++) {
            let u = this.index[i];
            let s = u.findIndex((_, idx) => t[idx] != u[idx]);

            for (let j = s + 1; j < k; j++) {
                let front = t.slice(0, j).map(z => z ^ MAX);
                let back = Array(k - j - 1).fill(WILDCARD);
                this.dyadic(t[j], MAX).forEach(i => gaps.push(new Box([...front, i, ...back])));
            }

            for (let j = s + 1; j < k; j++) {
                let front = u.slice(0, j).map(z => z ^ MAX);
                let back = Array(k - j - 1).fill(WILDCARD);
                this.dyadic(MIN - 1, u[j]).forEach(i => gaps.push(new Box([...front, i, ...back])));
            }

            let front = t.slice(0, s).map(z => z ^ MAX);
            let back = Array(k - s - 1).fill(WILDCARD);
            this.dyadic(t[s], u[s]).forEach(i => gaps.push(new Box([...front, i, ...back])));

            t = u;
        }

        for (let j = 0; j < k; j++) {
            let front = t.slice(0, j).map(z => z ^ MAX);
            let back = Array(k - j - 1).fill(WILDCARD);
            this.dyadic(t[j], MAX).forEach(i => gaps.push(new Box([...front, i, ...back])));
        }

        return gaps;
    }
}
