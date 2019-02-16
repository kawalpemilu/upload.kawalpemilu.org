import * as fs from 'fs';
import { HierarchyNode } from 'shared';

const raw = JSON.parse(fs.readFileSync('raw.js', 'utf-8'));
const NO_TPS = 0;
const TEMPAT_ID = 0;
const NAMA = 2;
const ANAK = 4;

const data = {};
for (const r of raw) {
  data[r[TEMPAT_ID]] = r;
}

let maxTps = 0;
const h: { [key: string]: HierarchyNode } = {};
const path = [];

function rec(id, name, depth) {
  const arr = data[id][ANAK];
  h[id] = {
    id,
    name,
    depth,
    parentIds: path.map(p => p.id),
    parentNames: path.map(p => p.name),
    children: [],
    aggregate: {}
  };
  const c = h[id];
  path.push({ id, name });
  if (depth === 4) {
    for (const r of arr) {
      const tpsNo = +r[NO_TPS];
      c.children.push(tpsNo);
    }
    if (arr.length > maxTps) {
      maxTps = arr.length;
      console.log('new max', id, name, maxTps);
    }
  } else {
    for (const r of arr) {
      const a = data[r];
      const cid = a[TEMPAT_ID];
      rec(cid, a[NAMA], depth + 1);
      c.children.push(cid);
    }
  }
  path.pop();
}

rec(0, 'IDN', 0);

fs.writeFileSync(`hierarchy.js`, `exports.H = ${JSON.stringify(h)};`);
