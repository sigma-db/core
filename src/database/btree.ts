interface IComparable<T> {
    compareTo(other: T): number;
}

interface IIndex<K extends IComparable<K>, V> {
    insert(key: K, value: V);
    search(key: K): V[];
}

class Node<K, V> {

}

export default class BTree<K extends IComparable<K>, V> implements IIndex<K, V> {
    private root: Node<K, V>;

    private constructor() {
    }

    public insert(key: K, value: V): void {
        throw new Error("Method not implemented.");
    }

    public search(key: K): V[] {
        throw new Error("Method not implemented.");
    }
}
