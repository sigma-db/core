import { Box } from "../../database";
import { DyadicTrie } from "../../util";

export class CDS {
    private readonly data: DyadicTrie<any>;

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
        const b = this.cover(box, 0, this.data);
        if (!!b) {
            return Box.from(b);
        }
    }

    /**
     * Actual implementation of {@link witness}
     */
    private cover(box: ArrayLike<bigint>, dim: number, trie: DyadicTrie<any>): Array<bigint> {
        if (dim === box.length - 1) {
            const b = trie.search(box[dim]);
            if (!!b) {
                const [int] = b;
                return [int];
            }
        } else {
            for (const [int, _trie] of trie.searchAll(box[dim])) {
                const b = this.cover(box, dim + 1, _trie);
                if (!!b) {
                    b.unshift(int);
                    return b;
                }
            }
        }
    }
}
