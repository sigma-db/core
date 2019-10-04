import { Tuple } from "../../database";
import { SkipList } from "../../util/list";

export class Projection {
    public static execute(tuples: SkipList<Tuple>, map: number[]): SkipList<Tuple> {
        const result = new SkipList<Tuple>();
        for (const tuple of tuples) {
            const _tuple = Tuple.from(map.map(p => tuple[p]));
            result.insert(_tuple);
        }
        return result;
    }
}
