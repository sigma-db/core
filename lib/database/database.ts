import { IAttribute } from './attribute';
import { Relation } from './relation';
import { TransactionLog } from './transaction';
import { ObjectSchema, Type } from './serialisation';

interface IOptions {
    path?: string;
}

export interface ISchema {
    [name: string]: Relation;
}

export abstract class Database {
    protected readonly relations: { [name: string]: Relation } = {};

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
            db = new DatabaseTemp();
        }
        return db;
    }

    /**
     * Creates a new relation
     * @param name The name of the relation
     * @param attrs The attributes of the relation
     */
    public createRelation(name: string, attrs: IAttribute[]): void {
        if (!this.relations[name]) {
            this.relations[name] = this.relationConstructor(name, attrs);
        } else {
            throw new Error(`Relation "${name}" already exists.`);
        }
    }

    /**
     * The current schema of the database
     */
    public get schema(): ISchema {
        return Object.keys(this.relations).reduce((S, R) => {
            S[R] = this.relations[R];
            return S;
        }, {});
    }

    /**
     * Access a given relation
     * @param rel The name of the relation to retrieve
     */
    public relation(rel: string): Relation {
        return this.relations[rel];
    }

    /**
     * Closes the database
     */
    public close(): void { }

    protected abstract relationConstructor(name: string, attrs: IAttribute[]): Relation;
}

class DatabaseTemp extends Database {
    protected relationConstructor(name: string, attrs: IAttribute[]): Relation {
        return Relation.create(name, attrs, { isLogged: false });
    }
}

interface ICreateTransaction {
    name: string;
    attrs: IAttribute[];
}

class DatabaseLogged extends Database {
    private static readonly CREATION_ID = 0;
    private static readonly CREATION_SCHEMA = ObjectSchema.create(Type.OBJECT({
        name: Type.STRING,
        attrs: Type.ARRAY(Type.OBJECT({
            name: Type.STRING,
            type: Type.STRING,
            width: Type.INT16
        }))
    }));

    constructor(private log: TransactionLog) {
        super();
        log.handle(DatabaseLogged.CREATION_ID, DatabaseLogged.CREATION_SCHEMA, tx => {
            const { name, attrs } = <ICreateTransaction>tx;
            super.createRelation(name, attrs);
        });
        log.load();
    }

    public createRelation(name: string, attrs: IAttribute[]): void {
        super.createRelation(name, attrs);
        this.log.write(DatabaseLogged.CREATION_ID, { name: name, attrs: attrs });
    }

    public close(): void {
        this.log.close();
    }

    protected relationConstructor(name: string, attrs: IAttribute[]): Relation {
        return Relation.create(name, attrs, { isLogged: true, log: this.log });
    }
}
