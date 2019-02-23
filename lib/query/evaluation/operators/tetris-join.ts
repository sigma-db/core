import { Attribute, Box, Tuple, Relation } from "../../../database";
import { SkipList } from "../../../util";
import { IAtom } from "../atom";
import { CDS } from "../cds";
import { ValueSet, Variable } from "../variable";

class TetrisJoinImpl {
    private kb: CDS;
    private schema: Array<Attribute>;
    private variables: Array<Variable>;
    private wildcard: Array<bigint>;

    constructor(values: ValueSet) {
        this.kb = new CDS();
        this.schema = values.schema();
        this.variables = values.variables();
        this.wildcard = this.schema.map(attr => attr.wildcard);
    }

    private gaps(atoms: Array<IAtom>, tuple: Tuple): number {
        let gapsCnt = 0;
        atoms.forEach(atom => {
            const { rel, vars } = atom;
            const _tuple = vars.map(v => tuple[this.variables.indexOf(v)]);
            rel.gaps(Tuple.from(_tuple)).forEach(box => {
                const _box = Box.from(this.variables.map((v, i) => {
                    const pos = vars.indexOf(v);
                    return pos < 0 ? this.wildcard[i] : box[pos];
                }));
                this.kb.insert(_box);
                gapsCnt++;
            });
        });
        return gapsCnt;
    }

    private probe(b: Box): [boolean, Box] {
        const a = this.kb.witness(b);
        if (!!a) {
            return [true, a];
        } else if (b.isTuple(this.schema)) {
            return [false, b];
        } else {
            let [b1, b2] = b.split(this.schema);

            let [v1, w1] = this.probe(b1);
            if (!v1) {
                return [false, w1];
            } else if (w1.contains(b)) {
                return [true, w1];
            }

            let [v2, w2] = this.probe(b2);
            if (!v2) {
                return [false, w2];
            } else if (w2.contains(b)) {
                return [true, w2];
            }

            let w = w1.resolve(w2);
            this.kb.insert(w);
            return [true, w];
        }
    }

    public execute(atoms: Array<IAtom>): SkipList<Tuple> {
        const all = Box.from(this.wildcard);
        const result = new SkipList<Tuple>();

        let [v, w] = this.probe(all);
        while (!v) {
            const tuple = w.tuple(this.schema);
            const gapsCnt = this.gaps(atoms, tuple);
            if (gapsCnt == 0) {
                result.insert(tuple);
                this.kb.insert(w);
            }
            [v, w] = this.probe(all);
        }

        return result;
    }
}

export class TetrisJoin {
    public execute(atoms: Array<IAtom>, values: ValueSet): SkipList<Tuple> {
        return new TetrisJoinImpl(values).execute(atoms);
    }
}
