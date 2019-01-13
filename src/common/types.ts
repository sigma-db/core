export type Tuple = number[];
export type Relation = Tuple[];
export type Database = { [name: string]: Relation };    // relation name --> relation
export type QueryFunction = (db: Database) => Relation;
