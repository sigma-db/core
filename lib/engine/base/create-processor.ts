import { Attribute, Database } from "../../database";
import { CreateQuery } from "../../query/query";
import { ICreateProcessor } from "../processor";

export class CreateProcessor implements ICreateProcessor {
    public evaluate(query: CreateQuery, db: Database): void {
        db.createRelation(query.rel, query.attrs.map(spec => Attribute.from(spec)));
    }
}
