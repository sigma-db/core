import { SkipList } from "../util";
import { Box } from "./box";
import { EXP, MAX, MIN, WILDCARD } from "./constants";
import { Tuple } from "./tuple";
import { AttrSpec } from "../query";

const TypeConstructors = {
    "int": Number,
    "string": (x: bigint, width: number) => {
        const result = new Array<number>(width);
        let pos = 0;
        while (x > 0) {
            result[pos++] = Number(x & 0xFFn);
            x >>= 8n;
        }
        return String.fromCharCode(...result.slice(0, pos));
    },
    "char": String.fromCharCode,
    "bool": Boolean
};

export class DuplicateEntryError extends Error {
    constructor(private t: Tuple) {
        super();
    }
    
    public get tuple(): Tuple {
        return this.t;
    }
}

export class Relation {
    private tuples: SkipList<Tuple>;

    private constructor(private _attrs: AttrSpec[], private throwsOnDuplicate: boolean) {
        this.tuples = new SkipList<Tuple>(4, 0.25);
    }

    public static create(attrs: AttrSpec[], throwsOnDuplicate: boolean = true): Relation {
        return new Relation(attrs, throwsOnDuplicate);
    }

    public insert(t: Tuple) {
        if (!this.tuples.insert(t) && this.throwsOnDuplicate) {
            throw new DuplicateEntryError(t);
        }
    }

    public get attrs(): AttrSpec[] {
        return this._attrs;
    }

    public get arity(): number {
        return this._attrs.length;
    }

    public toString(): string {
        const result = [this._attrs.map(attr => attr.name).join(", ")];
        for (let t of this.tuples) {
            result.push(t.toString());
        }
        return result.join(",\r\n");
    }

    /**
     * Decomposes an open interval (start, end) into a set of pairwise disjoint dyadic intervals.
     * @param start The start of the open interval.
     * @param end The end of the open interval.
     */
    private dyadic(start: number, end: number): number[] {
        const _dyadic = function* (start: number, end: number): IterableIterator<number> {
            const root = (Math.log2(start ^ end) + 1) | 0;  // index i of most significant bit s.t. start[j] == end[j] f.a. j > i
            const mask = (1 << root) - 1;

            if ((start & mask) == 0 && (end & mask) == mask) {
                yield (start >> root) ^ (1 << (EXP - root));
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
    public gaps(tuple: Tuple): Box[] {
        const gaps: Box[] = [];
        const r = this.arity;
        const [pred, succ] = this.tuples.find(tuple);

        if (!pred && !succ) {
            // empty relation --> return box covering entire (sub)space
            gaps.push(Box.all(r));
        } else if (!succ) {
            // probe tuple is behind last element in relation
            for (let j = 0; j < r; j++) {
                let front = pred.at(0, j).map(z => z ^ MAX);
                let back = Array(r - j - 1).fill(WILDCARD);
                this.dyadic(pred.at(j), MAX).forEach(i => gaps.push(new Box([...front, i, ...back])));
            }
        } else if (succ.compareTo(tuple) == 0) {
            // probe tuple is in relation --> return empty box set
        } else if (!pred) {
            // probe tuple is before first element in relation
            for (let j = 0; j < r; j++) {
                let front = succ.at(0, j).map(z => z ^ MAX);
                let back = Array(r - j - 1).fill(WILDCARD);
                this.dyadic(MIN - 1, succ.at(j)).forEach(i => gaps.push(new Box([...front, i, ...back])));
            }
        } else {
            // probe tuple is between pred and succ
            let s = succ.findIndex((_, idx) => pred.at(idx) != succ.at(idx));

            for (let j = s + 1; j < r; j++) {
                let front = pred.at(0, j).map(z => z ^ MAX);
                let back = Array(r - j - 1).fill(WILDCARD);
                this.dyadic(pred.at(j), MAX).forEach(i => gaps.push(new Box([...front, i, ...back])));
            }

            for (let j = s + 1; j < r; j++) {
                let front = succ.at(0, j).map(z => z ^ MAX);
                let back = Array(r - j - 1).fill(WILDCARD);
                this.dyadic(MIN - 1, succ.at(j)).forEach(i => gaps.push(new Box([...front, i, ...back])));
            }

            let front = pred.at(0, s).map(z => z ^ MAX);
            let back = Array(r - s - 1).fill(WILDCARD);
            this.dyadic(pred.at(s), succ.at(s)).forEach(i => gaps.push(new Box([...front, i, ...back])));
        }

        return gaps;
    }
}
