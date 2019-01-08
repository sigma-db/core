"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const box_1 = require("./box");
class Node {
    constructor(value) {
        this.value = value;
        this.children = new Array(2);
    }
}
class DyadicTrie {
    constructor() {
        this.root = new Node();
    }
    putIfAbsent(key, value) {
        const msb = Math.log2(key) | 0;
        let node = this.root;
        for (var i = msb - 1; i >= 0; i--) {
            let child = (key >> i) & 1;
            if (!node.children[child]) {
                node.children[child] = new Node();
            }
            node = node.children[child];
        }
        node.value = node.value || value;
        return node.value;
    }
    search(key) {
        let msb = Math.log2(key) | 0;
        let result = new Array();
        let node = this.root;
        do {
            if (node.value) {
                result.push([key >> msb, node.value]);
            }
            node = node.children[(key >> --msb) & 1];
        } while (!!node && msb >= 0);
        return result;
    }
}
class CDS {
    constructor() {
        this.data = new DyadicTrie();
    }
    insert(...boxes) {
        boxes.forEach(_b => {
            let trie = this.data;
            _b.forEach(s => {
                trie = trie.putIfAbsent(s, new DyadicTrie());
            });
        });
    }
    witnessAll(box) {
        const _cover = (dim, trie) => {
            const sub = trie.search(box.at(dim));
            if (dim == box.length - 1) {
                return sub.map(([_int,]) => [_int]);
            }
            else {
                return [].concat(...sub.map(([_int, _trie]) => _cover(dim + 1, _trie).map(b => [_int, ...b])));
            }
        };
        return _cover(0, this.data).map(b => new box_1.Box(b));
    }
    witness(box) {
        return this.witnessAll(box).shift();
    }
}
exports.CDS = CDS;
/*let trie = new DyadicTrie<string>();
trie.putIfAbsent(parseInt('0101', 2), 'z');
trie.putIfAbsent(parseInt('0010', 2), 'a');
trie.putIfAbsent(parseInt('1100', 2), 'b');
trie.putIfAbsent(parseInt('0111', 2), 'c');
let result = trie.search(parseInt('1100', 2)).map(([, str]) => str);
console.log(result);*/
/*const int = (bitstring: string) => parseInt(bitstring, 2);

const b1 = new Box([int('0010'), int('0010')]);
const b2 = new Box([int('0010'), int('0110')]);
const b3 = new Box([int('0100'), int('0001')]);
const b4 = new Box([int('0111'), int('0010')]);
const b5 = new Box([int('0001'), int('0101')]);

const w = new Box([int('1100'), int('1100')]);

let cds = new CDS();
cds.insert(b1, b2, b3, b4, b5);
let result = cds.witnessAll(w);

console.log(result);*/ 
//# sourceMappingURL=cds.js.map