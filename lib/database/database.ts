import { DuplicateKeyError } from '../util';
import { Box } from './box';
import { AttributeSpecification, Relation, TTuple } from './relation';
import { ITransaction, TransactionLog, TransactionType } from './transaction';

interface IOptions {
    path?: string;
}

export interface Schema {
    [name: string]: AttributeSpecification[];
}

export abstract class Database implements Database {
    /**
     * Opens an existing database stored at the specified location 
     * or creates a new one if it does not yet exist.
     */
    public static open({ path }: IOptions): Database {
        let db: Database;
        if (!!path) {
            const log = TransactionLog.open(path);
            db = new DatabaseLogged(log);
        } else {
            db = new DatabaseBase();
        }

        db.init();
        return db;
    }

    /**
     * Creates a new relation
     * @param name The name of the relation
     * @param attrs The attributes of the relation
     */
    public abstract createRelation(name: string, attrs: AttributeSpecification[]): void;

    /**
     * Inserts a new tuple into the specified relation
     * @param rel The relation to insert into
     * @param tuple The tuple to insert
     */
    public abstract insert(rel: string, tuple: TTuple): void;

    public abstract gaps(rel: string, tuple: TTuple): Box[];

    /**
     * The current schema of the database
     */
    public abstract get schema(): Schema;

    public abstract relationSchema(rel: string): AttributeSpecification[];

    /**
     * Closes the database
     */
    public abstract close(): void;

    protected abstract init(): void;
}

class DatabaseBase extends Database {
    private readonly relations: { [name: string]: Relation } = {};

    protected init(): void { }

    public relationSchema(rel: string): AttributeSpecification[] {
        return this.relations[rel].attrs;
    }

    public get schema(): Schema {
        return Object.keys(this.relations).reduce((S, R) => {
            S[R] = this.relations[R].attrs;
            return S;
        }, {});
    }

    public gaps(rel: string, tuple: TTuple): Box[] {
        return this.relations[rel].gaps(tuple);
    }

    public createRelation(name: string, attrs: AttributeSpecification[]): void {
        if (!this.relations[name]) {
            this.relations[name] = Relation.create(attrs);
        } else {
            throw new Error(`Relation "${name}" already exists.`);
        }
    }

    public insert(rel: string, tuple: TTuple) {
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

    public close(): void { }
}

interface ICreateTransaction extends ITransaction {
    name: string;
    attrs: AttributeSpecification[];
}

interface IInsertTransaction extends ITransaction {
    rel: string;
    tuple: number[];
}

class DatabaseLogged extends DatabaseBase {
    constructor(private log: TransactionLog) {
        super();
    }

    protected init(): void {
        const isCreate = (tx: ITransaction): tx is ICreateTransaction => tx.type == TransactionType.CREATE;
        const isInsert = (tx: ITransaction): tx is IInsertTransaction => tx.type == TransactionType.INSERT;

        for (const tx of this.log) {
            if (isCreate(tx)) {
                super.createRelation(tx.name, tx.attrs);
            } else if (isInsert(tx)) {
                super.insert(tx.rel, tx.tuple);
            }
        }
    }

    public close(): void {
        this.log.close();
    }

    public createRelation(name: string, attrs: AttributeSpecification[]): void {
        super.createRelation(name, attrs);
        this.log.write(<ICreateTransaction>{ type: TransactionType.CREATE, name: name, attrs: attrs });
    }

    public insert(rel: string, tuple: TTuple) {
        super.insert(rel, tuple);
        this.log.write(<IInsertTransaction>{ type: TransactionType.INSERT, rel: rel, tuple: tuple });
    }
}
