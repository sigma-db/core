import { Attribute, DataType } from "../database";

export class Variable {
    constructor(private readonly _id: number, private readonly _type: DataType, private readonly _width: number) { }

    public get id(): number {
        return this._id;
    }

    public get type(): DataType {
        return this._type;
    }

    public get width(): number {
        return this._width;
    }
}
