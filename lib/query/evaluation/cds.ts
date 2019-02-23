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
        boxes.forEach(box => {
            let trie = this.data;
            box.forEach(int => {
                trie = trie.putIfAbsent(int, new DyadicTrie<any>());
            });
        });
    }

    /**
     * Retrieves all boxes in the CDS containing the given box
     * @param box The box to check
     */
    public witnessAll(box: Box): Box[] {
        const cover = (dim: number, trie: DyadicTrie<any>): bigint[][] => {
            const sub = trie.search(box[dim]);
            if (dim == box.length - 1) {
                return sub.map(([int,]) => [int]);
            } else {
                return [].concat(...sub.map(([int, _trie]) => cover(dim + 1, _trie).map(b => [int, ...b])));
            }
        };
        return cover(0, this.data).map(b => Box.from(b));
    }

    /**
     * Checks whether a given box is contained in any box in the CDS and returns a witness if so
     * @param box The box to check
     */
    public witness(box: Box): Box {
        const cover = (dim: number, trie: DyadicTrie<any>): bigint[] => {
            if (dim == box.length - 1) {
                const b = trie.search(box[dim]);
                if (!!b) {
                    const [int,] = b;
                    return [int];
                }
            } else {
                for (let [int, _trie] of trie.searchAll(box[dim])) {
                    const b = cover(dim + 1, _trie);
                    if (!!b) {
                        return [int, ...b];
                    }
                }
            }
        };

        const b = cover(0, this.data);
        if (!!b) {
            return Box.from(b);
        }
    }
}
