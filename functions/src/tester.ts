import * as admin from 'firebase-admin';
import * as request from 'request-promise';
import * as fs from 'fs';

import {
  UploadRequest,
  ImageMetadata,
  SumMap,
  FsPath,
  Relawan,
  RelawanPhotos,
  Aggregate,
  TpsData,
  ChangeLog,
  HierarchyNode,
  KpuData
} from 'shared';

import { upload } from './upload';
import { H } from './hierarchy';
import {
  getPathUrlPrefix,
  getCached,
  KPU_CACHE_PATH,
  KPU_WIL,
  KPU_REK
} from './upload_util';

const delay = (ms: number) => new Promise(_ => setTimeout(_, ms));

const fsdb = admin.firestore();

function makeRequest(kelId, tpsNo) {
  const imageId = `zzzzzzz${kelId}t${tpsNo}`;
  const meta = {} as ImageMetadata;
  const body: UploadRequest = {
    imageId,
    kelId,
    kelName: '',
    tpsNo,
    url: null,
    c1: null,
    sum: null,
    meta,
    ts: 0
  };
  return body;
}

function rec(id, depth, requests) {
  const arr = H[id].children;
  if (depth === 4) {
    for (const tpsNo of arr) {
      requests.push(makeRequest(id, tpsNo[0]));
    }
  } else {
    for (const cid of arr) {
      rec(cid[0], depth + 1, requests);
    }
  }
}

function generateRequests() {
  let requests: UploadRequest[] = [];

  rec(0, 0, requests);

  let seed = 14;
  for (let i = 0; i < requests.length; i++) {
    seed = (seed * 7 + i) % 1000007;
    const j = seed % (i + 1);
    if (i !== j) {
      const t = requests[i];
      requests[i] = requests[j];
      requests[j] = t;
    }
  }

  requests = requests.slice(0, 100000);
  console.log('len', requests.length);

  return requests;
}

async function parallelUpload(concurrency = 500) {
  const requests = generateRequests();
  const promises: any = [];
  for (let i = 0; i < concurrency && i < requests.length; i++) {
    promises.push(Promise.resolve());
  }
  for (let i = 0, j = 0; i < requests.length; i++) {
    const idx = i;
    const req = requests[i];
    promises[j] = promises[j].then(() => upload('', req));
    if (j === 0) {
      promises[j] = promises[j].then(() => console.log('i', idx));
    }
    j = (j + 1) % promises.length;
  }
  for (let i = 0; i < promises.length; i++) {
    const idx = i;
    promises[i] = promises[i].then(() => console.log('done', idx));
  }
  console.log('seted up');
  await Promise.all(promises);
  console.log('done all');
}

function power_of_2(n: number) {
  return n && (n & (n - 1)) === 0;
}

async function requestWithRetry(uri, nTries = 5) {
  return request({
    method: 'GET',
    uri,
    json: true
  }).catch(async e => {
    if (nTries > 0) {
      await delay(1000);
      return requestWithRetry(uri, nTries - 1);
    }
    throw e;
  });
}

async function loadTest() {
  const kelIds = Object.keys(H).filter(id => H[id].depth === 4);
  const promises = [];
  let nOk = 0;
  const n = Math.min(kelIds.length, 100000);
  const t0 = Date.now();
  const concurrency = 5000;
  for (let i = 0; i < concurrency; i++) {
    promises[i] = Promise.resolve();
  }
  for (let i = 0; i < n; i++) {
    const id = +kelIds[i];
    if (isNaN(id) || !id) throw new Error(`invalid id ${kelIds[i]}`);
    // const url = `https://upload.kawalpemilu.org/api/c/${id}?abracadabra=1`;
    const url = `https://kawal-c1.appspot.com/api/c/${id}`;
    const j = i % concurrency;
    promises[j] = promises[j].then(() =>
      requestWithRetry(url)
        .then(res => {
          if (res.id !== id) {
            throw new Error(`mismatch ${res.id} !== ${id}`);
          }
          if (++nOk % 10000 === 0 || power_of_2(nOk)) {
            const qps = Math.floor((1e3 * nOk) / (Date.now() - t0));
            console.log('nOk', nOk, 'qps', qps);
          }
        })
        .catch(e => console.error(`request failed: ${e.message}`))
    );
  }
  const t1 = Date.now();

  console.log(`requested ${n} kels in ${t1 - t0}`);
  await Promise.all(promises);

  const t2 = Date.now();
  console.log(`response in ${t2 - t1}, nOk = ${nOk}`);

  // Achieved 1000 RPS for read only APIs on firebase function.
  // Achieved 600-700 RPS for read only APIs on appspot.
}

