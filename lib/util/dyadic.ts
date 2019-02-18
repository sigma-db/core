export class Dyadic {
    /**
     * Gets the index of the most significant bit from num
     * @param num The number to get the index of the most significant bit from
     */
    public static msb(num: bigint): number {
        let _msb = 0;
        while (num > 0) {
            _msb++;
            num >>= 1n;
        }
        return _msb - 1;
    }

    /**
     * Decomposes an open interval (start, end) into a set of pairwise disjoint dyadic intervals.
     * @param start The start of the open interval.
     * @param end The end of the open interval.
     * @param exp The index of the most significant bit of the maximum allowed value
     */
    public static get(start: bigint, end: bigint, exp: number): Array<bigint> {
        if (start + 1n <= end - 1n) {
            return [...Dyadic.dyadic(start + 1n, end - 1n, exp)];
        } else {
            return [];
        }
    }

    private static *dyadic(start: bigint, end: bigint, exp: number): IterableIterator<bigint> {
        const root = Dyadic.msb(start ^ end) + 1;  // index i of most significant bit s.t. start[j] == end[j] f.a. j > i
        const mask = (1n << BigInt(root)) - 1n;

        if ((start & mask) == 0n && (end & mask) == mask) {
            yield (start >> BigInt(root)) ^ (1n << BigInt(exp - root));
        }
        else {
            yield* Dyadic.dyadic(start, start | (mask >> 1n), exp);
            yield* Dyadic.dyadic(end & ~(mask >> 1n), end, exp);
        }
    }
}
