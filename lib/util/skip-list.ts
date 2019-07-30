import { IComparable } from "./comparable";

class Node<T extends IComparable<T>> {
    public key: T;
    public next: Array<Node<T>>;

    constructor(key: T, level: number) {
        this.key = key;
        this.next = new Array<Node<T>>(level + 1);
    }
}

export class DuplicateKeyError<T> extends Error {
    constructor(private _key: T) {
        super();
    }

    public get key(): T {
        return this._key;
    }
}

export class SkipList<T extends IComparable<T>> {
    private head: Node<T>;
    private tail: Node<T>;
    private level: number;
    private _size: number;

    constructor(private depth = 4, private p = 1 / depth, private throwsOnDuplicate = false) {
        this.head = new Node<T>(null, depth);
        this.tail = new Node<T>(null, 0);
        this.level = 0;
        this._size = 0;

        this.head.next.fill(this.tail);
    }

    /**
     * The number of entries in the list
     */
    public get size(): number {
        return this._size;
    }

    public find(key: T): [T, T] {
        let node = this.head;
        for (let i = this.level; i >= 0; i--) {
            while (node.next[i] !== this.tail && node.next[i].key.compareTo(key) < 0) {
                node = node.next[i];
            }
        }
        return [node.key, node.next[0].key];
    }

    public insert(key: T): void {
        const pred = new Array<Node<T>>(this.depth + 1);
        let node = this.head;
        for (let i = this.level; i >= 0; i--) {
            while (node.next[i] !== this.tail && node.next[i].key.compareTo(key) < 0) {
                node = node.next[i];
            }
            pred[i] = node;
        }

        node = node.next[0];

        if (node === this.tail || node.key.compareTo(key) > 0) {
            const rlevel = this.randomLevel();

            if (rlevel > this.level) {
                for (let i = this.level + 1; i < rlevel + 1; i++) {
                    pred[i] = this.head;
                }
                this.level = rlevel;
            }

            const newNode = new Node<T>(key, rlevel);
            for (let i = 0; i <= rlevel; i++) {
                newNode.next[i] = pred[i].next[i];
                pred[i].next[i] = newNode;
            }

            this._size++;
        } else if (this.throwsOnDuplicate) {
            throw new DuplicateKeyError(key);
        }
    }

    public *[Symbol.iterator](): IterableIterator<T> {
        let node = this.head.next[0];
        while (node !== this.tail) {
            yield node.key;
            node = node.next[0];
        }
    }

    private randomLevel(): number {
        let l = 0;
        while (Math.random() < this.p && l < this.depth) {
            l++;
        }
        return l;
    }
}
