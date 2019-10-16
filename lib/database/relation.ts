import { Dyadic, SigmaError } from "../util";
import { DuplicateKeyError, TList, SkipList, IList, ListType, ArrayList } from "../util/list";
import { Attribute } from "./attribute";
import { Box } from "./box";
import { ObjectSchema, Type } from "./serialisation";
import { TransactionLog } from "./transaction";
import { Tuple } from "./tuple";

type TSchema = Attribute[];

interface IOptions {
    throwsOnDuplicate: boolean;
    log: TransactionLog;
    sorted: boolean;
}

class DuplicateTupleError extends SigmaError {
    constructor(private readonly _rel: string, private readonly _tuple: Tuple, private readonly _schema: Attribute[]) {
        super(`Relation "${_rel}" already contains a tuple ${_tuple.toString(_schema)}.`);
    }

    public get relation(): string {
        return this._rel;
    }

    public get tuple(): string {
        return this._tuple.toString(this._schema);
    }
}

class ValueOutOfLimitsError extends SigmaError {
    constructor(_rel: string, _tuple: Tuple, _schema: Attribute[], _pos: number) {
        const value = _schema[_pos].valueOf(_tuple[_pos]);
        const tupleStr = _tuple.toString(_schema);
        const attrName = _schema[_pos].name;
        const { max, width } = _schema[_pos]

        if (typeof value === "string") {
            super(`Value ${value} in ${_rel}${tupleStr} exceeds maximum string length for attribute "${attrName}" (maximum is ${width}).`);
        } else {
            super(`Value ${value} in ${_rel}${tupleStr} exceeds value limit for attribute "${attrName}" (maximum is ${max}).`);
        }
    }
}

class UnsupportedOperationException extends SigmaError {
    constructor(fn: Function, req: string) {
        super(`Function ${fn.name} can only be executed if ${req}.`);
    }
}

export abstract class Relation implements Iterable<Tuple> {
    /**
     * Creates a new relation
     * @param name The name of the relation
     * @param schema The attributes of the relation
     * @param options Options specifying the behaviour of the relation
     */
    public static create(name: string, schema: TSchema, options = Relation.defaultOptions): Relation {
        const { throwsOnDuplicate, log, sorted } = { ...Relation.defaultOptions, ...options };
        const tuples = sorted ? new SkipList<Tuple>(4, 0.25, throwsOnDuplicate) : new ArrayList<Tuple>();

        if (!!log) {
            return new RelationLogged(name, schema, tuples, log);
        } else {
            return new RelationTemp(name, schema, tuples);
        }
    }

    /**
     * Creates a relation of the given name and schema from an existing set of tuples
     * @param name The name of the new relation
     * @param schema The schema of the new relation
     * @param tuples The existing set of tuples to create the relation from
     * @param options Options specifying the behaviour of the relation
     */
    public static from(name: string, schema: TSchema, tuples: TList<Tuple>, options = Relation.defaultOptions): Relation {
        const rel = Relation.create(name, schema, options);
        rel._tuples = tuples;
        return rel;
    }

    /**
     * Default options to create the relation with if not specified differently by the user
     */
    private static readonly defaultOptions: Partial<IOptions> = {
        throwsOnDuplicate: true,
        log: undefined,
        sorted: true,
    } as const;

    private readonly _boundaries: [Array<bigint>, Array<bigint>, number[], Array<bigint>];

    constructor(protected readonly _name: string, protected readonly _schema: TSchema, protected _tuples: TList<Tuple>) {
        this._boundaries = [
            _schema.map(attr => attr.min - 1n),
            _schema.map(attr => attr.max),
            _schema.map(attr => attr.exp),
            _schema.map(attr => attr.wildcard),
        ];
    }

    /**
     * The name of the relation
     */
    public get name(): string {
        return this._name;
    }

    /**
     * The relation schema as specified during the creation
     */
    public get schema(): Attribute[] {
        return this._schema;
    }

    /**
     * The arity of the relation
     */
    public get arity(): number {
        return this._schema.length;
    }

    /**
     * The number of tuples in the relation
     */
    public get size(): number {
        return this._tuples.size;
    }

    /**
     * Whether this relation admits insertions to alter its tuple set
     */
    public get isStatic(): boolean {
        return this instanceof RelationStatic;
    }

    /**
     * Whether changes to this relation's tuple set are logged on disk
     */
    public get isLogged(): boolean {
        return this instanceof RelationLogged;
    }

    public get isSorted(): boolean {
        return this._tuples instanceof SkipList;
    }

