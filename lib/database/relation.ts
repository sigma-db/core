import { Dyadic } from "../util";
import { DuplicateKeyError, SkipList, ArrayList, List } from "../util/list";
import { Attribute } from "./attribute";
import { Box } from "./box";
import { ValueOutOfLimitsError, DuplicateTupleError, UnsupportedOperationError } from "./errors";
import { ObjectSchema, Type } from "./serialisation";
import { TransactionLog } from "./transaction";
import { Tuple } from "./tuple";

interface RelationConstructor {
    new(...input: any[]): _Relation;
}

interface Mixin {
    /**
     * Transforms a given Relation type `BaseRelation` into a type inheriting
     * from `BaseRelation` and probably adding or overwriting some functions.
     * @param BaseRelation The Relation type to extend
     */
    <T extends RelationConstructor>(BaseRelation: T): T;
}

interface Options {
    sorted: boolean;
    log: TransactionLog;
    tuples: List<Tuple, boolean>;
    throwsOnDuplicate: boolean;
}

export abstract class Relation implements Iterable<Tuple> {
    /**
     * Default options to create the relation with if not specified differently by the user
     */
    private static readonly defaultOptions: Partial<Options> = {
        throwsOnDuplicate: true,
        sorted: true,
    } as const;

    private static anonymousCnt = 1;

    /**
     * Creates a new relation
     * @param name The name of the relation
     * @param schema The attributes of the relation
     * @param options Options specifying the behaviour of the relation
     */
    public static create(name: string, schema: Attribute[], options = Relation.defaultOptions): Relation {
        const { throwsOnDuplicate, log, sorted, tuples } = { ...Relation.defaultOptions, ...options };
        const _tuples = tuples || (sorted ? new SkipList<Tuple>(4, 0.25, throwsOnDuplicate) : new ArrayList<Tuple>());

        let inst = new _Relation(name, schema, _tuples, Relation.hash(name || `@${Relation.anonymousCnt++}`));
        if (!!log) {
            inst = inst.log(log);
        }
        if (sorted) {
            inst = inst.sort();
        }

        return inst;
    }

    /**
     * Jenkins OAT hashing function, returning an unsigned integer
     * @param key The value to hash
     */
    private static hash(key: string): number {
        let hash = 0;

        for (let i = 0; i < key.length; i++) {
            hash += key.charCodeAt(i);
            hash += (hash << 10);
            hash ^= (hash >> 6);
        }

        hash += (hash << 3);
        hash ^= (hash >> 11);
        hash += (hash << 15);

        return hash >>> 0;  // make unsigned
    }

    constructor(
        protected readonly _name: string,
        protected readonly _schema: Attribute[],
        protected readonly _tuples: List<Tuple, boolean>,
        protected readonly _id: number,
    ) { }

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
     * Whether this relation's tuples are kept sorted
     */
    public get isSorted(): boolean {
        return false;
    };

    /**
     * Whether changes to this relation's tuple set are logged on disk
     */
    public get isLogged(): boolean {
        return false;
    };

    /**
     * Whether this relation admits insertions to alter its tuple set
     */
    public get isStatic(): boolean {
        return false;
    };

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
     * but with its past and future tuples being kept sorted.
     */
    public sort(throwsOnDuplicate = true): Relation {
        if (this.isSorted) {
            return this;
        } else {
            return this.mixin(mixinSorted, { throwsOnDuplicate });
        }
    }

    /**
     * Returns a new relation sharing the state of this relation,
     * but logging any future modifications.
     * @param log The log to write modifications to.
     */
    public log(log: TransactionLog): Relation {
        if (this.isLogged) {
            return this;
        } else {
            return this.mixin(mixinLogged, { log });
        }
    }

    /**
     * Returns a new relation sharing the state of this relation,
     * but not allowing further modifications of its tuple set.
     */
    public static(): Relation {
        if (this.isStatic) {
            return this;
        } else {
            return this.mixin(mixinStatic, {});
        }
    }

    /**
     * Infer any gaps surrounding the given tuple within the relation
     * @param tuple The tuple to probe
     */
    public gaps(tuple: Tuple): Box[] {
        throw new UnsupportedOperationError(`Function ${this.gaps.name} can only be executed if the relation is kept sorted.`);
    }

    /**
     * Iterates the tuples in the relation and returns them in a format appropriate for console.table.
     * Note that due to the absence of a dedicated `char` data type, such values will be returned as string.
     */
    public *tuples(): IterableIterator<{ [attr: string]: string | number | boolean }> {
        for (const tuple of this._tuples) {
            yield tuple.toObject(this._schema);
        }
    }

    public *[Symbol.iterator](): IterableIterator<Tuple> {
        yield* this._tuples;
    }

    protected init(options?: Partial<Options>): void { }

    private mixin(mixin: Mixin, options: Partial<Options>): Relation {
        const inst = { ...this };
        const ctor = mixin(this.constructor as RelationConstructor);
        Object.setPrototypeOf(inst, ctor.prototype);
        inst.init(options);
        return inst;
    }
}

/** Used to hide internals from the public API */
class _Relation extends Relation { }

const mixinSorted: Mixin = BaseRelation => class SortedRelation extends BaseRelation {
    protected _tuples: List<Tuple, true>;
    private _boundaries: [bigint[], bigint[], number[], bigint[]];

    public get isSorted(): true {
        return true;
    }

    public init(options: Partial<Options>): void {
        this._tuples = SkipList.from(this._tuples, options.throwsOnDuplicate);
        this._boundaries = [
            this._schema.map(attr => attr.min - 1n),
            this._schema.map(attr => attr.max),
            this._schema.map(attr => attr.exp),
            this._schema.map(attr => attr.wildcard),
        ];
    }

    public gaps(tuple: Tuple): Box[] {
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
}

const mixinLogged: Mixin = BaseRelation => class LoggedRelation extends BaseRelation {
    private _log: TransactionLog;

    public get isLogged(): true {
        return true;
    }

    public init(options: Partial<Options>): void {
        const tupleSchema = this._schema.map(() => Type.BIGINT);
        const logSchema = ObjectSchema.create(Type.TUPLE(tupleSchema));
        this._log = options.log;
        this._log.handle(this._id, logSchema, (tx: bigint[]) => super.insert(Tuple.from(tx)));
    }

    public insert(tuple: Tuple): void {
        super.insert(tuple);
        this._log.write(this._id, Array.from(tuple));
    }
}

const mixinStatic: Mixin = BaseRelation => class StaticRelation extends BaseRelation {
    public get isStatic(): true {
        return true;
    }

    public init(): void { }

    public insert(_tuple: Tuple): void {
        throw new UnsupportedOperationError("Insertion into a static relation is not permitted.");
    }
}
