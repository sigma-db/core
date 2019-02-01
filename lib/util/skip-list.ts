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

    constructor(private depth: number, private p: number, private throwsOnDuplicate = false) {
        this.head = new Node<T>(null, depth);
        this.tail = new Node<T>(null, 0);
        this.level = 0;

        this.head.next.fill(this.tail);
    }

    private randomLevel(): number {
        let l = 0;
        while (Math.random() < this.p && l < this.depth) {
            l++;
        }
        return l;
    }

    public find(key: T): [T, T] {
        let node = this.head;
        for (let i = this.level; i >= 0; i--) {
            while (node.next[i] != this.tail && node.next[i].key.compareTo(key) < 0) {
                node = node.next[i];
            }
        }
        return [node.key, node.next[0].key];
    }

    public insert(key: T): void {
        let pred = new Array<Node<T>>(this.depth + 1);
        let node = this.head;
        for (let i = this.level; i >= 0; i--) {
            while (node.next[i] != this.tail && node.next[i].key.compareTo(key) < 0) {
                node = node.next[i];
            }
            pred[i] = node;
        }

        node = node.next[0];

        if (node == this.tail || node.key.compareTo(key) > 0) {
            let rlevel = this.randomLevel();

            if (rlevel > this.level) {
                for (let i = this.level + 1; i < rlevel + 1; i++) {
                    pred[i] = this.head;
                }
                this.level = rlevel;
            }

            let newNode = new Node<T>(key, rlevel);
            for (let i = 0; i <= rlevel; i++) {
                newNode.next[i] = pred[i].next[i];
                pred[i].next[i] = newNode;
            }
        } else if (this.throwsOnDuplicate) {
            throw new DuplicateKeyError(key);
        }
    }

    *[Symbol.iterator](): IterableIterator<T> {
        let node = this.head.next[0];
        while (node != this.tail) {
            yield node.key;
            node = node.next[0];
        }
    }
}

/*class Test implements IComparable<Test> {
    private constructor(private tuple: number[]) { }

    public compareTo(other: Test): number {
        const p = this.tuple.findIndex((_, i) => this.tuple[i] != other.tuple[i]);
        return p < 0 ? 0 : this.tuple[p] - other.tuple[p];
    }

    public static create(tuple: number[]): Test {
        return new Test(tuple);
    }
}

const l = new SkipList<Test>(4, 0.25);

const [x1, y1] = l.find(Test.create([0, 0, 0]));
const [x2, y2] = l.find(Test.create([1, 2, 3]));
const [x3, y3] = l.find(Test.create([4, 603, 469]));
const [x4, y4] = l.find(Test.create([56, 549, 488]));
const [x5, y5] = l.find(Test.create([57, 999, 281]));
const [x6, y6] = l.find(Test.create([72, 367, 591]));
const [x7, y7] = l.find(Test.create([73, 367, 591]));

console.log();*/
