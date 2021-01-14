import * as Database from "../database";

export const enum ResultType { RELATION, SUCCESS, ERROR }

export type Result =
    | { type: ResultType.RELATION } & Result.Relation
    | { type: ResultType.SUCCESS } & Result.Success
    | { type: ResultType.ERROR } & Result.Error;

type Payload<T extends ResultType> = Omit<Extract<Result, { type: T }>, "type">;

export namespace Result {
    const ID = Symbol("sigmaDB Result Identifier");

    const create = <T extends ResultType>(type: T, payload: Payload<T>): Payload<T> & { type: T } => {
        return { [ID]: null, type, ...payload };
    }

    export type Relation = { relation: Database.Relation };
    export const Relation = (relation: Database.Relation) => create(ResultType.RELATION, { relation });

    export type Success = {};
    export const Success = () => create(ResultType.SUCCESS, {});

    export type Error = { message: string };
    export const Error = (message: string) => create(ResultType.ERROR, { message });

    export const isResult = (obj: any): obj is Result => ID in obj;
}