async function fixClaimersRole() {
  const mods = await fsdb
    .collection(FsPath.relawan())
    .where('profile.role', '>', 0)
    .get();
  for (const snap of mods.docs) {
    const r = snap.data() as Relawan;
    console.log(snap.id, ' -> ', r.profile.role, r.profile.name);

    await fsdb.runTransaction(async t => {
      const rRef = fsdb.doc(FsPath.relawan(snap.id));
      const relawan = (await t.get(rRef)).data() as Relawan;
      if (!(relawan.profile.role > 0)) throw new Error(`Ga ada role`);
      if (!relawan.referrer) {
        console.log(`Ga ada referer ${snap.id} ${relawan.profile.name}`);
        return;
      }
      const referrerRef = fsdb.doc(FsPath.relawan(relawan.referrer.uid));
      const referrer = (await t.get(referrerRef)).data() as Relawan;
      const codes = Object.keys(referrer.code).filter(c => {
        const claimer = referrer.code[c].claimer;
        return claimer && claimer.uid === relawan.profile.uid;
      });
      if (codes.length !== 1) throw new Error(`Kode aneh`);
      const cr = referrer.code[codes[0]];
      if (cr.claimer.role !== relawan.profile.role) {
        console.log(
          `Set ${referrer.profile.name} -> ${cr.claimer.name} ${
            cr.claimer.role
          } -> ${relawan.profile.role}`
        );
        cr.claimer.role = relawan.profile.role;
        t.update(referrerRef, referrer);
      }
    });
    // throw new Error('halt');
  }
}

async function fixUploadersCount() {
  const mods = await fsdb.collection(FsPath.relawanPhoto()).get();
  for (const snap of mods.docs) {
    const photo = snap.data() as RelawanPhotos;
    // if (photo.nKel) continue;

    const pu = photo.uploads;
    const nTps = new Set(pu.map(up => up.kelId + '-' + up.tpsNo)).size;
    const nKel = new Set(pu.map(up => up.kelId)).size;
    const uploadCount = photo.uploads.length;
    console.log(
      `Updating ${photo.profile.name} : ${photo.uploadCount} ${nTps} ${nKel}`
    );

    await fsdb.doc(FsPath.relawanPhoto(snap.id)).update({
      nTps,
      nKel,
      uploadCount
    } as RelawanPhotos);
  }
}

async function checkHierarchy() {
  const h = JSON.parse(fs.readFileSync('h.json', 'utf8'));
  let cnt = 0;
  for (const id of Object.keys(h)) {
    const node = h[id];
    if (node.depth === 4) cnt++;
  }
  console.log('cnt', cnt);

  function agg(dst, src) {
    for (const key in src) {
      dst[key] = (dst[key] || 0) + src[key];
    }
  }

  function getUpsertData(parentId, childId): Aggregate {
    if (!h[parentId]) h[parentId] = {};
    const c = h[parentId];
    if (!c[childId]) c[childId] = { sum: {} as SumMap, ts: 0, c1: null };
    return c[childId];
  }

  function recCheck(id: number, depth: number) {
    const arr = H[id].children;
    const all = {};
    if (depth === 4) {
      for (const tpsNo of arr) {
        const sum = h[id] && h[id][tpsNo[0]] && h[id][tpsNo[0]].sum;
        if (sum) agg(all, sum);
      }
    } else {
      for (const cid of arr) {
        const csum = recCheck(cid[0], depth + 1);
        const ch = getUpsertData(id, cid[0]);
        for (const key in ch.sum) {
          if (ch.sum[key] !== csum[key]) {
            console.log('wrong', id, H[id].name, key, ch.sum[key], csum[key]);
            ch.sum[key] = csum[key];
          }
        }
        const c = H[cid[0]];
        for (const key in csum) {
          if (ch.sum[key] !== csum[key]) {
            console.log(
              'missing',
              cid[0],
              c.name,
              c.depth,
              key,
              ch.sum[key],
              csum[key]
            );
            ch.sum[key] = csum[key];
          }
        }
        agg(all, csum);
      }
    }
    return all;
  }
  recCheck(0, 0);
}

