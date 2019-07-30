import { Relation, Tuple } from "../../../database";
import { SkipList } from "../../../util";
import { IAtom } from "../atom";
import { ValueSet, Variable } from "../variable";

type TPredicate = Array<[number, number]>;

export class SelingerJoin {
    public execute(atoms: IAtom[], values: ValueSet): SkipList<Tuple> {
        let vars = atoms[0].vars;
        let result = new SkipList<Tuple>();
        for (const tuple of atoms[0].rel) {
            result.insert(tuple);
        }

        for (let i = 1; i < atoms.length; i++) {
            const pred = this.getPred(vars, atoms[i].vars);
            vars = [...vars, ...atoms[i].vars.filter(v => vars.indexOf(v) < 0)];
            result = this.join(result, atoms[i].rel, pred);
        }

        return result;
    }

    private merge(t: Tuple, u: Tuple, pred: TPredicate): Tuple {
        const _u = [];
        for (let i = 0; i < u.length; i++) {
            if (!pred.some(([, y]) => y === i)) {
                _u.push(u[i]);
            }
        }
        return Tuple.of(...t, ..._u);
    }

    private join(R: SkipList<Tuple>, S: Relation, pred: TPredicate): SkipList<Tuple> {
        const result = new SkipList<Tuple>();
        for (const t of R) {
            for (const u of S) {
                if (pred.every(([x, y]) => t[x] === u[y])) {
                    result.insert(this.merge(t, u, pred));
                }
            }
        }
        return result;
    }

    private getPred(a: Variable[], b: Variable[]): TPredicate {
        const result = [];
        for (let i = 0; i < a.length; i++) {
            const pos = b.indexOf(a[i]);
            if (pos >= 0) {
                result.push([i, pos]);
            }
        }
        return result;
    }
}
