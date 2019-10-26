export enum ListType { SORTED, UNSORTED }

export type TList<T extends IComparable<T>> = IList<T, ListType>;

export interface IComparable<T> {
    compareTo(other: T): number;
}

export interface IList<S extends IComparable<S>, T extends ListType> extends Iterable<S> {
    /**
     * The number of entries in the list
     */
    size: number;

    find(key: S): T extends ListType.SORTED ? [S, S] : S;

    insert(key: S): void;

    sort(comparator: ((a: S, b: S) => number)): IList<S, T>;
}
