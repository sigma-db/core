import { Query, SelectQuery, QueryLang } from '../query';
import { Box } from './box';
import { CDS } from './cds';
import { WILDCARD } from './constants';
import { Relation } from './relation';
import { Transaction, TransactionLog } from './transaction';
import { Tuple } from './tuple';

type Schema = { [name: string]: string[] };

export class Database {
    private readonly relations: { [name: string]: Relation } = {};

    private constructor(private log: TransactionLog) { }

    /**
     * Opens an existing database stored at the specified location 
     * or creates a new one if it does not yet exist.
     * @param path The path to the database
     */
    public static open(path: string): Database {
        const log = TransactionLog.open(path);
        const db = new Database(log);

        for (const tx of log) {
            if (Transaction.isCreate(tx)) {
                db._createRelation(tx.name, tx.attrs);
            } else if (Transaction.isInsert(tx)) {
                db._insert(tx.rel, tx.tuple);
            }
        }

        return db;
    }

    /**
     * Closes the database
     */
    public close(): void {
        this.log.close();
    }

    /**
     * Creates a new relation
     * @param name The name of the relation
     * @param attrs The attributes of the relation
     */
    public createRelation(name: string, attrs: string[]): void {
        this._createRelation(name, attrs);
        this.log.write(Transaction.newCreate(name, attrs));
    }

    /**
     * Inserts a new tuple into the specified relation
     * @param rel The relation to insert into
     * @param tuple The tuple to insert
     */
    public insert(rel: string, tuple: number[]) {
        this._insert(rel, tuple);
        this.log.write(Transaction.newInsert(rel, tuple));
    }

    /**
     * Evaluates the given query on this database and returns the resulting relation
     * @param query The query
     * @param lang The language of the query. Defaults to CQ.
     * @todo Infer optimal SAO from Q's query graph using a tree decomposition
     */
    public query(query: string, lang: QueryLang = QueryLang.CQ): Relation {
        const q = Query.parse(query, lang);
        if (Query.isCreate(q)) {
            this.createRelation(q.relation, q.attributes);
        } else if (Query.isInsert(q)) {
            this.insert(q.relation, q.tuple.map(parseInt));
        } else if (Query.isSelect(q)) {
            return this.select(q);
        }
    }

    private select(q: SelectQuery): Relation {
        const R: Relation = Relation.create(new Array(q.SAO.length).fill("X"));
        const A: CDS = new CDS();
        const all: Box = Box.all(q.SAO.length); // a box covering the entire space

        let probe = (b: Box): [boolean, Box] => {
            const a = A.witness(b);
            if (!!a) {
                return [true, a];
            }
            else if (b.isTuple()) {
                return [false, b];
            }
            else {
                let [b1, b2] = b.split();

                let [v1, w1] = probe(b1);
                if (!v1) {
                    return [false, w1];
                }
                else if (w1.contains(b)) {
                    return [true, w1];
                }

                let [v2, w2] = probe(b2);
                if (!v2) {
                    return [false, w2];
                }
                else if (w2.contains(b)) {
                    return [true, w2];
                }

                let w = w1.resolve(w2);
                A.insert(w);
                return [true, w];
            }
        }

        let [v, w] = probe(all);
        while (!v) {
            let B = this.gaps(q, w.tuple());
            if (B.length == 0) {
                R.insert(w.tuple());
                B = [w];
            }
            A.insert(...B);
            [v, w] = probe(all);
        }

        return R;
    }

    private _createRelation(name: string, attrs: string[]): void {
        if (!this.relations[name]) {
            this.relations[name] = Relation.create(attrs);
        } else {
            throw new Error(`Relation "${name}" already exists.`);
        }
    }

    private _insert(rel: string, tuple: number[]) {
        const t = Tuple.from(tuple);
        const success = this.relations[rel].insert(t);
        if (!success) {
            throw new Error(`Relation "${rel}" already contains "${t.toString()}".`);
        }
    }

    private gaps(q: SelectQuery, t: Tuple): Box[] {
        let C: Box[] = new Array<Box>();
        q.relations.forEach(rel => {
            let _t = Tuple.from(q.variables(rel).map(v => t.at(q.SAO.indexOf(v))));
            let B = this.relations[rel].gaps(_t).map(b => new Box(q.SAO.map(v => {
                let pos = q.variables(rel).indexOf(v);
                return pos < 0 ? WILDCARD : b.at(pos);
            })));
            C.push(...B);
        });
        return C;
    }

    private schema(): Schema {
        return Object.keys(this.relations).reduce((S, R) => {
            S[R] = this.relations[R].attrs;
            return S;
        }, {});
    }
}
