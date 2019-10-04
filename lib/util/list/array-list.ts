import { IComparable, IList, ListType } from "./list";

export class ArrayList<T extends IComparable<T>> implements IList<T, ListType.UNSORTED> {
    private readonly _data: T[];

    public constructor() {
        this._data = new Array<T>();
    }

    public get size(): number {
        return this._data.length;
    }

    public find(key: T): T {
        for (const c of this._data) {
            if (c.compareTo(key) === 0) {
                return c;
            }
        }
    }

    public insert(key: T): void {
        this._data.push(key);
    }

    public sort(comparator: (a: T, b: T) => number): ArrayList<T> {
        this._data.sort(comparator);
        return this;
    }

    public *[Symbol.iterator](): IterableIterator<T> {
        yield* this._data;
    }
}
