"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const query_1 = require("./query");
const box_1 = require("./box");
const cds_1 = require("./cds");
/**
 * Creates a database instance from the given specification
 * @param D The specification of the databases content
 */
function database(D) {
    return D; // function only exists to create a coherent interface and to facilitate future extensions
}
exports.database = database;
/**
 * Given a join query against some schema S, returns a query function applicable to S-databases
 * @param Q The join query
 * @todo Infer optimal SAO from Q's query graph using a tree decomposition
 */
function query(Q) {
    const _Q = query_1.Query.parse(Q);
    const all = box_1.Box.all(_Q.head.vars.length); // a box covering the entire space
    return (D) => {
        const result = [];
        const A = new cds_1.CDS();
        const B = _Q.gaps(D);
        let probe = (b) => {
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
        };
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
exports.query = query;
//# sourceMappingURL=sigmaJS.js.map