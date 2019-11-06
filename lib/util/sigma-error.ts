export abstract class SigmaError implements Error {
    public get name(): string {
        return this.constructor.name;
    }

    constructor(public message: string) { }
}
