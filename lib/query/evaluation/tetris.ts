import { Box, Database, Relation, Tuple, Attribute } from "../../database";
import { CDS } from "./cds";

interface CQAtomLegacy {
    rel: string;
    vars: number[];
}

export class Tetris {
    private kb: CDS;

    constructor(private db: Database, private schema: Array<Attribute>) {
        this.kb = new CDS();
    }

    private gaps(atoms: Array<CQAtomLegacy>, tuple: Tuple, SAO: number[]): Box[] {
        const C = new Array<Box>();
        atoms.forEach(atom => {
            const { rel, vars } = atom;
            const _tuple = vars.map(v => tuple[SAO.indexOf(v)]);
            const B = this.db.relation(rel).gaps(Tuple.from(_tuple)).map(b => Box.from(SAO.map((v, i) => {
                const pos = vars.indexOf(v);
                return pos < 0 ? this.schema[i].wildcard : b[pos];
            })));
            C.push(...B);
        });
        return C;
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

    public evaluate(head: number[], body: Array<CQAtomLegacy>, result: Relation) {
        const SAO = this.schema.map((_, i) => i);
        const all = Box.from(this.schema.map(attr => attr.wildcard));

        let [v, w] = this.probe(all);
        while (!v) {
            const _tuple = w.tuple(this.schema);
            let B = this.gaps(body, _tuple, SAO);
            if (B.length == 0) {
                result.insert(Tuple.from(head.map(v => _tuple[SAO.indexOf(v)])));
                B = [w];
            }
            this.kb.insert(...B);
            [v, w] = this.probe(all);
        }
    }
}
