class Value {
    constructor(private readonly type: "variable" | "literal") { }

    public isVariable(): this is Variable {
        return this.type === "variable";
    }
}

class Variable extends Value {
    constructor(private readonly _id: number) {
        super("variable");
    }

    public get id(): number {
        return this._id;
    }
}

class Literal extends Value {
    constructor(private readonly _value: bigint) {
        super("literal");
    }

    public get value(): bigint {
        return this._value;
    }
}

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

// export class Variable2 {
//     constructor(private readonly _id: number, private readonly _type: DataType, private readonly _width: number) { }

//     public get id(): number {
//         return this._id;
//     }

//     public get type(): DataType {
//         return this._type;
//     }

//     public get width(): number {
//         return this._width;
//     }
