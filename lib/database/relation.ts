import { DuplicateKeyError, Dyadic, SkipList } from "../util";
import { Attribute } from "./attribute";
import { Box } from "./box";
import { ObjectSchema, Type } from "./serialisation";
import { TransactionLog } from "./transaction";
import { Tuple } from "./tuple";

type TSchema = Array<Attribute>

interface IOptions {
    throwsOnDuplicate: boolean;
    log: TransactionLog;
}

export abstract class Relation {
    protected _name: string;
    protected _schema: TSchema;
    protected _tuples: SkipList<Tuple>;

    /**
     * Default options to create the relation with if not specified differently by the user
     */
    private static readonly defaultOptions: Partial<IOptions> = {
        throwsOnDuplicate: true,
        log: undefined
    }

    constructor(name: string, schema: TSchema, tuples: SkipList<Tuple>) {
        this._name = name;
        this._schema = schema;
        this._tuples = tuples;
    }

    /**
     * Creates a new relation
     * @param name The name of the relation
     * @param schema The attributes of the relation
     * @param options Options specifying the behaviour of the relation
     */
    public static create(name: string, schema: TSchema, options = Relation.defaultOptions): Relation {
        const { throwsOnDuplicate, log } = { ...Relation.defaultOptions, ...options };
        const tuples = new SkipList<Tuple>(4, 0.25, throwsOnDuplicate);

        if (!!log) {
            return new RelationLogged(name, schema, tuples, log);
        } else {
            return new RelationTemp(name, schema, tuples);
        }
    }

    /**
     * Inserts a new tuple into the relation
     * @param tuple The tuple to insert
     */
    public insert(tuple: Tuple) {
        try {
            this._tuples.insert(tuple);
        } catch (e) {
            if (e instanceof DuplicateKeyError) {
                throw new Error(`Relation "${this._name}" already contains a tuple ${e.key.toString(this._schema)}.`);
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
    public get schema(): Array<Attribute> {
        return this._schema;
    }

    /**
     * The arity of the relation
     */
    public get arity(): number {
        return this._schema.length;
    }

    /**
     * The name of the relation
     */
    public get name(): string {
        return this._name;
    }

    /**
     * The number of tuples in the relation
     */
    public get size(): number {
        return this._tuples.size;
    }

    /**
     * Infer any gaps surrounding the given tuple within the relation
     * @param tuple The tuple to probe
     */
    public gaps(tuple: Tuple): Array<Box> {
        const gaps: Array<Box> = [];
        const [pred, succ] = this._tuples.find(tuple);

        const max = this._schema.map(attr => attr.max);
        const wildcard = this._schema.map(attr => attr.wildcard);

        if (!pred && !succ) {
            // empty relation --> return box covering entire (sub)space
            gaps.push(Box.from(wildcard));
        } else if (!succ) {
            // probe tuple is behind last element in relation
            for (let j = 0; j < this.arity; j++) {
                let front = pred.slice(0, j).map((z, i) => z ^ max[i]);
                let back = wildcard.slice(j + 1);
                Dyadic.get(pred[j], this._schema[j].max, this._schema[j].exp).forEach(i => gaps.push(Box.from([...front, i, ...back])));
            }
        } else if (succ.compareTo(tuple) == 0) {
            // probe tuple is in relation --> return empty box set
        } else if (!pred) {
            // probe tuple is before first element in relation
            for (let j = 0; j < this.arity; j++) {
                let front = succ.slice(0, j).map((z, i) => z ^ max[i]);
                let back = wildcard.slice(j + 1);
                Dyadic.get(this._schema[j].min - 1n, succ[j], this._schema[j].exp).forEach(i => gaps.push(Box.from([...front, i, ...back])));
            }
        } else {
            // probe tuple is between pred and succ
            let s = succ.findIndex((_, idx) => pred[idx] != succ[idx]);

            for (let j = s + 1; j < this.arity; j++) {
                let front = pred.slice(0, j).map((z, i) => z ^ max[i]);
                let back = wildcard.slice(j + 1);
                Dyadic.get(pred[j], this._schema[j].max, this._schema[j].exp).forEach(i => gaps.push(Box.from([...front, i, ...back])));
            }

            for (let j = s + 1; j < this.arity; j++) {
                let front = succ.slice(0, j).map((z, i) => z ^ max[i]);
                let back = wildcard.slice(j + 1);
                Dyadic.get(this._schema[j].min - 1n, succ[j], this._schema[j].exp).forEach(i => gaps.push(Box.from([...front, i, ...back])));
            }

            let front = pred.slice(0, s).map((z, i) => z ^ max[i]);
            let back = wildcard.slice(s + 1);
            Dyadic.get(pred[s], succ[s], this._schema[s].exp).forEach(i => gaps.push(Box.from([...front, i, ...back])));
        }

        return gaps;
    }

    /**
     * Iterates the tuples in the relation and returns them in a format appropriate for console.table.
     */
    public *tuples(): IterableIterator<{ [attr: string]: string | number | boolean }> {
        for (let tuple of this._tuples) {
            yield tuple.toObject(this._schema);
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
    private static ID: number = 1;

    private log: TransactionLog;
    private id: number;

    constructor(name: string, schema: Array<Attribute>, tuples: SkipList<Tuple>, log: TransactionLog) {
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
