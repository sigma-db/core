export class Value {
    protected constructor(private readonly type: "variable" | "literal") { }

    public isVariable(): this is Variable {
        return this.type === "variable";
    }

    public isLiteral(): this is Literal {
        return this.type === "literal";
    }
}

export class Variable extends Value {
    public static create(id: number): Variable {
        return new Variable(id);
    }

    private constructor(private readonly _id: number) {
        super("variable");
    }

    public get id(): number {
        return this._id;
    }
}

export class Literal extends Value {
    public static create(value: bigint): Literal {
        return new Literal(value);
    }

    private constructor(private readonly _value: bigint) {
        super("literal");
    }

    public get value(): bigint {
        return this._value;
    }
}
