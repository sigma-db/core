program = queries:(@query ";" _)* { return queries }
query   = _ q:select_stmt _ { return { type: "select", query: q } }

/* Statements */
select_stmt "select statement" = SELECT __ s:sel_list f:(__ FROM __ from_list (__ WHERE __ cond_list)?)? { return {select: s, from: f[3], where: f[4][3]} }

/* Clauses */
sel_list  "selection list"     = first:sel rest:(_ "," _ @sel)* { return { type: "list", columns: [first, ...rest]} } 
                               / STAR { return { type: "*" } }
sel       "column reference"   = c:col_name a:(__ AS __ @alias)? { return !!a ? { column: c, alias: a } : { column: c } }
from_list "from list"          = first:from rest:(_ "," _ @from)* { return [first, ...rest] }
from      "table reference"    = t:table_name a:((__ AS)? __ @alias)? { return !!a ? { table: t, alias: a } : { table: t } } 
cond_list "condition list"     = first:cond rest:(__ AND __ @cond)* { return [first, ...rest] }
cond      "equality predicate" = left:col_name _ "=" _ right:col_name { return  { left: left, right: right }}

/* Identifiers */
db_name    "database name" = id
table_name "table name"    = id
col_name   "column name"   = ref
alias      "alias"         = id
ref        "reference"     = x:id "." y:id { return { table: x, column: y } } 
                           / y:id { return { column: y } }
id         "identifier"    = [A-Za-z_][A-Za-z0-9_]* { return text() }
                           / "[" t:[A-Za-z0-9_ ]+ "]" { return t.join("") }

/* Keywords */
AND    "AND"    = "AND"i
AS     "AS"     = "AS"i
FROM   "FROM"   = "FROM"i
INSERT "INSERT" = "INSERT"i
INTO   "INTO"   = "INTO"i
SELECT "SELECT" = "SELECT"i
STAR   "*"      = "*"
VALUES "VALUES" = "VALUES"i
WHERE  "WHERE"  = "WHERE"i

/* Delimiters */
_         "whitespace" = [ \t\r\n]*
__        "whitespace" = [ \t\r\n]+
