# ![logo](https://raw.githubusercontent.com/dlw93/sigmaDB/master/assets/sigmaDB.png)

[![NPM](https://img.shields.io/npm/v/@sigma-db/core)](https://www.npmjs.com/package/@sigma-db/core)
[![Dependencies](https://david-dm.org/dlw93/sigmaDB/status.svg)](https://david-dm.org/dlw93/sigmaDB)
[![CodeFactor](https://www.codefactor.io/repository/github/dlw93/sigmadb/badge)](https://www.codefactor.io/repository/github/dlw93/sigmadb)
[![Build Status](https://dev.azure.com/dlw/sigmaDB/_apis/build/status/sigmaDB?branchName=master)](https://dev.azure.com/dlw/sigmaDB/_build/latest?definitionId=2&branchName=master)
![node version](https://img.shields.io/node/v/@sigma-db/core)

*sigmaDB* is a relational database engine that aims to incorporate some of the latest findings in database theory.
While many of the proposed approaches are provably optimal in some *theoretical* sense, it usually remains an open question how the performance would be in *practice*.
One such approach is the *Tetris* join algorithm introduced in [Joins via Geometric Resolutions: Worst Case and Beyond](http://doi.org/10.1145/2967101) by *Khamis et al*, which we implement to evaluate joins.

We developed sigmaDB in a manner that facilitates easy modification of almost any aspect of the database engine, be it query parsing, transaction logging or join evaluation.
Still, please keep in mind that this is a *research project* and as such lacks many features of a full-fledged RDBMS (cf. [Limitations](#limitations)).

## Build and Installation

### Prerequisites

In order to run sigmaDB, you need [Node.js](https://nodejs.org) 11.0 or newer to be present on your system.

### Installation

To install the package from [npm](https://www.npmjs.com/), run `npm install -g sigma-db`.
Thereafter, you can run sigmaDB from the command line with `sigma --database=</path/to/database>`.

### Custom Build

If instead you want to clone the repository and build sigmaDB from source by yourself, follow these steps:

* Clone the project with `git clone https://github.com/dlw93/sigmaDB`.
* From within the project directory, run `npm install` to download build dependencies such as the [TypeScript](https://www.typescriptlang.org/) compiler and the parser generator [PEG.js](https://pegjs.org/).
* To build the library and the accompanying client application, run `npm run build`.
* To make the package accessible from other projects and the command line, run `npm link`.

You can now use sigmaDB as described in [Installation](#installation).

## Query Language

We discern four types of queries, whose syntax we outline by example:

1. To **create** a new relation *Employee* with attributes *id*, *name*, *salary* and *boss* of types `int`, `string`, `int` and `int`, respectively, write `Employee: (id: int, name: string, salary: int, boss: int)`. Supported data types are `int`, `string`, `char` and `bool`.
2. To **insert** a tuple into the (existing) relation *Employee*, write `Employee(id=1, name="Sam", salary=4200, boss=0)`. Alternatively, the less verbose syntax `Employee(1, "Sam", 4200, 0)` can be used. Please note that in the latter case, the order of the attributes matters, while it does not in the former.
3. To **select** all employees' IDs whose salary is 4,200, write either `(name=x) <- Employee(name=x, salary=4200)` or `(name=y) <- Employee(x, y, 4200, z)`. Again, the order the attributes appear in only matters for the second form. In addition, attributes that are not required to formulate the query may be omitted in the named syntax, while they have to be explicitly mentioned in the unnamed syntax.
4. To print the **schema** of the database or a specific relation, write `?` or `<rel>?`, respectively, where `<rel>` is the name of the relation to get the schema of.

## Usage as a Library

The following script **creates** a database with two relations *Employee* and *Division*, **inserts** some tuples and **selects** all employees and their respective division head.

```TypeScript
import { Database, Engine, Query } from "sigma";

const db = Database.open();     // using a temporary database
const ng = Engine.create();     // using the default query evaluation engine
const program = [
    // create tables
    'Employee: (id: int, name: string(32), salary: int, division: int)',
    'Division: (id: int, name: string(64), head: int)',
    // insert into tables
    'Division(0, "Research and Development", 1)',
    'Division(1, "Marketing", 0)',
    'Employee(0, "Jack Walls", 8360, 1)',
    'Employee(1, "Nicole Smith", 7120, 0)',
    'Employee(2, "Joan Waters", 2700, 0)',
    'Employee(3, "David Brown", 4200, 1)',
    'Employee(4, "Marc Wilson", 4200, 1)',
    // ask a query
    '(master=x, servant=y) <- Employee(name=x, division=z, id=u), Employee(name=y, division=z), Division(id=z, head=u)'
].map(q => Query.parse(q)); // compile queries

// execute program on db
program.forEach(query => {
    const result = ng.evaluate(query, db);
    if (!!result) {
        console.table([...result.tuples()]);
    }
});

db.close();
```

## Limitations

There are quite a few functionalities essential to a real-world DBMS we do *not* support as of now, including:

* aggregation queries
* concurrent access
* parallel/distributed query evaluation
* ...and much more
