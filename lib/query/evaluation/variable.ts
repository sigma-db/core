import { Attribute, DataType } from "../../database";

export class Variable {
    constructor(private _id: number, private _type: DataType, private _width: number) { }

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

export class ValueSet {
    private count: number = 0;
    private vars: { [name: string]: Variable } = {};

    public variable(type: DataType, width: number, name: string = `@${this.count}`): Variable {
        this.vars[name] = this.vars[name] || new Variable(this.count++, type, width);
        return this.vars[name];
    }

    public get(name: string): Variable {
        return this.vars[name];
    }

    public schema(): Array<Attribute> {
        return Object.entries(this.vars).sort(([, v], [, w]) => v.id - w.id).map(([name, cqvar]) => Attribute.create(name, cqvar.type, cqvar.width));
    }

    public variables(): Array<Variable> {
        return Object.entries(this.vars).sort(([, v], [, w]) => v.id - w.id).map(([, cqvar]) => cqvar);
    }
}
