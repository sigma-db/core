import { Database } from "./types";
import { WILDCARD } from "./constants";
import { Box } from "./box";
import { Index } from "./index";
import { CDS } from "./cds";

export interface Atom {
    name: string;
    vars: string[];
}

export class Query {
    private SAO: string[];

    private constructor(public head: Atom, public body: Atom[]) {
        this.SAO = this.head.vars;  // TODO
    }

    /**
     * Turns the string representation of a join query into an internal object representation
     * @param Q The query to parse
     * @todo Implement 'real' parser
     */
    public static parse(Q: string): Query {
        let atoms: Atom[] = [];
        let atomRegex = /(\w+\(\)|\w+\(\w+(, ?\w+)*\))/g;	// this function is not yet a fully fledged parser; it simply matches atoms, the first of which being the head
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
    public gaps(D: Database): CDS {
        let C: CDS = new CDS();
        this.body.forEach(atom => {
            let I = Index.create(D[atom.name]);
            let _B = I.gaps().map(b => new Box(this.SAO.map(v => {
                let pos = atom.vars.indexOf(v);
                return pos < 0 ? WILDCARD : b.at(pos);
            })));
            C.insert(..._B);
        });
        return C;
    }
}
