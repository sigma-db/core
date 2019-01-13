import { Database, QueryFunction, Relation, WILDCARD } from './common';
import Index from './database/array';
import Box from './box';
import CDS from './cds';
import { Query, QueryType } from './query';

/**
 * Generates the knowledge base for a given database D
 * @param D The database
 */
function gaps(Q: Query, D: Database): CDS {
    let C: CDS = new CDS();
    Q.relations.forEach(R => {
        let I = Index.create(D[R]);
        let _B = I.gaps().map(b => new Box(Q.SAO.map(v => {
            let pos = Q.variables(R).indexOf(v);
            return pos < 0 ? WILDCARD : b.at(pos);
        })));
        C.insert(..._B);
    });
    return C;
}

/**
 * Creates a database instance from the given specification
 * @param D The specification of the databases content
 */
export function database(D: Database): Database {
    return D;
}

/**
 * Given a join query against some schema S, returns a query function applicable to S-databases
 * @param Q The join query
 * @param lang The language of the query. Defaults to CQ.
 * @todo Infer optimal SAO from Q's query graph using a tree decomposition
 */
export function query(Q: string, lang: QueryType = QueryType.CQ): QueryFunction {
    const _Q: Query = Query.parse(Q, lang);
    const all: Box = Box.all(_Q.SAO.length);     // a box covering the entire space

    return (D: Database): Relation => {
        const result: Relation = [];
        const A: CDS = new CDS();
        const B: CDS = gaps(_Q, D);

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
            let _B = B.witnessAll(w);
            if (_B.length == 0) {
                result.push(w.tuple());
                _B = [w];
            }
            A.insert(..._B);
            [v, w] = probe(all);
        }

        return result;
    };
}
