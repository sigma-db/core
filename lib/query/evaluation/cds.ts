import { Box } from '../../database';
import { DyadicTrie } from '../../util';

export class CDS {
    private data: DyadicTrie<any>;

    constructor() {
        this.data = new DyadicTrie<any>();
    }

    /**
     * Inserts new boxes into the CDS
     * @param boxes The boxes to insert
     */
    public insert(...boxes: Box[]) {
        boxes.forEach(_b => {
            let trie = this.data;
            _b.forEach(s => {
                trie = trie.putIfAbsent(s, new DyadicTrie<any>());
            });
        });
    }

    /**
     * Retrieves all boxes in the CDS containing the given box
     * @param box The box to check
     */
    public witnessAll(box: Box): Box[] {
        const _cover = (dim: number, trie: DyadicTrie<any>): number[][] => {
            const sub = trie.search(box.at(dim));
            if (dim == box.length - 1) {
                return sub.map(([_int,]) => [_int]);
            }
            else {
                return [].concat(...sub.map(([_int, _trie]) => _cover(dim + 1, _trie).map(b => [_int, ...b])));
            }
        };

        return _cover(0, this.data).map(b => new Box(b));
    }

    /**
     * Checks whether a given box is contained in any box in the CDS and returns a witness if so
     * @param box The box to check
     */
    public witness(box: Box): Box {
        return this.witnessAll(box).shift();
    }
}
