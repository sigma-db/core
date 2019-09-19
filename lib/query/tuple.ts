import { Literal, Value } from "./value";

type TType = "named" | "unnamed";
type TComponent<V extends Value, N extends TType> = N extends "unnamed" ? V : { attr: string, val: V };

class Tuple<V extends Value, N extends TType> {
    protected constructor(private readonly _values: Array<TComponent<V, N>>) { }

    public get values(): Array<TComponent<V, N>> {
        return this._values;
    }

    public isNamed(): this is Tuple<V, "named"> {
        return this._values.length > 0 && typeof this._values[0] !== "bigint";
    }
}

export type TLiteralTuple = Tuple<Literal, TType>;
export type TTuple = Tuple<Value, TType>;
