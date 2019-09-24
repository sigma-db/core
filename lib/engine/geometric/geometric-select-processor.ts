import { Attribute, Database, ISchema, Relation } from "../../database";
import { IAtom, ISelectQuery, IVariableValue, TupleType, ValueType } from "../../query";
import { ISelectQueryProcessor } from "../query-processor";
import { VariableSet } from "../variable-set";
import { Projection } from "./projection";
import { IResolvedAtom, TetrisJoin } from "./tetris-join";

export class GeometricSelectProcessor implements ISelectQueryProcessor {
    public evaluate(query: ISelectQuery, db: Database): Relation {
        const [vars, atoms] = this.resolve(query.body, db.schema);
        const queryAttrs = query.exports as Array<{ attr: string, value: IVariableValue }>;
        const schema = queryAttrs.map(({ attr, value }) => Attribute.create(attr, vars.get(value.name).type, vars.get(value.name).width));
        const prjSchema = queryAttrs.map(({ value }) => vars.get(value.name).id);

        const joined = TetrisJoin.execute(atoms, vars);
        const projected = Projection.execute(joined, prjSchema);
        const result = Relation.from(query.name, schema, projected);

        return result.freeze();
    }

    private resolve(cqatoms: IAtom[], schema: ISchema): [VariableSet, IResolvedAtom[]] {
        const valset = new VariableSet();
        const atoms = cqatoms.map(({ rel, tuple }) => {
            if (tuple.type === TupleType.UNNAMED) {
                return {
                    rel: schema[rel],
                    vars: tuple.values.map((v, i) => {
                        const { type, width } = schema[rel].schema[i];
                        if (v.type === ValueType.VARIABLE) {
                            return valset.variable(type, width, v.name);
                        } else {
                            throw new Error("Constants are not yet supported!");
                        }
                    }),
                };
            } else {
                return {
                    rel: schema[rel],
                    vars: schema[rel].schema.map(spec => {
                        const v = tuple.values.find(val => val.attr === spec.name);
                        if (!v) {
                            return valset.variable(spec.type, spec.width);
                        } else if (v.value.type === ValueType.VARIABLE) {
                            return valset.variable(spec.type, spec.width, v.value.name);
                        } else {
                            throw new Error("Constants are not yet supported!");
                        }
                    }),
                };
            }
        });
        return [valset, atoms];
    }
}
