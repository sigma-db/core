import { Attribute, Box, Database, Tuple } from "../../database";
import { SkipList } from "../../util";
import { Variable } from "../variable";
import { CDS } from "./cds";

interface Atom {
    rel: string;
    vars: Array<Variable>;
}

export class Tetris {
    private kb: CDS;
    private wildcard: Array<bigint>;

    constructor(private db: Database, private schema: Array<Attribute>) {
        this.kb = new CDS();
        this.wildcard = schema.map(attr => attr.wildcard);
    }

    private gaps(atoms: Array<Atom>, tuple: Tuple, SAO: Array<Variable>): number {
        let gapsCnt = 0;
        atoms.forEach(atom => {
            const { rel, vars } = atom;
            const _tuple = vars.map(v => tuple[SAO.indexOf(v)]);
            this.db.relation(rel).gaps(Tuple.from(_tuple)).forEach(box => {
                const _box = Box.from(SAO.map((v, i) => {
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

    public evaluate(head: Array<Variable>, variables: Array<Variable>, atoms: Array<Atom>): SkipList<Tuple> {
        const SAO = variables;
        const all = Box.from(this.schema.map(attr => attr.wildcard));
        const result = new SkipList<Tuple>(4, 0.25, false);

        let [v, w] = this.probe(all);
        while (!v) {
            const tuple = w.tuple(this.schema);
            const gapsCnt = this.gaps(atoms, tuple, SAO);
            if (gapsCnt == 0) {
                result.insert(Tuple.from(head.map(v => tuple[SAO.indexOf(v)])));
                this.kb.insert(w);
            }
            [v, w] = this.probe(all);
        }

        return result;
    }
}
