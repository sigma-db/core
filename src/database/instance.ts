import { Attribute, AttributeLike } from "./attribute";
import { Relation } from "./relation";
import { ObjectSchema, Type } from "./serialisation";
import { TransactionLog } from "./transaction";

export interface Schema {
    [name: string]: Relation;
}

export interface InstanceOpts {
    path: string;
}

export class Instance {
    /**
     * Opens an existing database instance stored at the specified location
     * or creates a new one if it does not yet exist.
     */
    public static create(opts?: Partial<InstanceOpts>): Instance {
        if (!!opts?.path) {
            const log = TransactionLog.open(opts.path);
            return new LoggedInstance(log);
        } else {
            return new Instance();
        }
    }

    protected readonly relations: Schema = {};

    protected constructor() { }

    /**
     * Whether modification to this instance are logged
     */
    public get isLogged(): boolean {
        return this instanceof LoggedInstance;
    }

    /**
     * Whether this instance overlays another database instance object
     */
    public get isOverlay(): boolean {
        return this instanceof OverlayInstance;
    }

    /**
     * The current schema of the database instance
     */
    public get schema(): Schema {
        return Object.assign({}, this.relations);
    }

    /**
     * Adds an existing relation to the database instance
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
     * Checks whether relation `rel` exists on this database instance
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
            throw new Error(`Relation "${name}" does not exist.`);
        }
    }

    /**
     * Creates an overlay on top of this database instance, sharing the same state,
     * but with any modification made to the overlay not being applied to the underlying database instance.
     */
    public overlay(): OverlayInstance {
        return new OverlayInstance(this);
    }

    /**
     * Closes the database instance
     */
    public close(): void { }

    protected relationConstructor(name: string, schema: Attribute[]): Relation {
        return Relation.create(name, schema);
    };
}

interface ICreateTransaction {
    name: string;
    attrs: AttributeLike[];
}

class LoggedInstance extends Instance {
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
        log.handle<ICreateTransaction>(LoggedInstance.CREATION_ID, LoggedInstance.CREATION_SCHEMA, tx => {
            const { name, attrs } = tx;
            const _attrs = attrs.map(attr => Attribute.from(attr));
            super.createRelation(name, _attrs);
        });
        log.load();
    }

    public createRelation(name: string, schema: Attribute[]): void {
        super.createRelation(name, schema);
        this.log.write<ICreateTransaction>(LoggedInstance.CREATION_ID, { name, attrs: schema });
    }

    public close(): void {
        this.log.close();
    }

    protected relationConstructor(name: string, schema: Attribute[]): Relation {
        return Relation.create(name, schema, { log: this.log });
    }
}

class OverlayInstance extends Instance {
    constructor(private readonly parent: Instance) {
        super();
    }

    public getRelation(name: string): Relation {
        if (name in this.relations) {   // this db contains the given relation
            return this.relations[name];
        } else if (this.parent.hasRelation(name)) { // an ancestor contains the given relation
            return this.parent.getRelation(name);
        } else {
            throw new Error(`Relation ${name} does not exist in this database instance.`);
        }
    }

    public hasRelation(name: string): boolean {
        return super.hasRelation(name) || this.parent.hasRelation(name);
    }
}
