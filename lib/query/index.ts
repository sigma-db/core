import { Database, Relation } from '../database';

export { Query } from './query';
export interface IQuery {
    execute(db: Database): Relation | void;
}
