export class FreeTuple {
    private count: number = 0;
    private readonly vars: { [name: string]: Variable } = {};

    public variable(type: DataType, width: number, name: string = `@${this.count}`): Variable {
        this.vars[name] = this.vars[name] || new Variable(this.count++, type, width);
        return this.vars[name];
    }

    public get(name: string): Variable {
        return this.vars[name];
    }

    public schema(): Attribute[] {
        return Object.entries(this.vars).sort(([, v], [, w]) => v.id - w.id).map(([name, cqvar]) => Attribute.create(name, cqvar.type, cqvar.width));
    }

    public variables(): Variable[] {
        return Object.entries(this.vars).sort(([, v], [, w]) => v.id - w.id).map(([, cqvar]) => cqvar);
    }
}
