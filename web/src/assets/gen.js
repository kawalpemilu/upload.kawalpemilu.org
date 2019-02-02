const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('raw.js', 'utf-8'));
const NO_TPS = 0;
const TEMPAT_ID = 0;
const NAMA = 2;
const ANAK = 4;

const parentIds = [];
const rootIds = {};
const data = {};
for (let i = 0; i < raw.length; i++) {
  data[raw[i][TEMPAT_ID]] = raw[i];
}

function rec(id, name, depth) {
  // console.log(id, name, depth);
  const arr = data[id][ANAK];
  const node = id ? [id, name] : [];
  parentIds.push(id);
  if (depth > 0) {
    if (!rootIds[parentIds[1]]) rootIds[parentIds[1]] = [];
    rootIds[parentIds[1]].push(id);
  }
  if (depth === 4) {
    for (const r of arr) {
      const tpsNo = +r[NO_TPS];
      const i = Math.floor(tpsNo / 30);
      while (i >= node.length - 2) node.push(0);
      node[i + 2] += Math.pow(2, tpsNo % 30);
    }
  } else {
    for (const r of arr) {
      const a = data[r];
      const cid = a[TEMPAT_ID];
      const cname = a[NAMA];
      const cnode = rec(cid, cname, depth + 1);
      if (depth === 0) {
        node.push(cid);
        node.push(cname);
        fs.writeFileSync(`h/h${cid}.js`, JSON.stringify(cnode));
      } else {
        node.push(cnode);
      }
    }
  }
  parentIds.pop();
  return node;
}

const h = rec(0, 'Nasional', 0);
fs.writeFileSync('h/h0.js', JSON.stringify(h));

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

fs.writeFileSync(`r.js`, JSON.stringify(rootIds));
