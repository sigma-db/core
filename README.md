# sigmaJS
This is an implementation of the *Tetris* join algorithm introduced in [Joins via Geometric Resolutions: Worst Case and Beyond](http://doi.org/10.1145/2967101) by Khamis et al.
The goal is to show that the algorithm admits a straightforward implementation after working out some details left unspecified in the paper itself.
In particular, we do *not* aim to provide a thoroughly optimised implementation!

## Setup
* If not already present, download and install [Node.js](https://nodejs.org). Depending on your operating system, the native package manager might be preferrable for the retrieval and installation of Node.js.
* Since the project is written in [TypeScript](https://www.typescriptlang.org/), it needs to be *transpiled* into JavaScript first. To this end, download and install the TypeScript compiler using `npm install -g typescript`.

## Build
* Build the project with `tsc` from within the project directory. This will generate corresponding JavaScript files in the `src` directory which Node.js can natively execute.

## Run
* Start the application with `node src/app.js`.
