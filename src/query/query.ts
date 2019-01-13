import QueryType from "./query-type";
import CQQuery from "./cq-query";
import SQLQuery from "./sql-query";

export default abstract class Query {
    /**
     * Turns the string representation of a join query into an internal object representation
     * @param Q The query to parse
     * @param lang The language of the query. Defaults to CQ.
     */
    public static parse(Q: string, lang: QueryType): Query {
        switch (lang) {
            case QueryType.CQ:
                return CQQuery.parse(Q);

            case QueryType.SQL:
                return SQLQuery.parse(Q);
        }
    }

    public abstract get SAO(): string[];

    public abstract get relations(): string[];

    public abstract variables(rel: string): string[];
}
