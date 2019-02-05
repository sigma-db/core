import { Database, Relation } from '../database';

export * from './query';

export interface IQuery {
    execute(db: Database): Relation | void;
}
