import Database from '../src';

const db = Database.open("C:\\Users\\david\\OneDrive\\Desktop\\test_db");

/*db.createRelation("R", ["A", "B", "C"]);
db.createRelation("S", ["D", "E"]);
db.createRelation("T", ["F", "G", "H"]);

db.insert("R", [4, 603, 469]);
db.insert("R", [15, 184, 631]);
db.insert("R", [46, 296, 69]);
db.insert("R", [46, 539, 64]);
db.insert("R", [56, 549, 488]);
db.insert("R", [57, 725, 72]);
db.insert("R", [57, 819, 234]);
db.insert("R", [57, 819, 640]);
db.insert("R", [57, 999, 281]);
db.insert("R", [72, 367, 591]);
db.insert("S", [591, 57]);
db.insert("T", [4, 603, 469]);
db.insert("T", [15, 184, 631]);
db.insert("T", [46, 296, 69]);
db.insert("T", [46, 539, 64]);
db.insert("T", [56, 549, 488]);
db.insert("T", [57, 725, 72]);
db.insert("T", [57, 819, 234]);
db.insert("T", [57, 819, 640]);
db.insert("T", [57, 999, 281]);
db.insert("T", [113, 367, 591]);*/

const Ans = db.query("Q(a, b, c, d, e) <- R(a, b, c), S(c, d), T(d, e, a)");
console.log(Ans.toString());

db.close();