const conc = [];
async function recKpuHie(id, depth, opath) {
  console.log('id', id, depth);
  const path = opath.concat(id);
  const url = getPathUrlPrefix(KPU_WIL, path) + '.json';
  const cacheFn = `${KPU_CACHE_PATH}/w${id}.json`;
  const wil = await getCached(url, cacheFn, () => true);

  if (depth === 4) {
    return;
  }

  let j = 0;
  for (const cid of Object.keys(wil)) {
    if (id === -99) {
      const cpath = path.slice();
      for (let i = 0; i < 2; i++) {
        cpath.push(+cid - i);
      }
      conc[j] = conc[j].then(() => recKpuHie(+cid - 2, depth + 3, cpath));
    } else {
      conc[j] = conc[j].then(() => recKpuHie(+cid, depth + 1, path));
    }
    j = (j + 1) % conc.length;
  }
}

async function crawlKpuHie() {
  for (let i = 0; i < 5; i++) {
    conc.push(Promise.resolve());
  }
  await recKpuHie(0, 0, []);
  await Promise.all(conc);
}

function buildKpuWil() {
  const kpuWil = {};
  function recKpuWil(id, depth, path) {
    const cacheFn = `${KPU_CACHE_PATH}/w${id}.json`;
    kpuWil[id] = JSON.parse(fs.readFileSync(cacheFn, 'utf8'));

    if (depth === 4) {
      return;
    }

    for (const key of Object.keys(kpuWil[id])) {
      const cid = +key;
      if (id === -99) {
        const cpath = path.slice();
        for (let i = 0; i < 2; i++) {
          cpath.push(cid - i);
        }
        const nid = cid - 2;
        recKpuWil(nid, depth + 3, cpath.concat(nid));
      } else {
        recKpuWil(cid, depth + 1, path.concat(cid));
      }
    }
  }

  recKpuWil(0, 0, []);
  fs.writeFileSync(`${KPU_CACHE_PATH}/kpuWil.js`, JSON.stringify(kpuWil));
}

async function fixPemandangan() {
  const mods = await fsdb.collection('t2').get();
  for (const snap of mods.docs) {
    const t = snap.data() as TpsData;
    for (const imageId of Object.keys(t.images)) {
      const i = t.images[imageId];
      if (i.c1 && i.c1.type === 10) {
        console.log(snap.id, imageId);
      }
    }
  }
}

async function whoChangedRole() {
  const logs = await fsdb
    .collection(FsPath.changeLog())
    .where('tuid', '==', 'ApCcXyy0ecS1As3nqHwZ8p8hOBI2')
    .get();
  for (const snap of logs.docs) {
    const log = snap.data() as ChangeLog;
    console.log(log);
  }
}

