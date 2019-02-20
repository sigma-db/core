import { Tuple } from "../../../database";
import { SkipList } from "../../../util";

export class Projection {
    public execute(tuples: SkipList<Tuple>, map: Array<number>): SkipList<Tuple> {
        const result = new SkipList<Tuple>();
        for (let tuple of tuples) {
            const _tuple = Tuple.from(map.map(p => tuple[p]));
            result.insert(_tuple);
        }
        return result;
    }
}
