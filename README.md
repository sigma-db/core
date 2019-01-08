# sigmaJS
This is an implementation of the *Tetris* join algorithm introduced in [Joins via Geometric Resolutions: Worst Case and Beyond](http://doi.org/10.1145/2967101) by Khamis et al.
The goal is to show that the algorithm admits a straightforward implementation after working out some details left unspecified in the paper itself.
In particular, we do *not* aim to provide a thoroughly optimised implementation!

## Setup

### Prerequisites
* If not already present, download and install [Node.js](https://nodejs.org). Depending on your operating system, the native package manager might be preferrable for the retrieval and installation of Node.js.
* Since the project is written in [TypeScript](https://www.typescriptlang.org/), it needs to be *transpiled* into JavaScript first. To this end, download and install the TypeScript compiler using `npm install -g typescript`.

### Build
* Build the project with `tsc` from within the project directory. This will generate corresponding JavaScript files in the `src` directory which Node.js can natively execute.

### Run
* Start the sample application with `node src/app.js`.

## Example
The following script creates a database *D* with three relations *R*, *S* and *T*, each of which with some tuples over the domain [0, 1024), and a *bowtie*-query *Q* which is then executed on *D*.

```TypeScript
import { database, query } from './sigmaJS';

const D = database({
    R: [[4, 603, 469], [15, 184, 631], [46, 296, 69], [46, 539, 64], [56, 549, 488], [57, 725, 72], [57, 819, 234], [57, 819, 640], [57, 999, 281], [72, 367, 591]],
	S: [[591, 57]],
	T: [[4, 603, 469], [15, 184, 631], [46, 296, 69], [46, 539, 64], [56, 549, 488], [57, 725, 72], [57, 819, 234], [57, 819, 640], [57, 999, 281], [113, 367, 591]]
});
const Q = query("Q(a, b, c, d, e) <- R(a, b, c), S(c, d), T(d, e, a)");
const Ans = Q(D);

console.log(Ans);
```
