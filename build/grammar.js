const peg = require("pegjs");
const fs = require("fs");
const path = require("path");

const src = process.argv[2];    // the directory to read the grammars from
const dst = process.argv[3];    // the directory to put the generated parsers in

fs.mkdirSync(dst);
fs.readdirSync(src).forEach(f => {
    const _src = path.join(src, f);
    const _dst = path.join(dst, `${path.parse(f).name}.js`);

    const grammar = fs.readFileSync(_src, 'utf8');
    const parser = peg.generate(grammar, { output: "source", format: "commonjs" });

    fs.writeFileSync(_dst, parser);
});
