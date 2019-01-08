"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sigmaJS_1 = require("../src/sigmaJS");
function genDB(m) {
    const E = [];
    E.push([0, m + 1]);
    E.push([m + 1, 2 * m + 2]);
    E.push([2 * m + 2, 0]);
    for (let i = 1; i <= m; i++) {
        E.push([0, m + 1 + i]);
        E.push([i, m + 1]);
        E.push([m + 1, 2 * m + 2 + i]);
        E.push([m + 1 + i, 2 * m + 2]);
        E.push([2 * m + 2, i]);
        E.push([2 * m + 2 + i, 0]);
    }
    return sigmaJS_1.database({ R: E, S: E, T: E });
}
const D = genDB(100);
const Q = sigmaJS_1.query("Q(a, b, c) <- R(a, b), S(b, c), T(c, a)");
const Ans = Q(D);
console.log(Ans);
//# sourceMappingURL=app.js.map