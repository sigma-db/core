import { Database, Relation } from "../database";
import { ICreateQuery, IInfoQuery, IInsertQuery, ISelectQuery, TQuery } from "../query/query";

export interface IProcessor<Q extends TQuery, R extends Relation | void> {
    evaluate(query: Q, db: Database): R;
}

export interface ICreateProcessor extends IProcessor<ICreateQuery, void> { }

export interface IInsertProcessor extends IProcessor<IInsertQuery, void> { }

export interface IInfoProcessor extends IProcessor<IInfoQuery, Relation> { }

export interface ISelectProcessor extends IProcessor<ISelectQuery, Relation> { }
