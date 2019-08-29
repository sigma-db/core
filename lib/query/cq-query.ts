import { Query } from ".";
import { ICreateCQ, IInfoCQ, IInsertCQ, ISelectCQ, parse, QueryType } from "./parsers/cq";

export class CQQuery {
    public static parse(q: string): Query {
        const _q = parse(q);
        switch (_q.type) {
            case QueryType.CREATE: return new CreateCQ(_q as ICreateCQ);
            case QueryType.INSERT: return new InsertCQ(_q as IInsertCQ);
            case QueryType.SELECT: return new SelectCQ(_q as ISelectCQ);
            case QueryType.INFO: return new InfoCQ(_q as IInfoCQ);
            default: throw new Error("Unsupported query type.");
        }
    }
}
