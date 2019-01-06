"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sigmaJS_1 = require("./sigmaJS");
const D = sigmaJS_1.database({
    R: [[4, 603, 469], [15, 184, 631], [46, 296, 69], [46, 539, 64], [56, 549, 488], [57, 725, 72], [57, 819, 234], [57, 819, 640], [57, 999, 281], [72, 367, 591]],
    S: [[591, 57]],
    T: [[4, 603, 469], [15, 184, 631], [46, 296, 69], [46, 539, 64], [56, 549, 488], [57, 725, 72], [57, 819, 234], [57, 819, 640], [57, 999, 281], [113, 367, 591]]
});
const Q = sigmaJS_1.query("Q(a, b, c, d, e) <- R(a, b, c), S(c, d), T(d, e, a)");
const Ans = Q(D);
console.log(Ans);
//# sourceMappingURL=app.js.map