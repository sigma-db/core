import { ERROR } from "./constants";

/**
 * Maps a tuple of functions to a tuple of the functions' corresponding return types
 */
type FunctionValues<T extends Array<() => any>> = { [K in keyof T]: T[K] extends () => any ? ReturnType<T[K]> : never };

/**
 * Matches `(a|b|c|...)`
 */
export function union<T extends Array<() => any>>(...fns: T): ReturnType<T[number]> {
    for (let f of fns) {
        const y = f();
        if (y !== ERROR) {
            return y;
        }
    }
    return ERROR;
}

/**
 * Matches `(abc...)`
 */
export function product<T extends Array<() => any>>(...fns: T): FunctionValues<T> {
    const result = new Array() as FunctionValues<T>;
    for (let f of fns) {
        const y = f();
        if (y !== ERROR) {
            result.push(y);
        } else {
            return ERROR;
        }
    }
    return result;
}

/**
 * Matches `a{min,max}" or "a{min,}` if max < 0.
 * Any max < 0 is interpreted as infinity, i.e. for max < 0 and min = 0 (min = 1), `kleene(a)` = `a*` (`kleene(a, 1)` = `a+`).
 */
export function kleene<T>(a: () => T, min = 0, max = -1): T[] {
    min = Math.max(0, min);
    const results = new Array<T>();
    while (results.length < min || results.length != max) {
        const _a = a();
        if (_a !== ERROR) {
            results.push(_a);
        } else if (results.length >= min) {
            return results;
        } else {
            break;
        }
    }
    return ERROR;
}
