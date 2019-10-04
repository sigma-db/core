import { Dyadic } from "./dyadic";

type KV<T> = [bigint, T];

class TrieNode<T> {
    public children: Array<TrieNode<T>>;   // array of size 2: index 0 refers to left child, index 1 to right child

    constructor(public value?: T) {
        this.children = new Array<TrieNode<T>>(2);
    }
}

export class DyadicTrie<T> {
    private readonly root: TrieNode<T>;

    constructor() {
        this.root = new TrieNode<T>();
    }

    /**
     * Inserts the given key and associates it with the given value if not yet present and returns the value
     * Otherwise, returns the existing value
     * @param key The key to insert if not yet present
     * @param value The value to insert if the given key is not yet present
     */
    public putIfAbsent(key: bigint, value: T): T {
        const msb = BigInt(Dyadic.msb(key));
        let node = this.root;

        for (let i = msb - 1n; i >= 0n; i--) {
            const child = Number(BigInt.asIntN(1, key >> i));
            if (!node.children[child]) {
                node.children[child] = new TrieNode<T>();
            }
            node = node.children[child];
        }

        node.value = node.value || value;

        return node.value;
    }

    /**
     * Retrieves all values associated with the given key or any of its prefixes present in the trie
     * @param key The key to search for
     */
    public *searchAll(key: bigint): IterableIterator<KV<T>> {
        let msb = BigInt(Dyadic.msb(key));
        let node = this.root;

        do {
            if (node.value) {
                yield [key >> msb, node.value];
            }
            node = node.children[Number(BigInt.asIntN(1, key >> --msb))];
        } while (!!node && msb >= 0n);
    }

    /**
     * Returns the the first value associated with the given key or any of its prefixes present in the trie
     * @param key The key to search for
     */
    public search(key: bigint): KV<T> {
        let msb = BigInt(Dyadic.msb(key));
        let node = this.root;

        do {
            if (node.value) {
                return [key >> msb, node.value];
            }
            node = node.children[Number(BigInt.asIntN(1, key >> --msb))];
        } while (!!node && msb >= 0n);
    }
}
