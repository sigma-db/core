start = _ q:query _ semicolon { return q }
query = q:select_stmt { return { type: "select", query: q } }
      / q:use_stmt { return { type: "use", query: q } }

/* Statements */
select_stmt "select statement" = SELECT __ s:sel_list f:(__ FROM __ from_list (__ WHERE __ cond_list)?)? { return {select: s, from: f[3], where: f[4][3]} }
use_stmt    "use statement"    = USE __ d:db_name { return { database: d } }

/* Clauses */
sel_list  "selection list"     = first:sel rest:(_ comma _ @sel)* { return { type: "list", columns: [first, ...rest]} } 
                               / STAR { return { type: "*" } }
sel       "column reference"   = c:col_name a:(__ AS __ @alias)? { return !!a ? { column: c, alias: a } : { column: c } }
from_list "from list"          = first:from rest:(_ comma _ @from)* { return [first, ...rest] }
from      "table reference"    = t:table_name a:((__ AS)? __ @alias)? { return !!a ? { table: t, alias: a } : { table: t } } 
cond_list "condition list"     = first:cond rest:(__ AND __ @cond)* { return [first, ...rest] }
cond      "equality predicate" = left:col_name _ equals _ right:col_name { return  { left: left, right: right }}

/* Identifiers */
db_name    "database name" = id
table_name "table name"    = id
col_name   "column name"   = ref
alias      "alias"         = id
ref        "reference"     = x:id dot y:id { return { table: x, column: y } } 
                           / y:id { return { column: y } }
id         "identifier"    = [A-Za-z_][A-Za-z0-9_]* { return text() }
                           / lbracket t:[A-Za-z0-9_ ]+ rbracket { return t.join("") }

/* Keywords */
AND    "AND"    = "AND"i
AS     "AS"     = "AS"i
FROM   "FROM"   = "FROM"i
INSERT "INSERT" = "INSERT"i
INTO   "INTO"   = "INTO"i
SELECT "SELECT" = "SELECT"i
STAR   "*"      = "*"
USE    "USE"    = "USE"i
VALUES "VALUES" = "VALUES"i
WHERE  "WHERE"  = "WHERE"i

/* Operators */
dot      "." = "."
equals   "=" = "="
lbracket "[" = "["
rbracket "]" = "]"

/* Delimiters */
semicolon "semicolon"  = ";"
comma     "comma"      = ","
_         "whitespace" = [ \t\r\n]*
__        "whitespace" = [ \t\r\n]+
