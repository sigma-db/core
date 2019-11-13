import { Attribute, IAttributeLike } from "./attribute";
import { Relation } from "./relation";
import { ObjectSchema, Type } from "./serialisation";
import { TransactionLog } from "./transaction";

export interface DatabaseSchema {
    [name: string]: Relation;
}

export class Database {
    /**
     * Opens an existing database stored at the specified location
     * or creates a new one if it does not yet exist.
     */
    public static open(path: string): Database {
        const log = TransactionLog.open(path);
        return new LoggedDatabase(log);
    }

    /**
     * Creates a temporary database with no logging to disk.
     */
    public static temp(): Database {
        return new Database();
    }

    protected readonly relations: DatabaseSchema = {};

    protected constructor() { }

    /**
     * Whether modification to this instance are logged
     */
    public get isLogged(): boolean {
        return this instanceof LoggedDatabase;
    }

    /**
     * Whether this instance overlays another database object
     */
    public get isOverlay(): boolean {
        return this instanceof OverlayDatabase;
    }

    /**
     * The current schema of the database
     */
    public get schema(): DatabaseSchema {
        return Object.assign({}, this.relations);
    }

    /**
     * Adds an existing relation to the database
     * @param rel The relation object
     */
    public addRelation(rel: Relation): void {
        if (!this.hasRelation(rel.name)) {
            this.relations[rel.name] = rel;
        } else {
            throw new Error(`Relation "${rel.name}" already exists.`);
        }
    }

    /**
     * Creates a new relation
     * @param name The name of the relation
     * @param schema The attributes of the relation
     */
    public createRelation(name: string, schema: Attribute[]): void {
        this.addRelation(this.relationConstructor(name, schema));
    }

    /**
     * Checks whether a relation of name `rel` already exists on this database.
     * @param name The relation name to check
     */
    public hasRelation(name: string): boolean {
        return name in this.relations;
    }

    /**
     * Access a given relation
     * @param name The name of the relation to retrieve
     */
    public getRelation(name: string): Relation {
        if (name in this.relations) {
            return this.relations[name];
        } else {
            throw new Error(`Relation ${name} does not exist in this database.`);
        }
    }

    /**
     * Creates an overlay on top of this database, sharing the same state,
     * but with any modification made to the overlay not being applied to the underlying database.
     */
    public overlay(): OverlayDatabase {
        return new OverlayDatabase(this);
    }

    /**
     * Closes the database
     */
    public close(): void { }

    protected relationConstructor(name: string, schema: Attribute[]): Relation {
        return Relation.create(name, schema);
    };
}

interface ICreateTransaction {
    name: string;
    attrs: IAttributeLike[];
}

class LoggedDatabase extends Database {
    private static readonly CREATION_ID = 0;
    private static readonly CREATION_SCHEMA = ObjectSchema.create(Type.OBJECT({
        name: Type.STRING,
        attrs: Type.ARRAY(Type.OBJECT({
            name: Type.STRING,
            type: Type.INT8,
            width: Type.INT16,
        })),
    }));

    constructor(private readonly log: TransactionLog) {
        super();
        log.handle<ICreateTransaction>(LoggedDatabase.CREATION_ID, LoggedDatabase.CREATION_SCHEMA, tx => {
            const { name, attrs } = tx;
            const _attrs = attrs.map(attr => Attribute.from(attr));
            super.createRelation(name, _attrs);
        });
        log.load();
    }

    public createRelation(name: string, schema: Attribute[]): void {
        super.createRelation(name, schema);
        this.log.write<ICreateTransaction>(LoggedDatabase.CREATION_ID, { name, attrs: schema });
    }

    public close(): void {
        this.log.close();
    }

    protected relationConstructor(name: string, schema: Attribute[]): Relation {
        return Relation.create(name, schema, { log: this.log });
    }
}

class OverlayDatabase extends Database {
    constructor(private readonly parent: Database) {
        super();
    }

    public getRelation(name: string): Relation {
        if (name in this.relations) {   // this db contains the given relation
            return this.relations[name];
        } else if (this.parent.hasRelation(name)) {     // an ancestor contains the given relation
            return this.parent.getRelation(name);
        } else {
            throw new Error(`Relation ${name} does not exist in this database.`);
        }
    }

    public hasRelation(name: string): boolean {
        return super.hasRelation(name) || this.parent.hasRelation(name);
    }
}
