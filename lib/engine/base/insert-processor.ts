import { Database, Tuple } from "../../database";
import { InsertQuery } from "../../query/query";
import { IInsertProcessor } from "../processor";

export class InsertProcessor implements IInsertProcessor {
    public evaluate(query: InsertQuery, db: Database): void {
        let raw: Literal[];
        if (query.tuple.type === TupleType.UNNAMED) {
            const tuple = query.tuple;
            raw = tuple.vals.map(v => v.val);
        } else {
            const { vals } = query.tuple as ITupleCQ<INamedValueCQ<Literal>>;
            raw = db.relation(query.rel).schema.map(attr => vals.find(val => val.attr === attr.name).val);
        }
        const _tuple = Tuple.from(raw);
        db.relation(query.rel).insert(_tuple);
    }
}
