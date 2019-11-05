import { IComparable } from "./comparable";
import { List } from "./list";

export class ArrayList<T extends IComparable<T>> implements List<T, false> {
    private readonly data: T[];

    public constructor() {
        this.data = new Array<T>();
    }

    public get size(): number {
        return this.data.length;
    }

    public find(key: T): T {
        for (const c of this.data) {
            if (c.compareTo(key) === 0) {
                return c;
            }
        }
    }

    public insert(key: T): void {
        this.data.push(key);
    }

    public *[Symbol.iterator](): IterableIterator<T> {
        yield* this.data;
    }
}
