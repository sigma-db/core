# sigmaDB

## Setup
* If not already present, download and install [Node.js](https://nodejs.org). Depending on your operating system, the native package manager might be preferrable for the retrieval and installation of Node.js.
* Since the project is written in [TypeScript](https://www.typescriptlang.org/), it needs to be *transpiled* into JavaScript first. To this end, download and install the TypeScript compiler using `npm install -g typescript`.

## Build
* Build the project with `tsc --target ES2015 app.ts`. This will generate corresponding JavaScript files which Node.js can natively execute.

## Run
* Start the application with `node app.js`.
