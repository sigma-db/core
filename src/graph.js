"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
function toto(g6) {
    return new Promise((resolve, reject) => {
        http.get(`http://treedecompositions.com/backend/treewidth/?graph=${g6}`, resp => {
            let data = '';
            resp.on('data', chunk => data += chunk);
            resp.on('end', () => resolve(JSON.parse(data).decomposition));
        }).on("error", err => {
            reject(err.message);
        });
    });
}
exports.toto = toto;
//# sourceMappingURL=graph.js.map