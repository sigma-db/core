import { IComparable } from "./comparable";

export interface List<T extends IComparable<T>, U extends boolean> extends Iterable<T> {
    size: number;
    find(key: T): U extends true ? [T, T] : T;
    insert(key: T): void;
}
