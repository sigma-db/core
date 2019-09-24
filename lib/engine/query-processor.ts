import { Database, Relation } from "../database";
import { ICreateQuery, IInfoQuery, IInsertQuery, ISelectQuery, TQuery } from "../query";

export interface IQueryProcessor<Q extends TQuery, R extends Relation | void> {
    evaluate(query: Q, db: Database): R;
}

export interface ICreateQueryProcessor extends IQueryProcessor<ICreateQuery, void> { }

export interface IInsertQueryProcessor extends IQueryProcessor<IInsertQuery, void> { }

export interface IInfoQueryProcessor extends IQueryProcessor<IInfoQuery, Relation> { }

export interface ISelectQueryProcessor extends IQueryProcessor<ISelectQuery, Relation> { }
