import { Database, Relation } from "../database";

export interface IQuery {
    execute(db: Database): Relation | void;
}
