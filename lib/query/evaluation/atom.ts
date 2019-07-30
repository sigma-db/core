import { Relation } from "../../database";
import { Variable } from "./variable";

export interface IAtom {
    rel: Relation;
    vars: Variable[];
}