async function fixHierarchy() {
  async function recHie(id, depth, opath) {
    const path = opath.slice();
    path.push(id);

    const h = H[id];
    if (!h) throw new Error(`unknown id ${id} ${path}`);

    const url =
      getPathUrlPrefix(KPU_WIL, depth === 0 ? path.concat(0) : path) + '.json';
    const res = await getCached(
      url,
      `${KPU_CACHE_PATH}/w${id}.json`,
      c => false
    );

    let nChildren = 0;
    if (depth === 4) {
      const exTps = {};
      h.children.forEach(c => {
        exTps[c[0]] = 1;
        if (c[0] > 1000 && id >= 0) {
          throw new Error('toobig ' + id + ' ' + c[0]);
        }
      });

      for (const tid of Object.keys(res)) {
        const s = res[tid].nama.split(' ');
        if (s[0] !== 'TPS' && s[0] !== 'POS' && s[0] !== 'KSK')
          throw new Error(`nama: ${s[0]}`);
        const tpsNo = parseInt(s[1], 10);
        if (!exTps[tpsNo] && id >= 0) {
          let j = h.children.length;
          for (let i = 0; i < h.children.length; i++) {
            if (h.children[i][0] > tpsNo) {
              j = i;
              break;
            }
          }
          console.error('Missing TPS', id, tpsNo, h.children);
          h.children.splice(j, 0, [tpsNo, -1, -1]);
        }
        nChildren++;
      }
    } else {
      const cids = {};
      h.children.forEach(c => (cids[c[0]] = 1));

      if (depth < 2) {
        for (const cid of Object.keys(res)) {
          if (!cids[cid]) throw new Error();
          nChildren++;
          await recHie(+cid, depth + 1, path);
        }
      } else {
        const promises = [];
        for (const key of Object.keys(res)) {
          const cid = +key;
          const cname = res[cid].nama;
          if (!cids[cid]) {
            if (H[cid]) {
              console.log('ADA TAPI MISSING', cid, cname, id);
              if (H[cid].depth !== 4) throw new Error(H[cid].depth);
              nChildren--;
            } else {
              const names = h.parentNames.slice();
              names.push(h.name);
              const nTps = await addTpsLn(cid, cname, depth + 1, path, names);
              h.children.push([cid, cname, nTps, -1, -1]);
              console.log('\n\n\nadded', cid, cname);
            }
          }
          nChildren++;
          promises.push(recHie(+cid, depth + 1, path));
        }
        await Promise.all(promises);
      }
      if (
        nChildren > h.children.length &&
        id !== 83553 &&
        id !== 72398 &&
        id !== 930135
      ) {
        // console.error('here', nChildren, h.children.length, path, res, h);
        throw new Error(`Child mismatch ${nChildren} != ${h.children.length}`);
      }
    }
  }

  async function addTpsLn(id, name, depth, parentIds, parentNames) {
    if (H[id]) throw new Error();
    const children = [];
    H[id] = { id, name, depth, parentIds, parentNames, children, data: {} };

    const path = parentIds.slice();
    path.push(id);
    const names = parentNames.slice();
    names.push(name);
    const url = getPathUrlPrefix(KPU_WIL, path) + '.json';
    const res = await getCached(
      url,
      `${KPU_CACHE_PATH}/w${id}.json`,
      c => false
    );
    // console.log(id, res);

    if (depth === 4) {
      for (const key of Object.keys(res)) {
        const s = res[key].nama.split(' ');
        let tpsNo = parseInt(s[1], 10);
        if (tpsNo > 795) throw new Error('' + tpsNo);
        if (s[0] === 'TPS') {
          // if (tpsNo > 90) throw new Error('' + tpsNo);
        } else if (s[0] === 'POS') {
          tpsNo += 1000;
        } else if (s[0] === 'KSK') {
          tpsNo += 2000;
        }
        children.push([tpsNo, -1, -1]);
      }
      console.log('t', H[id]);
      return children.length;
    }

    let totTps = 0;
    for (const key of Object.keys(res)) {
      const cid = +key;
      const cname = res[cid].nama;
      const nTps = await addTpsLn(cid, cname, depth + 1, path, names);
      children.push([cid, cname, nTps, -1, -1]);
      totTps += nTps;
    }
    console.log('h', H[id]);
    return totTps;
  }

  if (!H[-99]) {
    const nTps = await addTpsLn(-99, 'Luar Negeri', 1, [0], ['IDN']);
    H[0].children.push([-99, 'Luar Negeri', nTps, -1, -1]);
    console.log('Tot TPS LN', nTps);
  }

  const m = H[18880].children.find(a => a[0] === 931304);
  if (m) {
    m[0] = 18887;
    console.log(H[18880]);
  }

  await recHie(0, 0, []);

  const hieFn = '/Users/felixhalim/Projects/kawal-c1/kpu/hierarchy.js';
  fs.writeFileSync(hieFn, `exports.H = ${JSON.stringify(H)};`);
}

async function fixTpsCount() {
  function recTpsCount(id, depth): number {
    let nTps = 0;
    const arr = H[id].children;
    if (depth === 4) {
      nTps = arr.length;
    } else {
      for (const a of arr) {
        const cid = a[0];
        a[2] = recTpsCount(cid, depth + 1);
        nTps += a[2];
      }
    }
    return nTps;
  }

  console.log(H[0]);
  console.log('nTPS', recTpsCount(0, 0));
  console.log(H[0]);

  const hieFn = '/Users/felixhalim/Projects/kawal-c1/functions/hierarchy.js';
  fs.writeFileSync(hieFn, `exports.H = ${JSON.stringify(H)};`);
}

async function laporKpuCount() {
  const laporKpus = [];
  (await fsdb
    .collection(FsPath.relawanPhoto())
    .orderBy('laporKpuCount', 'desc')
    .limit(128)
    .get()).forEach(snap => {
    const r = snap.data() as RelawanPhotos;
    laporKpus.push({
      profile: r.profile,
      laporKpuCount: r.laporKpuCount
    });
  });
  console.log(JSON.stringify(laporKpus, null, 2));
}

async function moderators() {
  (await fsdb
    .collection(FsPath.relawan())
    .where('profile.role', '>=', 1)
    .get()).forEach(snap => {
    const r = snap.data() as Relawan;
    const p = r.profile;
    console.log(p.role, p.uid, p.name, p.dr4, r.depth);
  });
}

