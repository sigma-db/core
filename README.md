# sigmaJS
SigmaJS is a relational database engine that aims to incorporate some of the latest findings in database theory.
While many of the proposed approaches are provably optimal in some *theoretical* sense, it usually remains an open question how the performance would be in *practice*.
One such approach is the *Tetris* join algorithm introduced in [Joins via Geometric Resolutions: Worst Case and Beyond](http://doi.org/10.1145/2967101) by *Khamis et al*, which we implement to evaluate joins.

We developed sigmaJS in a manner that facilitates easy modification of almost any aspect of the database engine, be it query parsing, transaction logging or join evaluation.
Still, please keep in mind that this is a *research project* and as such lacks many features of a full-fledged RDBMS (cf. [Limitations](#limitations)).

## Setup

### Prerequisites
* If not already present, download and install [Node.js](https://nodejs.org) 11.0 or newer. Depending on your operating system, the native package manager might be preferrable for the retrieval and installation.
* Clone the project with `git clone https://github.com/dlw93/sigmaJS`.

### Build
* From within the project directory, run `npm install` to download build dependencies such as the [TypeScript](https://www.typescriptlang.org/) compiler and the parser generator [PEG.js](https://pegjs.org/).
* To build the library and the accompanying client application, run `npm run build`.

### Run
* Start the command line interface using `npm run db -- </path/to/database>`. To work in a temporary database, simply run `npm run db` instead.

## Usage
The database engine can be accessed in two ways, either by the provided command line interface, or by directly using its exposed API.

### Command Line Interface
Our database engine supports an extension of [conjunctive queries](https://en.wikipedia.org/wiki/Conjunctive_query#Datalog) that is more concise when formulating queries against complex schemata in realistic scenarios.

We discern three types of queries, whose syntax we outline by example:

1. To **create** a new relation *Employee* with attributes *id*, *name*, *salary* and *boss* of types `int`, `string`, `int` and `int`, respectively, write `Employee: (id: int, name: string, salary: int, boss: int)`. Supported data types are `int`, `string`, `char` and `bool`.
2. To **insert** a tuple into the (existing) relation *Employee*, write `Employee(id=1, name="Sam", salary=4200, boss=0)`. Alternatively, the less verbose syntax `Employee(1, "Sam", 4200, 0)` can be used. Please note that in the latter case, the order of the attributes matters, while it does not in the former.
3. To **select** all employees' IDs whose salary is 4,200, write either `(name=x) <- Employee(name=x, salary=4200)` or `(name=y) <- Employee(x, y, 4200, z)`. Again, the order the attributes appear in only matters for the second form. In addition, attributes that are not required to formulate the query may be omitted in the named syntax, while they have to be explicitly mentioned in the unnamed syntax.

### Library
tbd.
<!-- The following script **creates** a database with two relations *Employee* and *Division*, **inserts** some tuples and **selects** all division heads with at least one employee earning 4,200.

```TypeScript
import { Database, Query } from "sigma";
import { INT, CHAR } from "sigma/types";

const db = Database.open(); // using a temporary database

db.createRelation("Employee", [ INT("id"), STRING("name"), INT("salary"), INT("divId") ]);
db.createRelation("Division", [ INT("id"), STRING("name"), INT("head") ]);

db.relation("Employee").insert(0, "David Luis Wiegandt", 4200, 2);
db.relation("Employee").insert(1, "Marc Seibert", 4711, 2);
db.relation("Division").insert(2, "Development", 1);

const result = db.query("(head=y) <- Employee(id=x, name=y, divId=z), Employee(name="David Luis Wiegandt", divId=z), Division(id=z, head=x)");
console.log(result.tuples);

console.table();

db.close();
``` -->

## Limitations
There are quite a few functionalities essential to a real-world DBMS we do *not* support as of now, including:
* aggregation queries
* concurrent access
* parallel/distributed query evaluation
* ...and much more