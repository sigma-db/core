import { Database, Relation } from "../database";
import { IComparable } from "../util";
import { ICreateCQ, IInsertCQ, ISelectCQ, parse, ITuple, INamedValue } from "./parsers/cq";
import { IQuery } from "./iquery";

enum QueryType { CREATE = "create", INSERT = "insert", SELECT = "select" }
enum TupleType { NAMED = "named", UNNAMED = "unnamed" }

class CQVariable implements IComparable<CQVariable> {
    constructor(private id: number) { }

    public compareTo(other: CQVariable): number {
        return this.id - other.id;
    }
}

class CQLiteral {
    private constructor(private _value: number) { }

    public static from(value: number): CQLiteral {
        return new CQLiteral(value);
    }

    public get value(): number {
        return this._value;
    }
}

class CQVariableSet {
    private count: number = 0;
    private vars: { [name: string]: CQVariable } = {};

    public get(name: string = `@${this.count}`): CQVariable {
        this.vars[name] = this.vars[name] || new CQVariable(this.count++);
        return this.vars[name];
    }
}

class CreateCQ implements IQuery {
    constructor(private query: ICreateCQ) { }

    public execute(db: Database): Relation | void {
        db.createRelation(this.query.rel, this.query.attrs);
    }
}

class InsertCQ implements IQuery {
    constructor(private query: IInsertCQ) { }

    public execute(db: Database): Relation | void {
        if (this.query.tuple.type == TupleType.UNNAMED) {
            const tuple = this.query.tuple;
            const raw = tuple.vals.map(v => v.val);
            db.insert(this.query.rel, raw);
        } else {
            const tuple = <ITuple<INamedValue<number>>>this.query.tuple;
            const raw = db.relationSchema(this.query.rel).map(attr => tuple.vals.find(val => val.attr === attr.name).val);
            db.insert(this.query.rel, raw);
        }
    }
}

class SelectCQ implements IQuery {
    constructor(private query: ISelectCQ) { }

    public execute(db: Database): Relation | void {
    }
}

export class CQQuery {
    public static parse(q: string): IQuery {
        const _q = parse(q);
        switch (_q.type) {
            case QueryType.CREATE: return new CreateCQ(<ICreateCQ>_q);
            case QueryType.INSERT: return new InsertCQ(<IInsertCQ>_q);
            case QueryType.SELECT: return new SelectCQ(<ISelectCQ>_q);
            default: throw new Error("Unsupported query type.");
        }
    }
}
