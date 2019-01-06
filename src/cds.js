"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function cds() {
    return { data: [] };
}
exports.cds = cds;
function insert(c, ...b) {
    c.data.push(...b);
}
exports.insert = insert;
function cover(c, b) {
    return c.data.find(_a => _a.contains(b));
}
exports.cover = cover;
//# sourceMappingURL=cds.js.map