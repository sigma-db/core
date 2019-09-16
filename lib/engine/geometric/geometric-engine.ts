import { Attribute, Database, ISchema, Relation } from "../../database";
import { IAtom } from "../../query/atom";
import { IAtomCQ, INamedValueCQ, VariableName } from "../../query/parsers/cq";
import { FreeTuple } from "../../query/tuple";
import { ISelectProcessor } from "../processor";
import { Projection, TetrisJoin } from "./operators";
import { SelectQuery } from "../../query/query";

enum TupleType { NAMED = "named", UNNAMED = "unnamed" }
enum ValueType { LITERAL = "literal", VARIABLE = "variable" }

export class GeometricSelectProcessor implements ISelectProcessor {
    private static readonly JOIN = new TetrisJoin();
    private static readonly PROJECT = new Projection();

    public evaluate(query: SelectQuery, db: Database): Relation {
        const [valset, atoms] = this.resolve(query.body, db.schema);
        const queryAttrs = query.exports as Array<INamedValueCQ<VariableName>>;
        const schema = queryAttrs.map(({ attr, val }) => Attribute.create(attr, valset.get(val).type, valset.get(val).width));
        const prjSchema = queryAttrs.map(({ val }) => valset.get(val).id);

        const joined = GeometricSelectProcessor.JOIN.execute(atoms, valset);
        const projected = GeometricSelectProcessor.PROJECT.execute(joined, prjSchema);
        const result = Relation.from(query.name, schema, projected);

        return result.freeze();
    }

    private resolve(cqatoms: IAtomCQ[], schema: ISchema): [FreeTuple, IAtom[]] {
        const valset = new FreeTuple();
        const atoms = cqatoms.map(atom => {
            if (atom.type === TupleType.UNNAMED) {
                return {
                    rel: schema[atom.rel],
                    vars: atom.vals.map((v, i) => {
                        const { type, width } = schema[atom.rel].schema[i];
                        if (v.type === ValueType.VARIABLE) {
                            return valset.variable(type, width, v.val as string);
                        } else {
                            throw new Error("Constants are not yet supported!");
                        }
                    }),
                };
            } else {
                const { rel, vals } = atom;
                return {
                    rel: schema[atom.rel],
                    vars: schema[rel].schema.map(spec => {
                        const v = vals.find(val => (val as INamedValueCQ<VariableName>).attr === spec.name);
                        if (!v) {
                            return valset.variable(spec.type, spec.width);
                        } else if (v.type === ValueType.VARIABLE) {
                            return valset.variable(spec.type, spec.width, v.val as string);
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
