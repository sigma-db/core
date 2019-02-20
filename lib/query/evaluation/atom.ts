import { Variable } from "./variable";
import { Relation } from "../../database";

export interface IAtom {
    rel: Relation;
    vars: Array<Variable>;
}
