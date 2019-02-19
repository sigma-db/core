﻿start = _ q:query _ { return q }
query = info_stmt / create_stmt / insert_stmt / select_stmt

/* info */
info_stmt = r:rel_name? _ question { return { type: "info", rel: r } }

/* create */
create_stmt = r:rel_name _ colon _ lbrace _ head:attr_spec tail:(_ comma _ @attr_spec)* _ rbrace { return { type: "create", rel: r, attrs: [head, ...tail] } }
attr_spec   = a:attr_name _ colon _ t:type { return { name: a, type: t.type, width: t.width } }

/* insert */
insert_stmt = r:rel_name _ lbrace _ t:tuple _ rbrace { return { type: "insert", rel: r, tuple: t } }
tuple       = head:unnamed_val tail:(_ comma _ @unnamed_val)* { return { type: "unnamed", vals: [head, ...tail] } }
            / head:named_val tail:(_ comma _ @named_val)* { return { type: "named", vals: [head, ...tail] } }
unnamed_val = v:literal { return { type: "literal", val: v } }
named_val   = a:attr_name _ equals _ v:literal { return { type: "literal", attr: a, val: v } }

/* select */
select_stmt = name:rel_name? _ lbrace _ attrs:named_tuple _ rbrace _ larrow _ body:select_body { return { type: "select", name: name, attrs: attrs, body: body } }
select_body = head:atom tail:(_ comma _ @atom)* { return [head, ...tail] }
atom        = r:rel_name _ lbrace _ t:named_tuple _ rbrace { return { type: "named", rel: r, vals: t } }
            / r:rel_name _ lbrace _ t:unnamed_tuple _ rbrace { return { type: "unnamed", rel: r, vals: t } }

/* free tuples */
named_tuple    = head:named_attr_val tail:(_ comma _ @named_attr_val)* { return [head, ...tail] }
unnamed_tuple  = head:attr_val tail:(_ comma _ @attr_val)* { return [head, ...tail] }
named_attr_val = a:attr_name _ equals _ v:attr_val { return { type: v.type, attr: a, val: v.val } }
attr_val       = v:literal { return { type: "literal", val: v } }
               / v:var_name { return { type: "variable", val: v } }

/* identifiers */
q_name    "query name" = id
var_name  "variable"   = id
rel_name  "relation"   = id
attr_name "attribute"  = id
id        "identifier" = [A-Za-z_][A-Za-z0-9_]* { return text() }
                       / lbracket t:[A-Za-z0-9_ ]+ rbracket { return t.join("") }

/* literals */
literal  "literal"         = lint / lstring/ lchar / lbool
lint     "integer literal" = ([1-9][0-9]* / "0") { return BigInt(text()) }
lstring  "string literal"  = dquote s:[^\"]* dquote { return [...s].reduce((result, current) => (result << 8n) + BigInt(current.charCodeAt(0) & 0xFF), 0n) }
lchar    "char literal"    = squote s:[^\'] squote { return BigInt(s.charCodeAt(0)) }
lbool    "bool literal"    = ltrue / lfalse
ltrue    "true"            = "true"i { return 1n }
lfalse   "false"           = "false"i { return 0n }

/* types */
type     "type"       = tint / tstring / tchar / tbool
width    "byte width" = [1-9][0-9]* { return Number(text()) }
tint     "integer"    = ("integer"i / "int"i) w:(_ lbrace _ @width _ rbrace)? { return { type: "int", width: w || 4 } }
tstring  "string"     = "string"i w:(_ lbrace _ @width _ rbrace)? { return { type: "string", width: w || 256 } }
tchar    "char"       = "char"i { return { type: "char", width: 1 } }
tbool    "bool"       = "bool"i { return { type: "bool", width: 1 } }

/* tokens */
larrow   "<-" = "<-"
comma    ","  = ","
lbrace   "("  = "("
rbrace   ")"  = ")"
lbracket "["  = "["
rbracket "]"  = "]"
colon    ":"  = ":"
squote   "'"  = "'"
dquote   "\"" = "\""
equals   "="  = "="
question "?"  = "?"

/* whitespace */
_ "whitespace" = [ \t]*
