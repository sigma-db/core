import { Box } from './box';

type KV<T> = [number, T];

class Node<T> {
    children: Array<Node<T>>;

    constructor(public value?: T) {
        this.children = new Array<Node<T>>(2);
    }
}

class DyadicTrie<T> {
    private root: Node<T>;

    constructor() {
        this.root = new Node<T>();
    }

    public putIfAbsent(key: number, value: T): T {
        const msb = Math.log2(key) | 0;
        let node = this.root;

        for (var i = msb - 1; i >= 0; i--) {
            let child = (key >> i) & 1;
            if (!node.children[child]) {
                node.children[child] = new Node<T>();
            }
            node = node.children[child];
        }

        node.value = node.value || value;

        return node.value;
    }

    public search(key: number): KV<T>[] {
        let msb = Math.log2(key) | 0;
        let result: Array<KV<T>> = new Array<KV<T>>();
        let node = this.root;

        do {
            if (node.value) {
                result.push([key >> msb, node.value]);
            }
            node = node.children[(key >> --msb) & 1];
        } while (!!node && msb >= 0);

        return result;
    }
}

export class CDS {
    private data: DyadicTrie<any>;

    constructor() {
        this.data = new DyadicTrie<any>();
    }

    public insert(...boxes: Box[]) {
        boxes.forEach(_b => {
            let trie = this.data;
            _b.forEach(s => {
                trie = trie.putIfAbsent(s, new DyadicTrie<any>());
            });
        });
    }

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

    public witness(box: Box): Box {
        return this.witnessAll(box).shift();
    }
}
