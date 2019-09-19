import { parse, QueryType } from "./parsers/cq";
import { ICreateQuery, IInfoQuery, IInsertQuery, ISelectQuery, TQuery } from "./query-types";

export class CQQuery {
    public static parse(q: string): TQuery {
        const _q = parse(q);
        switch (_q.type) {
            case QueryType.CREATE: return _q as ICreateQuery;
            case QueryType.INSERT: return _q as IInsertQuery;
            case QueryType.SELECT: return _q as ISelectQuery;
            case QueryType.INFO: return _q as IInfoQuery;
            default: throw new Error("Unsupported query type.");
        }
    }
}
