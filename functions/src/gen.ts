import * as fs from 'fs';
import * as parse from 'csv-parse/lib/sync';

import {
  HierarchyNode,
  toChild,
  FORM_TYPE,
  IS_PLANO,
  SUM_KEY,
  SumMap,
  TpsAggregate
} from 'shared';

function toInt(s: string): number {
  const i = parseInt(s, 10);
  if (i !== +s) throw new Error('Nih:' + s);
  return i;
}

import { H } from './hierarchy';

const oldH: { [key: string]: HierarchyNode } = H;

const h: { [key: string]: HierarchyNode } = {
  '0': {
    id: 0,
    name: 'IDN',
    depth: 0,
    parentIds: [],
    parentNames: [],
    children: [],
    data: {},
    kpu: {},
    rekap: {}
  }
};

const dpt = fs.readFileSync('src/wilayah.csv', 'utf-8');
const lines = parse(dpt, { delimiter: '#' });
let tot = 0;
for (let i = 1; i < lines.length; i++) {
  const [
    KD_PRO,
    NAMA_PRO,
    KD_KAB,
    NAMA_KAB,
    KD_KEC,
    NAMA_KEC,
    KD_KEL,
    NAMA_KEL,
    TPS,
    LAKI,
    PEREMPUAN,
    TOTAL
  ] = lines[i];

  const ids = [toInt(KD_PRO), toInt(KD_KAB), toInt(KD_KEC), toInt(KD_KEL)];
  const names = [NAMA_PRO, NAMA_KAB, NAMA_KEC, NAMA_KEL];

  const tpsNo = toInt(TPS);
  const laki = toInt(LAKI);
  const perempuan = toInt(PEREMPUAN);
  const total = toInt(TOTAL);
  tot += total;

  if (laki + perempuan !== total || !total) {
    throw new Error('gimana ini???');
  }

  let node = h[0];
  for (let j = 0; j < 4; j++) {
    const cid = ids[j];
    const cname = names[j];

    const k = node.children.findIndex(c => c[0] === cid);
    if (k === -1) {
      node.children.push([cid, cname, 1, laki, perempuan]);
    } else {
      node.children[k][2] += 1;
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
        data: {},
        kpu: {},
        rekap: {}
      };
      h[cid].parentIds.push(node.id);
      h[cid].parentNames.push(node.name);
    }
    node = h[cid];
  }

  const propId = h[0].children.filter(c => c[1] === NAMA_PRO).map(c => c[0])[0];
  if (propId !== ids[0]) throw new Error(`Prop ${NAMA_PRO} not found`);

  const kabId = h[propId].children
    .filter(c => c[1] === NAMA_KAB)
    .map(c => c[0])[0];
  if (kabId !== ids[1]) throw new Error(`${NAMA_PRO},${NAMA_KAB}`);

  const kecId = h[kabId].children
    .filter(c => c[1] === NAMA_KEC)
    .map(c => c[0])[0];
  if (kecId !== ids[2]) throw new Error(`${NAMA_PRO},${NAMA_KAB},${NAMA_KEC}`);

  const kelId = h[kecId].children
    .filter(c => c[1] === NAMA_KEL)
    .map(c => c[0])[0];
  if (kelId !== ids[3])
    throw new Error(
      `${kelId} !== ${
        ids[3]
      }\n${NAMA_PRO},${NAMA_KAB},${NAMA_KEC},${NAMA_KEL}\n${JSON.stringify(
        h[kelId],
        null,
        2
      )}`
    );

  node.children.push([tpsNo, laki, perempuan]);
}

let maxTps = 0;
function rec(id, depth) {
  const node = h[id];
  const onode = oldH[id];
  if (depth === 4) {
    const len = node.children.length;
    if (len !== onode.children.length) throw new Error('Boom');
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
  const ochildren = onode.children.sort((a, b) => a[0] - b[0]);
  for (const [i, c] of node.children.entries()) {
    const oc = ochildren[i];
    if (c[0] !== oc[0]) {
      console.log('node', node);
      console.log('onode', onode);
      console.log('c', c);
      console.log('oc', oc);
      throw new Error('Boom ' + i);
    }
    if (c[1] !== oc[1]) {
      console.log('diff', c[1], oc[1]);
    }
    if (c[2] !== oc[2]) throw new Error('Boom');

    if (rec(c[0], depth + 1) !== c[2]) {
      throw new Error('Ga sama tps');
    }
    ret += c[2];
  }
  return ret;
}

console.log('total tps', rec(0, 0));

console.log('ok', h[0].children.reduce((p, c) => p + c[2], 0));
console.log('ok', h[0].children.reduce((p, c) => p + c[3], 0));
console.log('ok', h[0].children.reduce((p, c) => p + c[4], 0));
console.log(tot);

// fs.writeFileSync(`src/hierarchy.js`, `exports.H = ${JSON.stringify(h)};`);
// console.log('all ok');

function loadTest() {
  console.log(JSON.stringify(h).length);
  for (const id of Object.keys(h)) {
    const x = h[id];
    if (x.child) throw new Error(`xxx`);
    x.child = toChild(x);
    x.data = {};
    for (const [i, c] of x.children.entries()) {
      const agg = (x.data[c[0]] = {} as TpsAggregate);
      agg.ts = Date.now();
      agg.c1 = { type: FORM_TYPE.DPD, plano: IS_PLANO.NO, halaman: '0' };
      agg.sum = {} as SumMap;
      for (const key in SUM_KEY) {
        agg.sum[key] = Math.floor(Math.random() * 500);
      }
    }
  }
  console.log(JSON.stringify(h).length);

  console.log('finish');
  setTimeout(() => console.log('xxx'), 20000);
}
