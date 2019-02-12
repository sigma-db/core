import { SkipList, DuplicateKeyError } from "../util";
import { IAttribute, TAttribute, DataType, IntAttribute, BoolAttribute, StringAttribute, CharAttribute } from "./attribute";
import { Box } from "./box";
import { EXP, MAX, MIN, WILDCARD } from "./constants";
import { Tuple } from "./tuple";
import { ObjectSchema, Type } from "./serialisation";
import { TransactionLog } from "./transaction";
import { IValue } from "./value";

export type TValue = number | bigint;
export type TTuple = Array<TValue>;

interface IOptions {
    throwsOnDuplicate: boolean;
    isLogged: boolean;
    log: TransactionLog;
}

export abstract class Relation {
    protected _name: string;
    protected _schema: Array<TAttribute>;
    protected _tuples: SkipList<Tuple>;

    /**
     * Default options to create the relation with if not specified differently by the user
     */
    private static readonly defaultOptions: Partial<IOptions> = {
        throwsOnDuplicate: true,
        isLogged: false
    }

    constructor(name: string, schema: Array<TAttribute>, tuples: SkipList<Tuple>) {
        this._name = name;
        this._schema = schema;
        this._tuples = tuples;
    }

    /**
     * Creates a new relation
     * @param name The name of the relation
     * @param attrs The attributes of the relation
     * @param options Options specifying the behaviour of the relation
     */
    public static create(name: string, attrs: Array<IAttribute>, { throwsOnDuplicate, isLogged, log } = Relation.defaultOptions): Relation {
        const tuples = new SkipList<Tuple>(4, 0.25, throwsOnDuplicate);
        const schema = attrs.map(attr => {
            switch (attr.type) {
                case DataType.INT: return new IntAttribute(attr.name);
                case DataType.CHAR: return new CharAttribute(attr.name);
                case DataType.STRING: return new StringAttribute(attr.name, attr.width);
                case DataType.BOOL: return new BoolAttribute(attr.name);
                default: throw new Error('Unsupported data type!');
            }
        });

        if (isLogged) {
            return new RelationLogged(name, schema, tuples, log);
        } else {
            return new RelationTemp(name, schema, tuples);
        }
    }

    /**
     * Inserts a new tuple into the relation
     * @param tuple The tuple to insert
     */
    public insert(tuple: TTuple) {
        const _tuple = Tuple.create(tuple);
        try {
            this._tuples.insert(_tuple);
        } catch (e) {
            if (e instanceof DuplicateKeyError) {
                throw new Error(`Relation "${this._name}" already contains a tuple ${e.key.toString()}.`);
            } else {
                throw e;
            }
        }
    }

    /**
     * Returns a new relation sharing the state of this relation, 
     * but not allowing further modifications of its tuple set.
     */
    public freeze(): Relation {
        return new RelationStatic(this._name, this._schema, this._tuples);
    }

    /**
     * The relation schema as specified during the creation
     */
    public get schema(): Array<IAttribute> {
        return this._schema;
    }

    /**
     * The arity of the relation
     */
    public get arity(): number {
        return this._schema.length;
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
     * Infer any gaps surrounding the given tuple within the relation
     * @param tuple The tuple to probe
     */
    public gaps(tuple: TTuple): Box[] {
        const _tuple = Tuple.create(tuple);
        const gaps: Box[] = [];
        const r = this.arity;
        const [pred, succ] = this._tuples.find(_tuple);

        /*if (!pred && !succ) {
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
        }*/

        return gaps;
    }

    /**
     * Iterates the tuples in the relation and returns them in a format appropriate for console.table.
     */
    public *tuples(): IterableIterator<{ [attr: string]: string | number | boolean }> {
        for (let tuple of this._tuples) {
            yield Object.assign({}, ...this._schema.map((attr, idx) => ({ [attr.name]: attr.valueOf(tuple[idx]) })));
        }
    }
}

class RelationTemp extends Relation {
}

class RelationStatic extends Relation {
    public insert(_tuple: TTuple): void {
        throw new Error("Insertion into a static relation is not permitted");
    }
}

class RelationLogged extends Relation {
    private static ID: number = 1;

    private log: TransactionLog;
    private id: number;

    constructor(name: string, schema: Array<TAttribute>, tuples: SkipList<Tuple>, log: TransactionLog) {
        super(name, schema, tuples);
        const tupleSchema = schema.map(attr => {
            if (attr.type == DataType.STRING) {
                return Type.BIGINT;
            } else {
                return Type.INT;
            }
        });
        const logSchema = ObjectSchema.create(Type.TUPLE(tupleSchema));
        this.log = log;
        this.id = RelationLogged.ID++;
        this.log.handle(this.id, logSchema, tx => super.insert(tx));
    }

    public insert(tuple: TTuple): void {
        super.insert(tuple);
        this.log.write(this.id, tuple)
    }
}
