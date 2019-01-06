import { Relation, Database, QueryFunction } from './types';
import { Query } from './query';
import { Box } from './box';
import { cds, cover, insert } from './cds';

/**
 * Creates a database instance from the given specification
 * @param D The specification of the databases content
 */
export function database(D: Database): Database {
    return D;	// function only exists to create a coherent interface and to facilitate future extensions
}

/**
 * Given a join query against some schema S, returns a query function applicable to S-databases
 * @param Q The join query
 * @todo Infer optimal SAO from Q's query graph using a tree decomposition
 */
export function query(Q: string): QueryFunction {
    const _Q: Query = Query.parse(Q);
    const all: Box = Box.all(_Q.head.vars.length);     // a box covering the entire search space

    return (D: Database) => {
        const result: Relation = [];
        const A = cds();
        const B = _Q.gaps(D);

        let probe = (b: Box): [boolean, Box] => {
            const a = cover(A, b);
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
                insert(A, w);
                return [true, w];
            }
        }

        let [v, w] = probe(all);
        while (!v) {
            let _B = B.filter(_b => _b.contains(w));
            if (_B.length == 0) {
                result.push(w.tuple());
                _B = [w];
            }
            insert(A, ..._B);
            [v, w] = probe(all);
        }

        return result;
    };
}
