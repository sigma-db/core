export default new class _Options<T extends { [key: string]: <S>(value: string) => S } = {}> {
    constructor(private opts: T) { }

    /**
     * Adds a command line option to the CLI
     * @param key The key of the option (e.g. `input` in `--input`)
     * @param fn The function to transform the `value` as in `--input="value"`
     */
    public option<K extends string, S>(key: K, fn: ((value: string) => S)): _Options<T & { [key in K]: ((value: string) => S) }> {
        return new _Options({ ...this.opts, ...{ [key]: fn } });
    }

    /**
     * Parses the command line arguments with regard to the provided options
     */
    public parse(): Partial<{ [P in keyof T]: ReturnType<T[P]> }> {
        return process.argv.slice(2).reduce<Partial<{ [P in keyof T]: ReturnType<T[P]> }>>((result, arg) => {
            const [, key, value] = arg.match(/--(\w+)=(.+)/);
            if (key in this.opts) {
                result[key as keyof T] = this.opts[key](value);
            }
            return result;
        }, {});
    }
}({});
