import { Box } from './box';

interface CDS {
    data: Box[];
}

export function cds(): CDS {
    return <CDS>{ data: [] };
}

export function insert(c: CDS, ...b: Box[]) {
    c.data.push(...b);
}

export function cover(c: CDS, b: Box): Box {
    return c.data.find(_a => _a.contains(b))
}
