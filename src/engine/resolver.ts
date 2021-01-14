import * as Database from "../database";
import { Statement } from "../parser";

export interface ResolvedVariable {
    readonly id: number;
    readonly type: Database.DataType;
    readonly width: number;
}

export interface ResolvedAtom {
    readonly rel: Database.Relation;
    readonly vars: ResolvedVariable[];
}

export class VariableSet {
    private count: number = 0;
    private readonly vars: Map<string, ResolvedVariable> = new Map();

    public add(type: Database.DataType, width: number, name: string = `@${this.count}`): ResolvedVariable {
        if (!this.vars.has(name)) {
            this.vars.set(name, { id: this.count++, type, width });
            return this.vars.get(name);
        } else {
            const current = this.vars.get(name);
            if (current.type === type) {
                return current;
            } else {
                throw new Error(``);
            }
        }
    }

    public get(name: string): ResolvedVariable {
        return this.vars.get(name);
    }

    public schema(): Database.Attribute[] {
        return [...this.vars.entries()]
            .sort(([, v], [, w]) => v.id - w.id)
            .map(([name, v]) => Database.Attribute.create(name, v.type, v.width));
    }

    public variables(): ResolvedVariable[] {
        return [...this.vars.entries()]
            .sort(([, v], [, w]) => v.id - w.id)
            .map(([, tvar]) => tvar);
    }
}

export class Resolver {
    public static create(schema: Database.Schema) {
        return new Resolver(schema);
    }

    private constructor(private readonly schema: Database.Schema) { }

    public resolve(statement: Statement.SelectStatement): [VariableSet, ResolvedAtom[]] {
        const varset = new VariableSet();
        const atoms = statement.body.map(({ rel, tuple }) => {
            if (tuple.type === Statement.TupleType.UNNAMED) {
                return {
                    rel: this.schema[rel],
                    vars: tuple.values.map((v, i) => {
                        const { type, width } = this.schema[rel].schema[i];
                        if (v.type === Statement.ValueType.VARIABLE) {
                            return varset.add(type, width, v.name);
                        } else {
                            throw new Error("Constants are not supported!");
                        }
                    }),
                };
            } else {
                return {
                    rel: this.schema[rel],
                    vars: this.schema[rel].schema.map(spec => {
                        const v = tuple.values.find(val => val.attr === spec.name);
                        if (!v) {
                            return varset.add(spec.type, spec.width);
                        } else if (v.value.type === Statement.ValueType.VARIABLE) {
                            return varset.add(spec.type, spec.width, v.value.name);
                        } else {
                            throw new Error("Constants are not supported!");
                        }
                    }),
                };
            }
        });
        return [varset, atoms];
    }
}
