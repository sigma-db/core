import { Database, Relation } from "../database";
import { CreateQuery, InfoQuery, InsertQuery, Query, SelectQuery } from "../query/query";

export interface IProcessor<Q extends Query, R = Relation | void> {
    evaluate(query: Q, db: Database): R;
}

export interface ICreateProcessor extends IProcessor<CreateQuery, void> { }

export interface IInsertProcessor extends IProcessor<InsertQuery, void> { }

export interface IInfoProcessor extends IProcessor<InfoQuery, Relation> { }

export interface ISelectProcessor extends IProcessor<SelectQuery, Relation> { }
