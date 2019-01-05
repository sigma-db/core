import * as http from 'http';

export function toto(g6: string): Promise<object> {
    return new Promise((resolve, reject) => {
        http.get(`http://treedecompositions.com/backend/treewidth/?graph=${g6}`, resp => {
            let data = '';
            resp.on('data', chunk => data += chunk);
            resp.on('end', () => resolve(JSON.parse(data).decomposition));
        }).on("error", err => {
            reject(err.message);
        });
    });
}
