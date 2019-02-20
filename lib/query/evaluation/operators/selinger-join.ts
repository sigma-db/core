import { Database, Relation } from "../../../database";
import { IAtom } from "../atom";

export class SelingerJoin {
    constructor(private db: Database) { }

    private join(): Relation {
        /*const result = Relation.create(undefined, );
        for (let t of r) {
            for (let u of s) {
                
            }
        }
        return result;*/
        throw new Error("Operation not yet implemented")
    }

    public execute(atoms: Array<IAtom>): Relation {
        let result = atoms[0].rel;
        for (let i = 1; i < atoms.length; i++) {
            result = this.join();
        }
        return result;
    }
}
