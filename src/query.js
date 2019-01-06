"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const box_1 = require("./box");
const index_1 = require("./index");
class Query {
    constructor(head, body) {
        this.head = head;
        this.body = body;
    }
    /**
     * Turns the string representation of a join query into an internal object representation
     * @param Q The query to parse
     * @todo Implement 'real' parser
     */
    static parse(Q) {
        let atoms = [];
        let atomRegex = /(\w+\(\)|\w+\(\w+(, ?\w+)*\))/g; // this function is not yet a fully fledged parser; it simply matches atoms, the first of which being the head
        do {
            var m = atomRegex.exec(Q);
            if (m) {
                let atom = m[0];
                let lBracePos = atom.indexOf('(');
                let rBracePos = atom.indexOf(')', lBracePos);
                atoms.push({
                    name: atom.substring(0, lBracePos),
                    vars: atom.substring(lBracePos + 1, rBracePos).split(',').map(v => v.trim())
                });
            }
        } while (m);
        let [head, ...body] = atoms;
        return new Query(head, body);
    }
    /**
     * Generates the knowledge base for a given database D and query Q wrt. the schema inferred from Q and the given SAO.
     * @param Q The query to infer the schema from
     * @param D The database
     * @param SAO The splitting attribute order
     */
    gaps(D) {
        const SAO = this.head.vars;
        let B = [];
        this.body.forEach(atom => {
            let I = index_1.Index.create(D[atom.name]);
            let _B = I.gaps().map(b => new box_1.Box(SAO.map(v => {
                let pos = atom.vars.indexOf(v);
                return pos < 0 ? constants_1.WILDCARD : b.at(pos);
            })));
            Array.prototype.push.apply(B, _B);
        });
        return B;
    }
}
exports.Query = Query;
//# sourceMappingURL=query.js.map