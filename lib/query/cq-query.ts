import { parse, ICreateCQ, IInsertCQ, ISelectCQ, ICQ, QueryType, TupleType, INamedValue, Literal } from "./parsers/cq";
import { Query, CreateQuery, InsertQuery, SelectQuery } from "./query";
import { Tuple } from "../database";

export const isCreateCQ = (q: ICQ): q is ICreateCQ => q.type === QueryType.CREATE;
export const isInsertCQ = (q: ICQ): q is IInsertCQ => q.type === QueryType.INSERT;
export const isSelectCQ = (q: ICQ): q is ISelectCQ => q.type === QueryType.SELECT;

export const isVariableValue = (v: Value): v is VariableValue => v.type === ValueType.VARIABLE;
export const isLiteralValue = (v: Value): v is LiteralValue => v.type === ValueType.LITERAL;

export const isNamedTuple = (t: Tuple): a is Named => a.type === TupleType.NAMED;
export const isUnnamedAtom = (a: Atom): a is UnnamedAtom => a.type === TupleType.UNNAMED;

export default class CQQuery {
    public static parse(q: string): Query {
        const _q = parse(q);
        if (isCreateCQ(_q)) {
            return <CreateQuery>{
                type: QueryType.CREATE,
                rel: _q.rel,
                attrs: _q.attrs
            };
        } else if (isInsertCQ(_q)) {
            const tuple = _q.tuple.type == TupleType.NAMED ? (<INamedValue<Literal>[]>_q.tuple.vals).map()
            return <InsertQuery>{
                type: QueryType.INSERT,
                rel: _q.rel,
                tuple: _q.tuple.type == TupleType.UNNAMED ? _q.tuple.vals.map(v => v.val)
            };
        } else if (isSelectCQ(_q)) {
            return <SelectQuery>{
                type: QueryType.SELECT,
                name: _q.name,
                attrs: _q.attrs,
                SAO: _q.head.vals.map(v => (<VariableValue>v.val).val),
                atoms: _q.body.map(atom => <Atom>{rel: atom.rel})
            };
        }
    }
}
