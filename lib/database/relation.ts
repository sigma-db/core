import { Dyadic } from "../util";
import { DuplicateKeyError, IComparable, SkipList, ArrayList } from "../util/list";
import { Attribute } from "./attribute";
import { Box } from "./box";
import { ValueOutOfLimitsError, DuplicateTupleError, UnsupportedOperationError } from "./errors";
import { ObjectSchema, Type } from "./serialisation";
import { TransactionLog } from "./transaction";
import { Tuple } from "./tuple";

type List<T extends IComparable<T>> = ArrayList<T> | SkipList<T>;
type RelationConstructor = new (...input: any[]) => RelationImpl;

interface IOptions {
    sorted: boolean;
    log: TransactionLog;
    tuples: List<Tuple>;
    throwsOnDuplicate: boolean;
}

export abstract class Relation implements Iterable<Tuple> {
    /**
     * Default options to create the relation with if not specified differently by the user
     */
    private static readonly defaultOptions: Partial<IOptions> = {
        throwsOnDuplicate: true,
        sorted: true,
    } as const;

    /**
     * Creates a new relation
     * @param name The name of the relation
     * @param schema The attributes of the relation
     * @param options Options specifying the behaviour of the relation
     */
    public static create(name: string, schema: Attribute[], options = Relation.defaultOptions): Relation {
        return RelationImpl.create(name, schema, { ...Relation.defaultOptions, ...options });
    }

    constructor(protected readonly _name: string, protected readonly _schema: Attribute[], protected readonly _tuples: List<Tuple>) { }

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
    public abstract get isSorted(): boolean;

    /**
     * Whether changes to this relation's tuple set are logged on disk
     */
    public abstract get isLogged(): boolean;

    /**
     * Whether this relation admits insertions to alter its tuple set
     */
    public abstract get isStatic(): boolean;

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

    /**
     * Returns a new relation sharing the state of this relation,
     * but with its past and future tuples being kept sorted.
     */
    public abstract sort(throwsOnDuplicate?: boolean): Relation;

    /**
     * Returns a new relation sharing the state of this relation,
     * but logging any future modifications.
     * @param log The log to write modifications to.
     */
    public abstract log(log: TransactionLog): Relation;

    /**
     * Returns a new relation sharing the state of this relation,
     * but not allowing further modifications of its tuple set.
     */
    public abstract static(): Relation;

    /**
     * Infer any gaps surrounding the given tuple within the relation
     * @param tuple The tuple to probe
     */
    public abstract gaps(tuple: Tuple): Box[];
}

class RelationImpl extends Relation {
    public static create(name: string, schema: Attribute[], options: Partial<IOptions>): Relation {
        const { throwsOnDuplicate, log, sorted, tuples } = options;
        const _tuples = tuples || (sorted ? new SkipList<Tuple>(4, 0.25, throwsOnDuplicate) : new ArrayList<Tuple>());

        let inst = new RelationImpl(name, schema, _tuples);
        if (!!log) {
            inst = inst.log(log);
        }
        if (sorted) {
            inst = inst.sort();
        }

        inst.init(options);
        return inst;
    }

    public get isSorted(): boolean {
        return false;
    }

    public get isLogged(): boolean {
        return false;
    }

    public get isStatic(): boolean {
        return false;
    }

    public init(options: Partial<IOptions>): void { }

    public sort(throwsOnDuplicate = true): RelationImpl {
        if (this.isSorted) {
            return this;
        } else {
            const _tuples = SkipList.from(this._tuples, throwsOnDuplicate);
            return new (this.makeSorted(this.constructor as RelationConstructor))(this._name, this._schema, _tuples);
        }
    }

    public log(log: TransactionLog): RelationImpl {
        if (this.isLogged) {
            return this;
        } else {
            return new (this.makeLogged(this.constructor as RelationConstructor))(this._name, this._schema, this._tuples);
        }
    }

    public static(): RelationImpl {
        if (this.isStatic) {
            return this;
        } else {
            return new (this.makeStatic(this.constructor as RelationConstructor))(this._name, this._schema, this._tuples);
        }
    }

    public gaps(tuple: Tuple): Box[] {
        throw new UnsupportedOperationError(`Function ${this.gaps.name} can only be executed if the relation is kept sorted.`);
    }

    private makeSorted<T extends RelationConstructor>(BaseRelation: T) {
        return class SortedRelation extends BaseRelation {
            protected readonly _tuples: SkipList<Tuple>;
            private _boundaries: [bigint[], bigint[], number[], bigint[]];

            public get isSorted(): true {
                return true;
            }

            public init(options: Partial<IOptions>): void {
                super.init(options);
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
    }

    private makeLogged<T extends RelationConstructor>(BaseRelation: T) {
        return class LoggedRelation extends BaseRelation {
            private static ID = 1;
            private readonly id = LoggedRelation.ID++;
            private _log: TransactionLog;

            public get isLogged(): true {
                return true;
            }

            public init(options: Partial<IOptions>): void {
                super.init(options);
                const tupleSchema = this._schema.map(() => Type.BIGINT);
                const logSchema = ObjectSchema.create(Type.TUPLE(tupleSchema));
                this._log = options.log;
                this._log.handle(this.id, logSchema, (tx: bigint[]) => super.insert(Tuple.from(tx)));
            }

            public insert(tuple: Tuple): void {
                super.insert(tuple);
                this._log.write(this.id, Array.from(tuple));
            }
        }
    }

    private makeStatic<T extends RelationConstructor>(BaseRelation: T) {
        return class StaticRelation extends BaseRelation {
            public get isStatic(): true {
                return true;
            }

            public insert(_tuple: Tuple): void {
                throw new UnsupportedOperationError("Insertion into a static relation is not permitted.");
            }
        }
    }
}
