start = create_stmt / insert_stmt / select_stmt / comment

/* clauses */
create_stmt = r:rel_name _ colon _ lbrace _ first:col_spec tail:(_ comma _ @col_spec)* _ rbrace { return { type: "create", rel: r, attrs: [first, ...tail] } }
col_spec = r:rel_name _ colon _ t:type { return { name: r, dataType: t } }

insert_stmt = r:rel_name _ lbrace _ first:literal tail:(_ comma _ @literal)* _ rbrace { return { type: "insert", rel: r, tuple: [first, ...tail] } }

select_stmt = head:atom _ larrow _ body:atom_list { return { type: "select", head: head, body: body} }
atom_list = left:atom right:(_ comma _ @atom)* { return [left, ...right] }
atom = name:rel_name lbrace _ vars:var_list _ rbrace { return { name: name, vars: vars} }
var_list = left:var_name right:(_ comma _ @var_name)* { return [left, ...right] }

/* comment */
comment "comment" = _ hash [^\r\n]*

/* identifiers */
var_name  "variable"   = id
rel_name  "relation"   = id
attr_name "attribute"  = id
id        "identifier" = [A-Za-z_][A-Za-z0-9_]* { return text() }
                       / lbracket t:[A-Za-z0-9_ ]+ rbracket { return t.join("") }

/* literals */
literal "literal"        = num / string
num     "number literal" = [1-9][0-9]* { return text() }
string  "string literal" = quote s:[^\"]* quote { return s.join("") }

/* tokens */
larrow   "<-" = "<-"
comma    ","  = ","
lbrace   "("  = "("
rbrace   ")"  = ")"
lbracket "["  = "["
rbracket "]"  = "]"
colon    ":"  = ":"
quote    "\"" = "\""
equals   "="  = "="
hash     "#" = "#"

/* types */
type    "type"    = int / varchar / bool
int     "int"     = ("integer"i / "int"i) { return "int" }
varchar "varchar" = "varchar"i _ lbrace _ num _ rbrace { return "varchar" }
bool    "bool"    = "bool"i { return "bool" }

/* whitespace */
_ "whitespace" = [ \t]*
