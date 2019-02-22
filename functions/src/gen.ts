import * as fs from 'fs';
import * as parse from 'csv-parse/lib/sync';

import { HierarchyNode } from 'shared';

const h: { [key: string]: HierarchyNode } = {};

h[0] = {
  id: 0,
  name: 'IDN',
  depth: 0,
  parentIds: [],
  parentNames: [],
  children: [],
  aggregate: {}
};

const ids = parse(fs.readFileSync('src/ids.csv', 'utf-8'));
for (let i = 1; i + 1 < ids.length; i++) {
  const row = ids[i];
  for (let j = 0; j < row.length; j++) {
    row[j] = row[j].trim();
  }

  const [nTpsStr, lakiStr, perempuanStr, totalStr] = row.slice(8);
  const nTps = parseInt(nTpsStr.replace(/ |,/g, ''), 10);
  const laki = parseInt(lakiStr.replace(/ |,/g, ''), 10) || 0;
  const perempuan = parseInt(perempuanStr.replace(/ |,/g, ''), 10) || 0;
  const total = parseInt(totalStr.replace(/ |,/g, ''), 10);
  if (+laki + +perempuan !== +total) {
    throw new Error('Total mismatch: ' + row);
  }

  let node = h[0];
  for (let j = 0; j < 4; j++) {
    const cid = +row[j];
    const cname = row[4 + j];

    const k = node.children.findIndex(c => c[0] === cid);
    if (k === -1) {
      node.children.push([cid, cname, nTps, laki, perempuan]);
    } else {
      node.children[k][2] += nTps;
      node.children[k][3] += laki;
      node.children[k][4] += perempuan;
    }

    if (!h[cid]) {
      h[cid] = {
        id: cid,
        name: cname,
        depth: node.depth + 1,
        parentIds: node.parentIds.slice(),
        parentNames: node.parentNames.slice(),
        children: [],
        aggregate: {}
      };
      h[cid].parentIds.push(node.id);
      h[cid].parentNames.push(node.name);
    }
    node = h[cid];
  }
}

console.log('ok', h[0].children.reduce((p, c) => p + c[2], 0));
// console.log('ok', h[0].children.reduce((p, c) => p + c[3], 0));
// console.log('ok', h[0].children.reduce((p, c) => p + c[4], 0));
// console.log('ok', h[22135]);

const memo: any = {};
const dpt = fs.readFileSync('src/dpt.csv', 'utf-8');
const lines = parse(dpt);
for (let i = 1; i < lines.length; i++) {
  const row = lines[i];
  const [prop, kab, kec, kelIdStr, kel] = row;

  const kelId = parseInt(kelIdStr, 10);
  const tpsNo = parseInt(row[5], 10);
  const laki = parseInt(row[6], 10);
  const perempuan = parseInt(row[7], 10);
  const total = parseInt(row[8], 10);

  if (laki + perempuan !== total || !total) {
    throw new Error('gimana ini???');
  }

  const propId = h[0].children.filter(c => c[1] === prop).map(c => c[0])[0];
  if (!propId) {
    throw new Error(`Prop ${prop} not found`);
  }
  const kabId = h[propId].children.filter(c => c[1] === kab).map(c => c[0])[0];
  if (!kabId) {
    const key = `${prop},${kab}`;
    if (memo[key]) {
      continue;
    }
    memo[key] = true;
    console.log(`Kab ${key} not found`);
  }

  const kecId = h[kabId].children.filter(c => c[1] === kec).map(c => c[0])[0];
  if (!kecId) {
    const key = `${prop},${kab},${kec}`;
    if (memo[key]) {
      continue;
    }
    memo[key] = true;
    console.log(`Kec ${key} not found`);
  }

  const kid = h[kecId].children.filter(c => c[1] === kel).map(c => c[0])[0];
  if (+kelId !== kid) {
    const key = `${prop},${kab},${kec},${kel}  ${kelId}  !== ${kid}`;
    if (memo[key]) {
      continue;
    }
    memo[key] = true;
    console.log(`Kel ${key} not found`);
  }

  const node = h[+kelId];
  node.children.push([tpsNo, laki, perempuan]);
}

let maxTps = 0;
function rec(id, depth) {
  const node = h[id];
  if (depth === 4) {
    const len = node.children.length;
    if (len > maxTps) {
      maxTps = len;
      console.log('maxTps', len, id);
    }
    for (let i = 0; i < len; i++) {
      if (node.children[i][0] !== i + 1) {
        // console.log(JSON.stringify(node.children.map(c => c[0]).sort()));
        // throw new Error('Tps nomor gak urut');
      }
    }
    return len;
  }
  let ret = 0;
  for (const c of node.children) {
    if (rec(c[0], depth + 1) !== c[2]) {
      throw new Error('Ga sama tps');
    }
    ret += c[2];
  }
  return ret;
}

console.log('total tps', rec(0, 0));

fs.writeFileSync(`src/hierarchy.js`, `exports.H = ${JSON.stringify(h)};`);
console.log('all ok');
