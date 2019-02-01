import { Box } from "../../database";

export class JoinOperator {
    /**
     * Evaluates a join query using the tetris join algorithm.
     * @param q The query to evaluate.
     * @todo Infer optimal SAO from Q's query graph using a tree decomposition
     */
    /*private select(q: SelectQuery): Relation {
        const R: Relation = Relation.create(q.export, false);
        const A: CDS = new CDS();
        const all: Box = Box.all(q.SAO.length); // a box covering the entire space

        let probe = (b: Box): [boolean, Box] => {
            const a = A.witness(b);
            if (!!a) {
                return [true, a];
            }
            else if (b.isTuple()) {
                return [false, b];
            }
            else {
                let [b1, b2] = b.split();

                let [v1, w1] = probe(b1);
                if (!v1) {
                    return [false, w1];
                }
                else if (w1.contains(b)) {
                    return [true, w1];
                }

                let [v2, w2] = probe(b2);
                if (!v2) {
                    return [false, w2];
                }
                else if (w2.contains(b)) {
                    return [true, w2];
                }

                let w = w1.resolve(w2);
                A.insert(w);
                return [true, w];
            }
        }

        let [v, w] = probe(all);
        while (!v) {
            let B = this.gaps(q, w.tuple());
            if (B.length == 0) {
                R.insert(w.tuple());
                B = [w];
            }
            A.insert(...B);
            [v, w] = probe(all);
        }

        return R;
    }*/

    /*public gaps(q: SelectQuery, t: Point): Box[] {
        let C: Box[] = new Array<Box>();
        q.atoms.forEach(atom => {
            const { rel, vals } = atom;
            let _t = Point.from(q.variables(rel).map(v => t.at(q.SAO.indexOf(v))));
            let B = this.relations[rel].gaps(_t).map(b => new Box(q.SAO.map(v => {
                let pos = q.variables(rel).indexOf(v);
                return pos < 0 ? WILDCARD : b.at(pos);
            })));
            C.push(...B);
        });
        return C;
    }*/
}