    /**
     * Inserts a new tuple into the relation
     * @param tuple The tuple to insert
     */
    public insert(tuple: Tuple) {
        const limitErrPos = tuple.findIndex((v, i) => v > this._schema[i].max); // check whether all values fit their respective attribute's maximum value
        if (limitErrPos >= 0) {
            throw new ValueOutOfLimitsError(this.name, tuple, this._schema, limitErrPos);
        } else {
            try {
                this._tuples.insert(tuple);
            } catch (e) {
                if (e instanceof DuplicateKeyError) {
                    throw new DuplicateTupleError(this.name, e.key, this._schema);
                } else {
                    throw e;
                }
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
     * Infer any gaps surrounding the given tuple within the relation
     * @param tuple The tuple to probe
     */
    public gaps(tuple: Tuple): Box[] {
        this.assertSorted(this._tuples);

        const gaps: Box[] = [];
        const [min, max, exp, wildcard] = this._boundaries;
        const [pred, succ] = this._tuples.find(tuple);

        if (!pred && !succ) {
            // empty relation --> return box covering entire (sub)space
            gaps.push(Box.from(wildcard));
        } else if (!succ) {
            // probe tuple is behind last element in relation
            for (let j = 0; j < this.arity; j++) {
                const front = pred.slice(0, j).map((z, i) => z ^ max[i]);
                const back = wildcard.slice(j + 1);
                Dyadic.intervals(pred[j], max[j], exp[j]).forEach(i => gaps.push(Box.of(...front, i, ...back)));
            }
        } else if (succ.compareTo(tuple) === 0) {
            // probe tuple is in relation --> return empty box set
        } else if (!pred) {
            // probe tuple is before first element in relation
            for (let j = 0; j < this.arity; j++) {
                const front = succ.slice(0, j).map((z, i) => z ^ max[i]);
                const back = wildcard.slice(j + 1);
                Dyadic.intervals(min[j], succ[j], exp[j]).forEach(i => gaps.push(Box.of(...front, i, ...back)));
            }
        } else {
            // probe tuple is between pred and succ
            const s = succ.findIndex((_, idx) => pred[idx] !== succ[idx]);

            for (let j = s + 1; j < this.arity; j++) {
                const front = pred.slice(0, j).map((z, i) => z ^ max[i]);
                const back = wildcard.slice(j + 1);
                Dyadic.intervals(pred[j], max[j], exp[j]).forEach(i => gaps.push(Box.of(...front, i, ...back)));
            }

            for (let j = s + 1; j < this.arity; j++) {
                const front = succ.slice(0, j).map((z, i) => z ^ max[i]);
                const back = wildcard.slice(j + 1);
                Dyadic.intervals(min[j], succ[j], exp[j]).forEach(i => gaps.push(Box.of(...front, i, ...back)));
            }

            const front = pred.slice(0, s).map((z, i) => z ^ max[i]);
            const back = wildcard.slice(s + 1);
            Dyadic.intervals(pred[s], succ[s], exp[s]).forEach(i => gaps.push(Box.of(...front, i, ...back)));
        }

        return gaps;
    }

    /**
     * Iterates the tuples in the relation and returns them in a format appropriate for console.table.
     */
    public *tuples(): IterableIterator<{ [attr: string]: string | number | boolean }> {
        for (const tuple of this._tuples) {
            yield tuple.toObject(this._schema);
        }
    }

    public *[Symbol.iterator](): IterableIterator<Tuple> {
        yield* this._tuples;
    }

    private _gaps(tuple: Tuple, dim: number, start: bigint, end: bigint): Box[] {
        const [, max, exp, wildcard] = this._boundaries;
        const front = tuple.slice(0, dim).map((z, i) => z ^ max[i]);
        const back = wildcard.slice(dim + 1);
        return Dyadic.intervals(start, end, exp[dim]).map(i => Box.of(...front, i, ...back));
    }

    private assertSorted(list: IList<Tuple, ListType>): asserts list is IList<Tuple, ListType.SORTED> {
        if (!(list instanceof SkipList)) {
            throw new UnsupportedOperationException(this.gaps, "the relation is ordered.");
        }
    }
}

class RelationTemp extends Relation {
}

class RelationStatic extends Relation {
    public insert(_tuple: Tuple): void {
        throw new Error("Insertion into a static relation is not permitted");
    }
}

type TInsertTransaction = Array<bigint>;

class RelationLogged extends Relation {
    private static ID = 1;

    private readonly log: TransactionLog;
    private readonly id: number;

    constructor(name: string, schema: Attribute[], tuples: TList<Tuple>, log: TransactionLog) {
        super(name, schema, tuples);
        const tupleSchema = schema.map(() => Type.BIGINT);
        const logSchema = ObjectSchema.create(Type.TUPLE(tupleSchema));
        this.log = log;
        this.id = RelationLogged.ID++;
        this.log.handle<TInsertTransaction>(this.id, logSchema, tx => super.insert(Tuple.from(tx)));
    }

    public insert(tuple: Tuple): void {
        super.insert(tuple);
        this.log.write<TInsertTransaction>(this.id, Array.from(tuple));
    }
}
