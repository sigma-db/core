"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const box_1 = require("./box");
const index_1 = require("./index");
const cds_1 = require("./cds");
class Query {
    constructor(head, body) {
        this.head = head;
        this.body = body;
        this.SAO = this.head.vars; // TODO
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
     * Generates the knowledge base for a given database D
     * @param D The database
     */
    gaps(D) {
        let C = new cds_1.CDS();
        this.body.forEach(atom => {
            let I = index_1.Index.create(D[atom.name]);
            let _B = I.gaps().map(b => new box_1.Box(this.SAO.map(v => {
                let pos = atom.vars.indexOf(v);
                return pos < 0 ? constants_1.WILDCARD : b.at(pos);
            })));
            C.insert(..._B);
        });
        return C;
    }
}
exports.Query = Query;
//# sourceMappingURL=query.js.map