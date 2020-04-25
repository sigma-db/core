import { DataType } from "../database";

export class TypedVariable {
    public static create(id: number, type: DataType, width: number) {
        return new TypedVariable(id, type, width);
    }

    private constructor(
        private readonly _id: number,
        private readonly _type: DataType,
        private readonly _width: number) {
    }

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
