import { Box } from '../../database';
import { DyadicTrie } from '../../util';

export class CDS {
    private data: DyadicTrie<any>;

    constructor() {
        this.data = new DyadicTrie<any>();
    }

    /**
     * Inserts a new box into the CDS
     * @param boxes The box to insert
     */
    public insert(box: Box): void {
        let trie = this.data;
        for (let i = 0; i < box.length; i++) {
            trie = trie.putIfAbsent(box[i], new DyadicTrie<any>());
        }
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
