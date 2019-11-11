import { SigmaError } from "../util";
import { Attribute } from "./attribute";
import { Tuple } from "./tuple";

export class DuplicateTupleError extends SigmaError {
    constructor(private readonly _rel: string, private readonly _tuple: Tuple, private readonly _schema: Attribute[]) {
        super(`Relation "${_rel}" already contains a tuple ${_tuple.toString(_schema)}.`);
    }

    public get relation(): string {
        return this._rel;
    }

    public get tuple(): string {
        return this._tuple.toString(this._schema);
    }
}

export class ValueOutOfLimitsError extends SigmaError {
    constructor(_rel: string, _tuple: Tuple, _schema: Attribute[], _pos: number) {
        const value = _schema[_pos].valueOf(_tuple[_pos]);
        const tupleStr = _tuple.toString(_schema);
        const attrName = _schema[_pos].name;
        const { max, width } = _schema[_pos];

        if (typeof value === "string") {
            super(`Value ${value} in ${_rel}${tupleStr} exceeds maximum string length for attribute "${attrName}" (maximum is ${width}).`);
        } else {
            super(`Value ${value} in ${_rel}${tupleStr} exceeds value limit for attribute "${attrName}" (maximum is ${max}).`);
        }
    }
}

export class ArityMismatchError extends SigmaError {
    constructor(_rel: string, _tuple: Tuple, _schema: Attribute[]) {
        super(`Relation ${_rel} has arity ${_schema.length}, but given tuple ${_tuple.toString(_schema)} has arity ${_tuple.length}.`);
    }
}

export class UnsupportedOperationError extends SigmaError { }