async function kpuDiff() {
  const kpuWilFn = `${KPU_CACHE_PATH}/kpuWil.js`;
  const kpuWil = JSON.parse(fs.readFileSync(kpuWilFn, 'utf8'));
  const funPath = '/Users/felixhalim/Projects/kawal-c1/functions';
  const hJson = JSON.parse(fs.readFileSync(`${funPath}/h.json`, 'utf8'));

  function recKpuDiff(id, name, depth, path, names) {
    const h = H[id] as HierarchyNode;
    const k = kpuWil[id];
    if (!h || !k) throw new Error();

    if (id >= 0) {
      if (JSON.stringify(names) !== JSON.stringify(h.parentNames)) {
        // console.log(JSON.stringify(names));
        // console.log(JSON.stringify(h.parentNames));
        console.log(
          `if (id === ${id}) h.parentNames = ${JSON.stringify(names)};`
        );
      }

      const p = JSON.parse(JSON.stringify(path));
      p.splice(0, 0, 0);
      p.pop();
      if (JSON.stringify(p) !== JSON.stringify(h.parentIds)) {
        // console.log(p);
        // console.log(h.parentIds);
        console.log(`if (id === ${id}) h.parentIds = ${JSON.stringify(p)};`);
      }
    }

    const nKpu = Object.keys(k).length;
    if (depth === 4) {
      function deleteTpsNo(tpsNo) {
        const idx = h.children.findIndex(c => c[0] === tpsNo);
        if (idx < 0) throw new Error();
        const [deletedTpsNo, laki] = h.children.splice(idx, 1)[0];
        if (deletedTpsNo !== tpsNo) throw new Error();
        if (!hJson[id]) {
          console.log('gada hjson', id, tpsNo);
          return;
        }
        const data = hJson[id][tpsNo];
        if (!data) return;
        for (const key of Object.keys(data.sum)) {
          if (data.sum[key]) {
            console.log('ada sum', key, id, tpsNo, laki, data);
            console.log('h', h);
            console.log('k', k);
            // console.log('h', JSON.stringify(h, null, 2));
            // console.log('k', JSON.stringify(k, null, 2));
            throw new Error();
          }
        }
        if (Object.keys(data.photos).length) {
          throw new Error(`Ada photos ${data.photos}`);
        }
      }

      // if (h.children.length > nKpu) {
      //   if (path.indexOf(23189) === -1) {
      //     while (h.children.length > nKpu) {
      //       const [tpsNo] = h.children[h.children.length - 1];
      //       deleteTpsNo(tpsNo);
      //     }
      //   } else {
      //     for (let i = 0; i < h.children.length; i++) {
      //       const [tpsNo, laki] = h.children[i];
      //       if (laki === -1) {
      //         deleteTpsNo(tpsNo);
      //         i--;
      //       }
      //     }
      //   }
      // }

      const nKp = h.children.length;
      if (nKp !== nKpu) {
        console.log('kel', id, nKp, nKpu);
        console.log('h', h);
        console.log('k', k);
        process.exit(0);
      }

      if (id >= 0 && path.indexOf(3205) === -1 && path.indexOf(23189) === -1) {
        for (let i = 1; i < h.children.length; i++) {
          const [a] = h.children[i - 1];
          const [b] = h.children[i];
          if (a + 1 !== b) throw new Error(`id: ${id}, ${a} + 1 != ${b}`);
        }
      }

      return nKpu;
    }

    const x = JSON.stringify(Object.keys(kpuWil[id]).map(c => parseInt(c, 10)));
    const y = JSON.stringify(h.children.map(c => c[0]));
    if (x !== y && id >= 0) {
      console.log(x);
      console.log(y);
      throw new Error();
    }

    let nTps = 0;
    let s = '';
    const arr = h.children.map(c => c[0]);
    for (const key of Object.keys(kpuWil[id])) {
      const cid = +key;
      const cnama = kpuWil[id][key].nama;
      const i = arr.indexOf(cid);
      if (i === -1) {
        s += `\tH[id].children.push([${cid}, 'RADA MALANDO', -1, 390, 436]);\n`;
        continue;
      }
      if (arr.splice(i, 1)[0] !== cid) throw new Error();

      let tpsCount = 0;
      if (id === -99) {
        const cpath = path.slice();
        for (let i = 0; i < 2; i++) {
          cpath.push(cid - i);
        }
        const nid = cid - 2;
        tpsCount = recKpuDiff(
          nid,
          cnama,
          depth + 3,
          cpath.concat(nid),
          names.concat(name)
        );
      } else {
        tpsCount = recKpuDiff(
          cid,
          cnama,
          depth + 1,
          path.concat(cid),
          names.concat(name)
        );
      }
      nTps += tpsCount;
      h.children[h.children.findIndex(c => c[0] === cid)][2] = tpsCount;
    }

    if (s) {
      console.log(`\nif (id === ${id}) {\n${s}}\n`);
      process.exit(0);
    }

    if (arr.length) {
      console.log(`\nif (id === ${id}) {`);
      for (const x of arr) {
        console.log(`\tremoveKel(${x});`);
      }
      console.log(`}\n`);
      throw new Error();
    }

    return nTps;
  }

  const tot1 = recKpuDiff(0, 'IDN', 0, [], []);
  const tot2 = H[0].children.map(c => c[2]).reduce((a, b) => a + b, 0);
  console.log('tot', tot1);
  if (tot1 !== tot2) throw new Error();

  // const hieFn = `${funPath}/src/hierarchy.js`;
  // fs.writeFileSync(hieFn, `exports.H = ${JSON.stringify(H)};`);
}

