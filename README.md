# sigmaJS
This is an implementation of the *Tetris* join algorithm introduced in [Joins via Geometric Resolutions: Worst Case and Beyond](http://doi.org/10.1145/2967101) by *Khamis et al*.
The goal is to show that the algorithm admits a straightforward implementation after working out some details left unspecified in the paper itself.
In particular, we do *not* aim to provide a thoroughly optimised implementation!

## Setup

### Prerequisites
* If not already present, download and install [Node.js](https://nodejs.org). Depending on your operating system, the native package manager might be preferrable for the retrieval and installation of Node.js.
* Since the project is written in [TypeScript](https://www.typescriptlang.org/), it needs to be *transpiled* into JavaScript first. To this end, download and install the TypeScript compiler using `npm install -g typescript`.

### Build
* Run `npm install` to download build dependencies such as the parser generator [PEG.js](https://pegjs.org/).
* To build the library and the accompanying sample applications, run `npm run build`.

### Run
* Run the sample application using `node ./dist/samples/triangle.js`.

## Example
The following script creates a database *D* with three relations *R*, *S* and *T*, each of which with some tuples over the domain *[0, 1024)*, and a *triangle*-query *Q* which is then executed on *D*.

```TypeScript
import Database from '../src';

const db = Database.open("/path/to/database");

db.createRelation("R", ["A", "B", "C"]);
db.createRelation("S", ["D", "E"]);
db.createRelation("T", ["F", "G", "H"]);

db.insert("R", [4, 603, 469]);
db.insert("R", [72, 367, 591]);
db.insert("S", [591, 57]);
db.insert("T", [56, 549, 488]);
db.insert("T", [57, 725, 72]);
db.insert("T", [57, 819, 234]);

const Ans = db.query("Q(a, b, c, d, e) <- R(a, b, c), S(c, d), T(d, e, a)");
console.log(Ans.toString());

db.close();
```
