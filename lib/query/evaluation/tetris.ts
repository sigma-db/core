import { Box, Database, Relation } from "../../database";
import { WILDCARD } from "../../database/constants";
import { CDS } from "./cds";

interface CQAtomLegacy {
    rel: string;
    vars: number[];
}

export class Tetris {
    private kb: CDS;

    constructor(private db: Database) {
        this.kb = new CDS();
    }

    private gaps(atoms: Array<CQAtomLegacy>, tuple: number[], SAO: number[]): Box[] {
        const C = new Array<Box>();
        atoms.forEach(atom => {
            const { rel, vars } = atom;
            const _tuple = vars.map(v => tuple[SAO.indexOf(v)]);
            const B = this.db.relation(rel).gaps(_tuple).map(b => new Box(SAO.map(v => {
                const pos = vars.indexOf(v);
                return pos < 0 ? WILDCARD : b.at(pos);
            })));
            C.push(...B);
        });
        return C;
    }

    private probe(b: Box): [boolean, Box] {
        const a = this.kb.witness(b);
        if (!!a) {
            return [true, a];
        }
        else if (b.isPoint()) {
            return [false, b];
        }
        else {
            let [b1, b2] = b.split();

            let [v1, w1] = this.probe(b1);
            if (!v1) {
                return [false, w1];
            }
            else if (w1.contains(b)) {
                return [true, w1];
            }

            let [v2, w2] = this.probe(b2);
            if (!v2) {
                return [false, w2];
            }
            else if (w2.contains(b)) {
                return [true, w2];
            }

            let w = w1.resolve(w2);
            this.kb.insert(w);
            return [true, w];
        }
    }

    public evaluate(head: number[], body: Array<CQAtomLegacy>, result: Relation) {
        const SAO = [...new Set(body.flatMap(atom => atom.vars))];
        const all: Box = Box.all(SAO.length); // a box covering the entire space

        let [v, w] = this.probe(all);
        while (!v) {
            let B = this.gaps(body, w.point(), SAO);
            if (B.length == 0) {
                result.insert(head.map(v => w.point()[SAO.indexOf(v)]));
                B = [w];
            }
            this.kb.insert(...B);
            [v, w] = this.probe(all);
        }
    }
}