function laporKpuKelIds() {
  const h = JSON.parse(fs.readFileSync('h.json', 'utf8'));
  const arr = [];
  for (const id of Object.keys(h)) {
    if (H[id].depth !== 4) continue;
    const node = h[id];
    for (const tpsNo of Object.keys(node)) {
      const t = node[tpsNo];
      if (t.sum.laporKpu) {
        // console.log(id, tpsNo, t);
        arr.push(+id);
        break;
      }
    }
  }
  console.log(JSON.stringify(arr));
}

async function fetchKpuRekap() {
  const kpuWilFn = `${KPU_CACHE_PATH}/kpuWil.js`;
  const kpuWil = JSON.parse(fs.readFileSync(kpuWilFn, 'utf8'));
  let savettl = 100;

  function saveIt() {
    const funPath = '/Users/felixhalim/Projects/kawal-c1/functions';
    const hieFn = `${funPath}/src/hierarchy.js`;
    fs.writeFileSync(hieFn, `exports.H = ${JSON.stringify(H)};`);
    console.log('saved');
  }

  async function recKpuRekap(id, depth, path) {
    if (depth === 4) return;

    const h = H[id] as HierarchyNode;
    const k = kpuWil[id];
    if (!h || !k) throw new Error();

    let url = KPU_REK;
    for (let i = 0; i < path.length; i++) {
      url += `/${path[i]}`;
    }

    if (!h.rekap) {
      const rekap = await getCached(url + '.json');
      if (!rekap.table || !Object.keys(rekap.table).length) {
        console.error('No table for ', id);
        return;
      }

      h.rekap = {} as KpuData;
      for (const key of Object.keys(rekap.table)) {
        const t = rekap.table[key];
        if (t['21'] === undefined || t['22'] === undefined) throw new Error();
        h.rekap[key] = {
          pas1: t['21'],
          pas2: t['22']
        } as SumMap;
      }

      if (--savettl <= 0) {
        savettl = 100;
        saveIt();
      }
    }

    for (const key of Object.keys(kpuWil[id])) {
      const cid = +key;
      if (id === -99) {
        const cpath = path.slice();
        for (let i = 0; i < 2; i++) {
          cpath.push(cid - i);
        }
        const nid = cid - 2;
        await recKpuRekap(
          nid,
          depth + 3,
          cpath.concat(nid)
        );
      } else {
        continue;
        await recKpuRekap(cid, depth + 1, path.concat(cid));
      }
    }
  }

  console.log(H[-99].rekap);

  // await recKpuRekap(0, 0, []);

  // saveIt();
}

// parallelUpload().catch(console.error);
// loadTest().catch(console.error);
// fixClaimersRole().catch(console.error);
// fixUploadersCount().catch(console.error);
// checkHierarchy().catch(console.error);
// fixPemandangan().catch(console.error);
// whoChangedRole().catch(console.error);
// fixHierarchy().catch(console.error);
// fixTpsCount().catch(console.error);

// console.log(Object.keys(H).map(i => +i).reduce((p, c) => Math.max(p, c), 0));

// laporKpuCount().catch(console.error);
// moderators().catch(console.error);
// kpuDiff().catch(console.error);
// crawlKpuHie().catch(console.error);
// buildKpuWil();
// laporKpuKelIds();
fetchKpuRekap().catch(console.error);
