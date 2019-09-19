import { Variable2 } from "../query/tuple";

export class FreeTuple {
    private count: number = 0;
    private readonly vars: { [name: string]: Variable2 } = {};

    public variable(type: DataType, width: number, name: string = `@${this.count}`): Variable2 {
        this.vars[name] = this.vars[name] || new Variable2(this.count++, type, width);
        return this.vars[name];
    }

    public get(name: string): Variable2 {
        return this.vars[name];
    }

    public schema(): Attribute[] {
        return Object.entries(this.vars).sort(([, v], [, w]) => v.id - w.id).map(([name, cqvar]) => Attribute.create(name, cqvar.type, cqvar.width));
    }

    public variables(): Variable2[] {
        return Object.entries(this.vars).sort(([, v], [, w]) => v.id - w.id).map(([, cqvar]) => cqvar);
    }
}
