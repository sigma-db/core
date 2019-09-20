import { Attribute, Database, ISchema, Relation } from "../../database";
import { IAtom, ISelectQuery, IVariableValue, TupleType, ValueType } from "../../query";
import { ISelectQueryProcessor } from "../query-processor";
import { Projection } from "./projection";
import { TetrisJoin } from "./tetris-join";

export class GeometricSelectProcessor implements ISelectQueryProcessor {
    public evaluate(query: ISelectQuery, db: Database): Relation {
        const [valset, atoms] = this.resolve(query.body, db.schema);
        const queryAttrs = query.exports as IVariableValue[];
        const schema = queryAttrs.map(({ attr, val }) => Attribute.create(attr, valset.get(val).type, valset.get(val).width));
        const prjSchema = queryAttrs.map(({ val }) => valset.get(val).id);

        const joined = TetrisJoin.execute(atoms, valset);
        const projected = Projection.execute(joined, prjSchema);
        const result = Relation.from(query.name, schema, projected);

        return result.freeze();
    }

    private resolve(cqatoms: IAtom[], schema: ISchema): [FreeTuple, IAtom[]] {
        const valset = new FreeTuple();
        const atoms = cqatoms.map(atom => {
            if (atom.tuple.type === TupleType.UNNAMED) {
                return {
                    rel: schema[atom.rel],
                    vars: atom.tuple.values.map((v, i) => {
                        const { type, width } = schema[atom.rel].schema[i];
                        if (v.type === ValueType.VARIABLE) {
                            return valset.variable(type, width, v.name);
                        } else {
                            throw new Error("Constants are not yet supported!");
                        }
                    }),
                };
            } else {
                const { rel, tuple } = atom;
                return {
                    rel: schema[atom.rel],
                    vars: schema[rel].schema.map(spec => {
                        const v = tuple.values.find(val => val.attr === spec.name).value;
                        if (!v) {
                            return valset.variable(spec.type, spec.width);
                        } else if (v.type === ValueType.VARIABLE) {
                            return valset.variable(spec.type, spec.width, v.name);
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
