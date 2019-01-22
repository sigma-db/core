type KV<T> = [number, T];

class TrieNode<T> {
    children: Array<TrieNode<T>>;   // array of size 2: index 0 refers to left child, index 1 to right child

    constructor(public value?: T) {
        this.children = new Array<TrieNode<T>>(2);
    }
}

export class DyadicTrie<T> {
    private root: TrieNode<T>;

    constructor() {
        this.root = new TrieNode<T>();
    }

    /**
     * Inserts the given key and associates it with the given value if not yet present and returns the value
     * Otherwise, returns the existing value
     * @param key The key to insert if not yet present
     * @param value The value to insert if the given key is not yet present
     */
    public putIfAbsent(key: number, value: T): T {
        const msb = Math.log2(key) | 0;
        let node = this.root;

        for (var i = msb - 1; i >= 0; i--) {
            let child = (key >> i) & 1;
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
