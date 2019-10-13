export abstract class SigmaError implements Error {
    name: string;

    constructor(public message: string) { }
}
