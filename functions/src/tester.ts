import * as admin from 'firebase-admin';
import * as request from 'request-promise';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { spawn } from 'child_process';

import {
  UploadRequest,
  ImageMetadata,
  SumMap,
  FsPath,
  Relawan,
  RelawanPhotos,
  Aggregate,
  autoId,
  TpsData,
  HierarchyNode,
  KPU_SCAN_UID,
  ChangeLog,
  SUM_KEY,
  KpuData
} from 'shared';

import { H } from './hierarchy';
import { kpuH } from './kpuh';

const delay = (ms: number) => new Promise(_ => setTimeout(_, ms));

admin.initializeApp({
  credential: admin.credential.cert(require('./sa-key.json')),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const auth = admin.auth();
const fsdb = admin.firestore();

const KPU_API = 'https://pemilu2019.kpu.go.id/static/json/hhcw/ppwp';
const KPU_WIL = 'https://pemilu2019.kpu.go.id/static/json/wilayah';

const LOCAL_FS = '/Users/felixhalim/Projects/kawal-c1/kpu/cache';
const proxy = 'socks5h://localhost:12345';
const isOffline = false;
let isShutdown = false;

interface User {
  uid: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

async function curl(url): Promise<string> {
  return new Promise((resolve, reject) => {
    const c = spawn('curl', ['-s', '--proxy', proxy, '-m', 60, url]);
    let s = '';
    c.stdout.on('data', data => (s += data));
    c.on('close', code => {
      if (code) reject(new Error(`Exit code ${code}`));
      else resolve(s);
    });
  });
}

async function download(url, output): Promise<void> {
  return new Promise((resolve, reject) => {
    const params = ['-s', '--proxy', proxy, '-m', 60, '--output', output, url];
    const c = spawn('curl', params);
    c.on('close', code => {
      if (code) {
        reject(new Error(`Download error: ${url}, code: ${code}`));
        return;
      }
      try {
        if (fs.statSync(output).size < 10 << 10) {
          fs.unlinkSync(output);
          reject(new Error(`Image too small: ${url}`));
          return;
        }
        console.log('Downloaded', url);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function gsutilCopy(src, destination) {
  return new Promise((resolve, reject) => {
    const dst = `gs://kawal-c1.appspot.com/${destination}`;
    const params = ['cp', src, dst];
    const c = spawn('gsutil', params);
    let s = '';
    let e = '';
    c.stdout.on('data', data => (s += data));
    c.stderr.on('data', data => (e += data));
    c.on('close', code => {
      if (code)
        reject(new Error(`Exit code ${code}\nstdout:\n${s}\nstderr:\n${e}\n`));
      else resolve(s);
    });
  });
}

async function getWithRetry(url) {
  // console.log('fetching', url);
  for (let i = 0; ; i++) {
    try {
      return await curl(url);
    } catch (e) {
      if (i >= 3) {
        console.error('get retry', i, e.message);
        return JSON.stringify({ table: {}, images: [] });
      }
    }
  }
}

async function getCached(url, cachedFilename = null, inProgressFn = null) {
  if (cachedFilename) {
    let cacheJson: string;
    let cache: any;
    try {
      cacheJson = fs.readFileSync(cachedFilename, 'utf8');
      cache = JSON.parse(cacheJson);
      if (!inProgressFn(cache)) return cache;
    } catch (e) {}
  }

  try {
    const res = JSON.parse(await getWithRetry(url));
    if (cachedFilename) {
      const resJson = JSON.stringify(res);
      fs.writeFileSync(cachedFilename, resJson);
    }
    return res;
  } catch (e) {
    console.error(e.message);
    return { table: {}, images: [] };
  }
}

function getPathUrlPrefix(prefix, path) {
  let url = prefix;
  for (let i = 1; i < path.length; i++) {
    url += `/${path[i]}`;
  }
  return url;
}

function md5(str) {
  return crypto
    .createHash('md5')
    .update(str)
    .digest('hex');
}

async function reauthenticate(
  uri: string,
  body: any,
  uid: string,
  idTokenKey: string,
  refreshTokenKey: string,
  expiresInKey: string
) {
  const res: any = await request({
    method: 'POST',
    uri: uri + '?key=AIzaSyD3RdvSldm6B1xjhxhVDjib4dZANo1xtTQ',
    body,
    json: true
  });
  console.log('res', res);
  const expiresIn = +res[expiresInKey];
  const user = {
    uid,
    idToken: res[idTokenKey],
    refreshToken: res[refreshTokenKey],
    expiresIn,
    expiresAt: expiresIn * 1000 + Date.now()
  };
  fs.writeFileSync(`${user.uid}.json`, JSON.stringify(user, null, 2));
  return user;
}

async function autoRenewIdToken(user: User) {
  if (!user.refreshToken) {
    console.log('setup user', user.uid);
    return await reauthenticate(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCustomToken`,
      { token: user.idToken, returnSecureToken: true },
      user.uid,
      'idToken',
      'refreshToken',
      'expiresIn'
    );
  }

  if (user.expiresAt < Date.now() + 2 * 60 * 1000) {
    console.log('refresh id token', user);
    return await reauthenticate(
      `https://securetoken.googleapis.com/v1/token`,
      { grant_type: 'refresh_token', refresh_token: user.refreshToken },
      user.uid,
      'id_token',
      'refresh_token',
      'expires_in'
    );
  }

  return user;
}

async function getUser(uid: string) {
  let userJson;
  try {
    userJson = fs.readFileSync(`${uid}.json`, 'utf8');
  } catch (e) {
    const idToken = await auth.createCustomToken(uid);
    userJson = JSON.stringify({ uid, idToken }, null, 2);
    fs.writeFileSync(`${uid}.json`, userJson);
  }
  return await autoRenewIdToken(JSON.parse(userJson) as User);
}

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

async function upload(uid, body: UploadRequest) {
  const user = await getUser(uid);
  return await request({
    method: 'POST',
    uri: 'https://upload.kawalpemilu.org/api/upload',
    body,
    headers: {
      Authorization: `Bearer ${user.idToken}`
    },
    timeout: 60000,
    json: true
  });
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

async function kpuUploadImage(kelId, tpsNo, filename: string) {
  const stats = fs.statSync(filename);

  if (stats.size < 10 << 10) {
    throw new Error(`Image too small ${kelId} ${tpsNo}`);
  }

  const h: HierarchyNode = H[kelId];
  if (!h.children.find(c => c[0] === tpsNo)) {
    throw new Error(`TPS not found ${kelId} ${tpsNo}`);
  }

  const imageId = autoId();
  const destination = `uploads/${kelId}/${tpsNo}/${KPU_SCAN_UID}/${imageId}`;

  await gsutilCopy(filename, destination);

  const res = await upload(KPU_SCAN_UID, {
    imageId,
    kelId,
    kelName: '', // Will be populated on the server.
    tpsNo,
    meta: {
      u: KPU_SCAN_UID,
      k: kelId,
      t: tpsNo,
      a: Date.now(),
      l: stats.mtime.getTime(), // Last Modified Timestamp.
      s: stats.size, // Size in Bytes.
      m: [filename.substring(filename.lastIndexOf('/') + 1), '']
    } as ImageMetadata,
    url: null, // Will be populated on the server.
    ts: null, // Will be populated on the server.
    c1: null, // Will be populated later by Moderator
    sum: null // Will be populated later by Moderator
  });

  if (!res.ok) throw new Error(JSON.stringify(res, null, 2));

  console.log('uploaded', h.parentNames[1], h.name, kelId, tpsNo, filename);
}

type Data = {
  kpu: KpuData;
  wil: any;
  res: any;
  img: { [imageId: string]: any };
  uploaded: { [filename: string]: number };
};
async function getKelData(
  kelId: number,
  path,
  dataFilename
): Promise<[Data, string]> {
  let data: Data;
  let dataJson: string = '';
  try {
    dataJson = fs.readFileSync(dataFilename, 'utf8');
    const x = JSON.parse(dataJson);
    data = x.kpu ? x : ({ kpu: x as KpuData } as Data);
  } catch (e) {
    data = { kpu: {} as KpuData } as Data;
  }

  const p = data.res && data.res.progress;
  if (p && p.proses === p.total) return [null, null];

  if (!data.wil) {
    const url = getPathUrlPrefix(KPU_WIL, path) + '.json';
    data.wil = await getCached(url, `${LOCAL_FS}/w${kelId}.json`, c => false);
  }

  if (!data.res || !data.img || !isOffline) {
    data.res = await getCached(getPathUrlPrefix(KPU_API, path) + '.json');
    data.img = {} as { [imageId: string]: any };
    await Promise.all(
      Object.keys(data.res.table)
        .filter(id => data.res.table[id]['21'] !== null)
        .map(async imageId => {
          const iurl = getPathUrlPrefix(KPU_API, path) + `/${imageId}.json`;
          data.img[imageId] = await getCached(iurl);
        })
    );
  }

  data.uploaded = data.uploaded || {};

  return [data, dataJson];
}

async function kpuUploadKel(kelId: number, path) {
  const dataFilename = `${LOCAL_FS}/data/${kelId}.json`;
  const [data, dataJson] = await getKelData(kelId, path, dataFilename);
  if (!data || !Object.keys(data.img).length) return;

  const dir = LOCAL_FS + `/${kelId}`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  const kpu = {} as KpuData;
  let same = true;
  let ada = false;
  const promises = [];
  for (const imageId of Object.keys(data.img)) {
    const s = data.wil[imageId].nama.split(' ');
    const add =
      s[0] === 'TPS' ? 0 : s[0] === 'POS' ? 1000 : s[0] === 'KSK' ? 2000 : -1;
    if (add < 0) {
      console.error('Negative add', kelId, path, imageId);
      continue;
    }
    const tpsNo = parseInt(s[1], 10) + add;

    const sum = (kpu[tpsNo] = {} as SumMap);
    const res = data.img[imageId];
    if (res && res.chart) {
      sum[SUM_KEY.pas1] = res.chart['21'];
      sum[SUM_KEY.pas2] = res.chart['22'];
      sum[SUM_KEY.tSah] = res.suara_tidak_sah;
      sum[SUM_KEY.sah] = res.suara_sah;
      sum[SUM_KEY.jum] = res.pengguna_j;
      ada = true;
      if (JSON.stringify(data.kpu[tpsNo]) !== JSON.stringify(sum)) {
        same = false;
      }
    }

    for (const fn of res.images || []) {
      // TODO: query the actual fsdb to check if uploaded.
      if (!fn || data.uploaded[fn]) continue;

      const a = imageId.substring(0, 3);
      const b = imageId.substring(3, 6);
      const u = `https://pemilu2019.kpu.go.id/img/c/${a}/${b}/${imageId}/${fn}`;
      const filename = dir + `/${fn}`;
      const runUpload = async () => {
        if (!fs.existsSync(filename)) await download(u, filename);
        await kpuUploadImage(kelId, tpsNo, filename);
        data.uploaded[fn] = 1;
      };

      promises.push(
        runUpload().catch(e => {
          if (e.message.indexOf('Image too small') === -1) {
            console.error('Upload failed', fn, e.message);
          }
          try {
            data.res.progress.proses = 0;
          } catch (ex) {
            console.error(ex);
          }
        })
      );
    }
  }
  await Promise.all(promises);

  data.kpu = kpu;
  const newDataJson = JSON.stringify(data, null, 2);
  if (dataJson !== newDataJson) fs.writeFileSync(dataFilename, newDataJson);
  if (ada && !same) await fsdb.doc(FsPath.kpu(kelId)).set(kpu);
}

async function continuousKpuUpload(concurrency: number) {
  const tRef = fsdb.doc('tester/status');
  await tRef.set({ running: true });
  const unsub = tRef.onSnapshot(snap => {
    const status = snap.data();
    if (status && !status.running) {
      isShutdown = true;
      console.log('Shutting down... no more processing kel');
    }
  });

  while (!isShutdown) {
    const arr = Object.keys(kpuH).sort((a, b) => +a - +b);
    console.log('Total Kels', arr.length);
    let arr_idx = 0;
    const promises = [];
    const run = async () => {
      while (arr_idx < arr.length && !isShutdown) {
        const idx = arr_idx++;
        const id = arr[idx];
        if (kpuH[id].depth !== 4) throw new Error();
        try {
          await kpuUploadKel(+id, kpuH[id].path);
        } catch (e) {
          console.error('Kel Error', H[id].name, id, e);
        }
      }
    };
    for (let i = 0; i < concurrency; i++) {
      promises.push(run());
    }
    console.log('Upload setup');
    await Promise.all(promises);
    console.log('ALL done');
  }
  unsub();
}

async function recKpuHie(id, depth, opath) {
  const path = opath.concat(id);
  if (depth === 4) {
    kpuH[id] = { depth, path };
    return;
  }

  const url = getPathUrlPrefix(KPU_API, path) + '.json';
  const res = await getCached(url, `${LOCAL_FS}/${id}.json`, () => false);
  for (const cid of Object.keys(res.table)) {
    if (id === -99) {
      const cpath = path.slice();
      for (let i = 2; i > 0; i--) {
        cpath.push(+cid + i);
      }
      await recKpuHie(+cid, depth + 3, cpath);
    } else {
      await recKpuHie(+cid, depth + 1, path);
    }
  }
}

function buildKpuHie() {
  recKpuHie(0, 0, [])
    .then(() => {
      const arr1 = Object.keys(H).filter(id => H[id].depth === 4);
      const arr2 = Object.keys(kpuH).filter(id => kpuH[id].depth === 4);
      for (const id of arr1) {
        if (!kpuH[id]) console.log('missing KPU', id);
      }
      for (const id of arr2) {
        if (!H[id]) console.log('missing H', id);
      }
      console.log(arr1.length, arr2.length);
      fs.writeFileSync(`${LOCAL_FS}/kpuh.js`, JSON.stringify(kpuH));
    })
    .catch(console.error);
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
    .where('tuid', '==', 'vAajmbHXCVWVqLi9JrEuk6NJAcl1')
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
    const res = await getCached(url, `${LOCAL_FS}/w${id}.json`, c => false);

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
    const res = await getCached(url, `${LOCAL_FS}/w${id}.json`, c => false);
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

// parallelUpload().catch(console.error);
// loadTest().catch(console.error);
// fixClaimersRole().catch(console.error);
// fixUploadersCount().catch(console.error);
// checkHierarchy().catch(console.error);
// fixPemandangan().catch(console.error);
// whoChangedRole().catch(console.error);
// fixHierarchy().catch(console.error);
// fixTpsCount().catch(console.error);

continuousKpuUpload(7).catch(console.error);
