import { Attribute, Database, DataType, Relation, Tuple } from "../../database";
import { InfoQuery } from "../../query/query";
import { IInfoProcessor } from "../processor";

export class InfoProcessor implements IInfoProcessor {
    private static readonly DATABASE_SCHEMA = [
        Attribute.create("Relation", DataType.STRING, 32),
        Attribute.create("Arity", DataType.INT),
        Attribute.create("Cardinality", DataType.INT),
        Attribute.create("Logged", DataType.BOOL),
        Attribute.create("Static", DataType.BOOL),
    ];
    private static readonly RELATION_SCHEMA = [
        Attribute.create("Attribute", DataType.STRING, 32),
        Attribute.create("Data Type", DataType.STRING, 8),
        Attribute.create("Width", DataType.INT),
    ];

    public evaluate(query: InfoQuery, db: Database): Relation {
        let result: Relation;
        if (!query.rel) {
            result = Relation.create("Database Schema", InfoProcessor.DATABASE_SCHEMA);
            Object.entries(db.schema).forEach(([, rel]) => {
                const tuple = Tuple.create([rel.name, rel.arity, rel.size, rel.isLogged, rel.isStatic]);
                result.insert(tuple);
            });
        } else {
            result = Relation.create(`Relation Schema of "${query.rel}"`, InfoProcessor.RELATION_SCHEMA);
            db.relation(query.rel).schema.forEach(attr => {
                const tuple = Tuple.create([attr.name, attr.type, attr.width]);
                result.insert(tuple);
            });
        }
        return result.freeze();
    }
}
