import { Attribute, Box, Tuple } from "../database";
import { SkipList } from "../util";
import { CDS } from "./cds";
import { ResolvedAtom, ResolvedVariable, VariableSet } from "./resolver";

export class TetrisJoin {
    public static execute(atoms: ResolvedAtom[], values: VariableSet): SkipList<Tuple> {
        return new TetrisJoin(values).execute(atoms);
    }

    private readonly kb: CDS;
    private readonly schema: Attribute[];
    private readonly variables: ResolvedVariable[];
    private readonly wildcard: Array<bigint>;

    constructor(values: VariableSet) {
        this.kb = new CDS();
        this.schema = values.schema();
        this.variables = values.variables();
        this.wildcard = this.schema.map(attr => attr.wildcard);
    }

    private execute(atoms: ResolvedAtom[]): SkipList<Tuple> {
        const all = Box.from(this.wildcard);
        const result = new SkipList<Tuple>();

        let [v, w] = this.probe(all);
        while (!v) {
            const tuple = w.tuple(this.schema);
            const gapsCnt = this.gaps(atoms, tuple);
            if (gapsCnt === 0) {
                result.insert(tuple);
                this.kb.insert(w);
            }
            [v, w] = this.probe(all);
        }

        return result;
    }

    private gaps(atoms: ResolvedAtom[], tuple: Tuple): number {
        let gapsCnt = 0;
        for (const { rel, vars } of atoms) {
            const _tuple = vars.map(v => tuple[this.variables.indexOf(v)]);
            for (const box of rel.gaps(Tuple.from(_tuple))) {
                const _box = Box.from(this.variables.map((v, i) => {
                    const pos = vars.indexOf(v);
                    return pos < 0 ? this.wildcard[i] : box[pos];
                }));
                this.kb.insert(_box);
                gapsCnt++;
            }
        }
        return gapsCnt;
    }

    private probe(b: Box): [boolean, Box] {
        const a = this.kb.witness(b);
        if (!!a) {
            return [true, a];
        } else if (b.isTuple(this.schema)) {
            return [false, b];
        } else {
            const [b1, b2] = b.split(this.schema);

            const [v1, w1] = this.probe(b1);
            if (!v1) {
                return [false, w1];
            } else if (w1.contains(b)) {
                return [true, w1];
            }

            const [v2, w2] = this.probe(b2);
            if (!v2) {
                return [false, w2];
            } else if (w2.contains(b)) {
                return [true, w2];
            }

            const w = w1.resolve(w2);
            this.kb.insert(w);
            return [true, w];
        }
    }
}
