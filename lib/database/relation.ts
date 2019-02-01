import { SkipList, IComparable } from "../util";
import { Box } from "./box";
import { EXP, MAX, MIN, WILDCARD } from "./constants";

export type TValue = number;
export enum DataType { INT = "int", STRING = "string", CHAR = "char", BOOL = "bool" }
export type TTuple = Array<TValue>;

export interface AttributeSpecification {
    name: string;
    type: DataType;
    width: number;
}

type TypeConstructor = (value: TValue, width?: number) => number | string | boolean;

class Attribute implements AttributeSpecification {
    private static readonly types: { [type: string]: TypeConstructor } = Object.freeze({
        "int": Number,
        "string": (x: number, width: number) => {
            const dquote = "\"".charCodeAt(0);
            const result = new Array<number>(width + 2);
            result[0] = dquote;
            let pos = 1;
            while (x > 0) {
                result[pos++] = Number(x & 0xFF);
                x >>= 8;
            }
            result[pos] = dquote;
            return String.fromCharCode(...result.slice(0, pos + 1));
        },
        "char": String.fromCharCode,
        "bool": Boolean
    });

    constructor(private _name: string, private _type: DataType, private _width: number) { }

    public valueOf(value: TValue) {
        return Attribute.types[this._type](value, this._width);
    }

    public get name() {
        return this._name;
    }

    public get type(): DataType {
        return this._type;
    }

    public get width(): number {
        return this._width;
    }
}

class Tuple extends Array<number> implements IComparable<Tuple> {
    private constructor(private _tuple: TTuple, private schema: Attribute[]) {
        super(..._tuple);
    }

    public static create(tuple: TTuple, schema: Attribute[]): Tuple {
        return new Tuple(tuple, schema);
    }

    public compareTo(other: Tuple): number {
        const p = this.findIndex((_, i) => this[i] != other[i]);
        return p < 0 ? 0 : this[p] - other[p];
    }

    public toString(): string {
        return `(${this._tuple.map((v, i) => this.schema[i].valueOf(v)).join(", ")})`;
    }
}

export class Relation {
    private tuples: SkipList<Tuple>;
    private schema: Attribute[];

    private constructor(attrs: Attribute[], throwsOnDuplicate: boolean) {
        this.tuples = new SkipList<Tuple>(4, 0.25, throwsOnDuplicate);
        this.schema = attrs;
    }

    public static create(attrs: Array<AttributeSpecification>, throwsOnDuplicate: boolean = true): Relation {
        return new Relation(attrs.map(attr => new Attribute(attr.name, attr.type, attr.width)), throwsOnDuplicate);
    }

    public insert(t: TTuple) {
        const _t = Tuple.create(t, this.schema)
        this.tuples.insert(_t);
    }

    public get attrs(): AttributeSpecification[] {
        return this.schema;
    }

    public get arity(): number {
        return this.schema.length;
    }

    public toString(): string {
        const result = [this.schema.map(a => a.name).join(", ")];
        for (let t of this.tuples) {
            result.push(t.map((v, i) => this.schema[i].valueOf(v)).join(", "));
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
    public gaps(tuple: TTuple): Box[] {
        const _tuple = Tuple.create(tuple, this.schema);
        const gaps: Box[] = [];
        const r = this.arity;
        const [pred, succ] = this.tuples.find(_tuple);

        if (!pred && !succ) {
            // empty relation --> return box covering entire (sub)space
            gaps.push(Box.all(r));
        } else if (!succ) {
            // probe tuple is behind last element in relation
            for (let j = 0; j < r; j++) {
                let front = pred.slice(0, j).map(z => z ^ MAX);
                let back = Array(r - j - 1).fill(WILDCARD);
                this.dyadic(pred[j], MAX).forEach(i => gaps.push(new Box([...front, i, ...back])));
            }
        } else if (succ.compareTo(_tuple) == 0) {
            // probe tuple is in relation --> return empty box set
        } else if (!pred) {
            // probe tuple is before first element in relation
            for (let j = 0; j < r; j++) {
                let front = succ.slice(0, j).map(z => z ^ MAX);
                let back = Array(r - j - 1).fill(WILDCARD);
                this.dyadic(MIN - 1, succ[j]).forEach(i => gaps.push(new Box([...front, i, ...back])));
            }
        } else {
            // probe tuple is between pred and succ
            let s = succ.findIndex((_, idx) => pred[idx] != succ[idx]);

            for (let j = s + 1; j < r; j++) {
                let front = pred.slice(0, j).map(z => z ^ MAX);
                let back = Array(r - j - 1).fill(WILDCARD);
                this.dyadic(pred[j], MAX).forEach(i => gaps.push(new Box([...front, i, ...back])));
            }

            for (let j = s + 1; j < r; j++) {
                let front = succ.slice(0, j).map(z => z ^ MAX);
                let back = Array(r - j - 1).fill(WILDCARD);
                this.dyadic(MIN - 1, succ[j]).forEach(i => gaps.push(new Box([...front, i, ...back])));
            }

            let front = pred.slice(0, s).map(z => z ^ MAX);
            let back = Array(r - s - 1).fill(WILDCARD);
            this.dyadic(pred[s], succ[s]).forEach(i => gaps.push(new Box([...front, i, ...back])));
        }

        return gaps;
    }
}
