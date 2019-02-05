import { DuplicateKeyError } from '../util';
import { Box } from './box';
import { AttributeSpecification, Relation, TTuple } from './relation';
import { ITransaction, TransactionLog, TransactionType } from './transaction';

interface Options {
    logging?: boolean;
}

export interface Schema {
    [name: string]: AttributeSpecification[];
}

interface ICreateTransaction extends ITransaction {
    name: string;
    attrs: AttributeSpecification[];
}

interface IInsertTransaction extends ITransaction {
    rel: string;
    tuple: number[];
}

export class Database {
    private readonly relations: { [name: string]: Relation } = {};

    private constructor(private log: TransactionLog) { }

    /**
     * Opens an existing database stored at the specified location 
     * or creates a new one if it does not yet exist.
     * @param path The path to the database
     */
    public static open(path: string, options?: Options): Database {
        const log = TransactionLog.open(path);
        const db = new Database(log);

        const isCreate = (tx: ITransaction): tx is ICreateTransaction => tx.type == TransactionType.CREATE;
        const isInsert = (tx: ITransaction): tx is IInsertTransaction => tx.type == TransactionType.INSERT;

        for (const tx of log) {
            if (isCreate(tx)) {
                db._createRelation(tx.name, tx.attrs);
            } else if (isInsert(tx)) {
                db._insert(tx.rel, tx.tuple);
            }
        }

        return db;
    }

    /**
     * Closes the database
     */
    public close(): void {
        this.log.close();
    }

    /**
     * Creates a new relation
     * @param name The name of the relation
     * @param attrs The attributes of the relation
     */
    public createRelation(name: string, attrs: AttributeSpecification[]): void {
        this._createRelation(name, attrs);
        this.log.write(<ICreateTransaction>{ type: TransactionType.CREATE, name: name, attrs: attrs });
    }

    /**
     * Inserts a new tuple into the specified relation
     * @param rel The relation to insert into
     * @param tuple The tuple to insert
     */
    public insert(rel: string, tuple: TTuple) {
        this._insert(rel, tuple);
        this.log.write(<IInsertTransaction>{ type: TransactionType.INSERT, rel: rel, tuple: tuple });
    }

    public relationSchema(rel: string): AttributeSpecification[] {
        return this.relations[rel].attrs;
    }

    /**
     * The current schema of the database
     */
    public get schema(): Schema {
        return Object.keys(this.relations).reduce((S, R) => {
            S[R] = this.relations[R].attrs;
            return S;
        }, {});
    }

    public gaps(rel: string, tuple: TTuple): Box[] {
        return this.relations[rel].gaps(tuple);
    }

    private _createRelation(name: string, attrs: AttributeSpecification[]): void {
        if (!this.relations[name]) {
            this.relations[name] = Relation.create(attrs);
        } else {
            throw new Error(`Relation "${name}" already exists.`);
        }
    }

    private _insert(rel: string, tuple: TTuple) {
        try {
            this.relations[rel].insert(tuple);
        } catch (e) {
            if (e instanceof DuplicateKeyError) {
                throw new Error(`Relation "${rel}" already contains tuple ${e.key.toString()}.`);
            } else {
                throw e;
            }
        }
    }
}
