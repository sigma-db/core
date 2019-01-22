import { parse } from "./parsers/cq";
import { CreateQuery, InsertQuery, Query, QueryType, SelectQuery } from "./query";

interface Atom {
    name: string;
    vars: string[];
}

interface QueryCQ {
    type: "create" | "insert" | "select";
}

interface CreateCQ extends QueryCQ {
    rel: string;
    attrs: string[];
}

interface InsertCQ extends QueryCQ {
    rel: string;
    tuple: string[];
}

interface SelectCQ extends QueryCQ {
    head: Atom;
    body: Atom[];
}

const isCreateCQ = (q: QueryCQ): q is CreateCQ => q.type === "create";
const isInsertCQ = (q: QueryCQ): q is InsertCQ => q.type === "insert";
const isSelectCQ = (q: QueryCQ): q is SelectCQ => q.type === "select";

export default class CQQuery {
    public static parse(q: string): Query {
        const _q = <QueryCQ>parse(q);
        if (isCreateCQ(_q)) {
            return <CreateQuery>{
                type: QueryType.CREATE,
                relation: _q.rel,
                attributes: _q.attrs
            };
        } else if (isInsertCQ(_q)) {
            return <InsertQuery>{
                type: QueryType.INSERT,
                relation: _q.rel,
                tuple: _q.tuple
            };
        } else if (isSelectCQ(_q)) {
            return <SelectQuery>{
                type: QueryType.SELECT,
                SAO: _q.head.vars,
                relations: _q.body.map(atom => atom.name),
                variables: rel => _q.body.find(atom => atom.name === rel).vars
            };
        }
    }
}
