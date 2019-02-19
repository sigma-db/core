﻿import { Attribute, IAttributeLike } from './attribute';
import { Relation } from './relation';
import { ObjectSchema, Type } from './serialisation';
import { TransactionLog } from './transaction';

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
     * @param schema The attributes of the relation
     */
    public createRelation(name: string, schema: Array<Attribute>): void {
        if (!this.relations[name]) {
            this.relations[name] = this.relationConstructor(name, schema);
        } else {
            throw new Error(`Relation "${name}" already exists.`);
        }
    }

    /**
     * Access a given relation
     * @param rel The name of the relation to retrieve
     */
    public relation(rel: string): Relation {
        if (!!this.relations[rel]) {
            return this.relations[rel];
        } else {
            throw new Error(`Relation ${rel} does not exist in this database.`);
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
     * Closes the database
     */
    public close(): void { }

    protected abstract relationConstructor(name: string, schema: Array<Attribute>): Relation;
}

class DatabaseTemp extends Database {
    protected relationConstructor(name: string, schema: Array<Attribute>): Relation {
        return Relation.create(name, schema);
    }
}

interface ICreateTransaction {
    name: string;
    attrs: Array<IAttributeLike>;
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
        log.handle<ICreateTransaction>(DatabaseLogged.CREATION_ID, DatabaseLogged.CREATION_SCHEMA, tx => {
            const { name, attrs } = tx;
            const _attrs = attrs.map(attr => Attribute.from(attr));
            super.createRelation(name, _attrs);
        });
        log.load();
    }

    public createRelation(name: string, schema: Array<Attribute>): void {
        super.createRelation(name, schema);
        this.log.write<ICreateTransaction>(DatabaseLogged.CREATION_ID, { name: name, attrs: schema });
    }

    public close(): void {
        this.log.close();
    }

    protected relationConstructor(name: string, schema: Array<Attribute>): Relation {
        return Relation.create(name, schema, { log: this.log });
    }
}