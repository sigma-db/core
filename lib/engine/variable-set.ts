import { Attribute, DataType } from "../database";
import { TypedVariable } from "./typed-variable";

export class VariableSet {
    private count: number = 0;
    private readonly vars: { [name: string]: TypedVariable } = {};

    public variable(type: DataType, width: number, name: string = `@${this.count}`): TypedVariable {
        this.vars[name] = this.vars[name] || TypedVariable.create(this.count++, type, width);
        return this.vars[name];
    }

    public get(name: string): TypedVariable {
        return this.vars[name];
    }

    public schema(): Attribute[] {
        return Object.entries(this.vars).sort(([, v], [, w]) => v.id - w.id).map(([name, cqvar]) => Attribute.create(name, cqvar.type, cqvar.width));
    }

    public variables(): TypedVariable[] {
        return Object.entries(this.vars).sort(([, v], [, w]) => v.id - w.id).map(([, cqvar]) => cqvar);
    }
}
