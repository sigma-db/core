query = head:atom _ "<-" _ body:atom_list { return { head: head, body: body} }
atom_list = left:atom right:(_ "," _ @atom)* { return [left, ...right] }
atom = name:rel "(" _ vars:var_list _ ")" { return { name: name, vars: vars} }
var_list = left:var right:(_ "," _ @var)* { return [left, ...right] }
var = [a-z]+ { return text() }
rel = [A-Z]+ { return text() }
_ = [ \t]*
