const fs = require('fs');

const assets_dir = '../web/src/assets';
const functions_dir = '../functions/src';
const raw = JSON.parse(fs.readFileSync('raw.js', 'utf-8'));
const NO_TPS = 0;
const TEMPAT_ID = 0;
const NAMA = 2;
const ANAK = 4;

const path = [];
const rootIds = {};
const rootId = {};
const data = {};
for (let i = 0; i < raw.length; i++) {
  data[raw[i][TEMPAT_ID]] = raw[i];
}

let maxTps = 0;
const parentIds = {};
const children = {};

function rec(id, name, depth) {
  // console.log(id, name, depth);
  const arr = data[id][ANAK];
  const node = id ? [id, name] : [];
  parentIds[id] = path.slice();
  const c = (children[id] = []);
  path.push(id);
  if (depth > 0) {
    if (!rootIds[path[1]]) rootIds[path[1]] = [];
    rootIds[path[1]].push(id);
    rootId[id] = path[1];
  }
  if (depth === 4) {
    for (const r of arr) {
      const tpsNo = +r[NO_TPS];
      const i = Math.floor(tpsNo / 30);
      while (i >= node.length - 2) node.push(0);
      node[i + 2] += Math.pow(2, tpsNo % 30);
      c.push(tpsNo);
    }
    if (arr.length > maxTps) {
      maxTps = arr.length;
      console.log('new max', id, name, maxTps);
    }
  } else {
    for (const r of arr) {
      const a = data[r];
      const cid = a[TEMPAT_ID];
      const cname = a[NAMA];
      const cnode = rec(cid, cname, depth + 1);
      c.push(cid);
      if (depth === 0) {
        node.push(cid);
        node.push(cname);
        fs.writeFileSync(`${assets_dir}/h/h${cid}.js`, JSON.stringify(cnode));
      } else {
        node.push(cnode);
      }
    }
  }
  path.pop();
  return node;
}

const h = rec(0, 'IDN', 0);
fs.writeFileSync(`${assets_dir}/h/h0.js`, JSON.stringify(h));

for (const rootId of Object.keys(rootIds)) {
  const ids = rootIds[rootId].sort((a, b) => a - b);
  let prev = 0;
  for (let i = 0; i < ids.length; i++) {
    const t = ids[i];
    ids[i] = ids[i] - prev;
    prev = t;
  }
  rootIds[rootId] = ids;
}

fs.writeFileSync(`${assets_dir}/r.js`, JSON.stringify(rootIds));

const hierarchy = `exports.ROOT_ID = ${JSON.stringify(rootId)};
exports.PARENT_IDS = ${JSON.stringify(parentIds)};
exports.CHILDREN = ${JSON.stringify(children)};
exports.ROOT_IDS = ${JSON.stringify(Object.keys(rootIds).map(i => +i))};`;
fs.writeFileSync(`${functions_dir}/hierarchy.js`, hierarchy);
