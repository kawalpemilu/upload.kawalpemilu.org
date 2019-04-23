import * as admin from 'firebase-admin';
import * as request from 'request-promise';
import * as fs from 'fs';
import * as util from 'util';
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

const delay = (ms: number) => new Promise(_ => setTimeout(_, ms));

admin.initializeApp({
  credential: admin.credential.cert(require('./sa-key.json')),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const auth = admin.auth();
const fsdb = admin.firestore();
const bucket = admin.storage().bucket('kawal-c1.appspot.com');

const readFileAsync = util.promisify(fs.readFile);
const statAsync = util.promisify(fs.stat);

const KPU_API = 'https://pemilu2019.kpu.go.id/static/json/hhcw/ppwp';
const KPU_WIL = 'https://pemilu2019.kpu.go.id/static/json/wilayah';

const LOCAL_FS = '/Users/felixhalim/Projects/kawal-c1/kpu/cache';
const proxy = 'socks5h://localhost:12345';
const isOffline = false;

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
      if (code) reject(new Error(`Exit code ${code}`));
      else resolve();
    });
  });
}

async function downloadWithRetry(url, output) {
  try {
    await download(url, output);
    const s = fs.statSync(output);
    if (s.size < 10 << 10) {
      // console.error('image too small', url);
      fs.unlinkSync(output);
    } else {
      console.log('downloaded', url);
    }
    return;
  } catch (e) {
    console.error('download retry', e.message);
  }
}

async function getWithRetry(url) {
  console.log('fetching', url);
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

async function getCached(url, cachedFilename, inProgressFn) {
  try {
    const cache = JSON.parse(fs.readFileSync(cachedFilename, 'utf8'));
    if (isOffline) return cache;
    if (!inProgressFn(cache)) return cache;
  } catch (e) {}

  try {
    const res = JSON.parse(await getWithRetry(url));
    fs.writeFileSync(cachedFilename, JSON.stringify(res));
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

async function fetchImageJson(imageId, path) {
  const dir = LOCAL_FS + '/' + path[path.length - 1];
  try {
    fs.mkdirSync(dir);
  } catch (e) {}

  return getCached(
    getPathUrlPrefix(KPU_API, path) + `/${imageId}.json`,
    dir + `/${imageId}.json`,
    c => c.images.length < 2
  );
}

async function downloadImage(fn, imageId, path) {
  if (isOffline) return;
  const a = imageId.substring(0, 3);
  const b = imageId.substring(3, 6);
  const url = `https://pemilu2019.kpu.go.id/img/c/${a}/${b}/${imageId}/${fn}`;

  const dir = LOCAL_FS + '/' + path[path.length - 1];
  const filename = dir + `/${fn}`;
  if (!fs.existsSync(filename)) {
    await downloadWithRetry(url, filename);
  }
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

  if (user.expiresAt < Date.now()) {
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
  const h = JSON.parse(await readFileAsync('h.json', 'utf8'));
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
  const stats = await statAsync(filename);

  console.log('uploading', kelId, tpsNo, filename, stats.size);

  if (stats.size < 10 << 10) {
    throw new Error(`Image too small ${kelId} ${tpsNo}`);
  }

  const h: HierarchyNode = H[kelId];
  if (!h.children.find(c => c[0] === tpsNo)) {
    throw new Error(`TPS not found ${kelId} ${tpsNo}`);
  }

  const imageId = autoId();
  const destination = `uploads/${kelId}/${tpsNo}/${KPU_SCAN_UID}/${imageId}`;

  await bucket.upload(filename, { destination });

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
}

async function fetchKelImages(kelId: number, path) {
  const inProgressFn = c => c.progress.proses < c.progress.total;
  const url = getPathUrlPrefix(KPU_API, path) + '.json';
  const res = await getCached(url, `${LOCAL_FS}/${kelId}.json`, inProgressFn);
  const arr = Object.keys(res.table).filter(id => res.table[id]['21'] !== null);
  const imgJson = {};
  await Promise.all(
    arr.map(async imageId => {
      const i = await fetchImageJson(imageId, path);
      if (!i.images) {
        console.error('null images', kelId, path, imageId);
        return;
      }
      imgJson[imageId] = i;
      for (const fn of i.images) {
        await downloadImage(fn, imageId, path);
      }
    })
  );
  return imgJson;
}

function getNewFileHashes(dir) {
  const newFileHashes = {};
  const hashdir = LOCAL_FS + '/../uploaded-md5';
  fs.readdirSync(dir).forEach(file => {
    if (!file.endsWith('.jpg')) return;
    const filename = dir + `/${file}`;
    const hash = md5(fs.readFileSync(filename));
    const hashFile = hashdir + `/${hash}`;

    // TODO: query the actual fsdb, if not exist continuupload.
    if (fs.existsSync(hashFile)) return;

    newFileHashes[file] = hashFile;
  });
  return newFileHashes;
}

function readJson(path: string) {
  try {
    return JSON.parse(fs.readFileSync(`${LOCAL_FS}/${path}`, 'utf8'));
  } catch (e) {
    return null;
  }
}

async function kpuUploadKel(kelId: number, path) {
  const imgJson = await fetchKelImages(kelId, path);
  const dir = LOCAL_FS + `/${kelId}`;
  if (!Object.keys(imgJson).length || !fs.existsSync(dir)) return;

  const newFileHashes = getNewFileHashes(dir);
  if (!Object.keys(newFileHashes).length) return;
  // console.log('newFIleHashes', newFileHashes);

  const filename = `data/${kelId}.json`;
  const data: KpuData = readJson(filename);
  const kpu = {} as KpuData;
  let same = true;
  let ada = false;

  const wurl = getPathUrlPrefix(KPU_WIL, path) + '.json';
  const wil = await getCached(wurl, `${LOCAL_FS}/w${kelId}.json`, c => false);
  const promises = [];
  for (const imageId of Object.keys(imgJson)) {
    const s = wil[imageId].nama.split(' ');
    const add =
      s[0] === 'TPS' ? 0 : s[0] === 'POS' ? 1000 : s[0] === 'KSK' ? 2000 : -1;
    if (add < 0) throw new Error();
    const tpsNo = parseInt(s[1], 10) + add;

    const sum = (kpu[tpsNo] = {} as SumMap);
    const res = imgJson[imageId];
    if (res && res.chart) {
      sum[SUM_KEY.pas1] = res.chart['21'];
      sum[SUM_KEY.pas2] = res.chart['22'];
      sum[SUM_KEY.tSah] = res.suara_tidak_sah;
      sum[SUM_KEY.sah] = res.suara_sah;
      sum[SUM_KEY.jum] = res.pengguna_j;
      ada = true;
      if (!data || JSON.stringify(data[tpsNo]) !== JSON.stringify(sum)) {
        same = false;
      }
    }

    for (const fn of res.images) {
      if (!newFileHashes[fn]) continue;
      promises.push(
        kpuUploadImage(kelId, tpsNo, `${dir}/${fn}`)
          .then(() => {
            fs.writeFileSync(newFileHashes[fn], '1', 'utf8');
            delete newFileHashes[fn];
          })
          .catch(e => console.error('upload failed', kelId, tpsNo, e.message))
      );
    }
  }
  await Promise.all(promises);

  const leftover = Object.keys(newFileHashes).length;
  if (leftover) console.error('Upload leftover', leftover);

  if (!ada || same) return;
  fs.writeFileSync(`${LOCAL_FS}/${filename}`, JSON.stringify(kpu));
  await fsdb.doc(FsPath.kpu(kelId)).set(kpu);
}

const uploadParallelsim = 100;
const uploadPromises = [];
let uploadPromiseIdx = 0;

async function kpuUpload(id, depth, opath) {
  const path = opath.slice();
  path.push(id);
  const url = getPathUrlPrefix(KPU_API, path) + '.json';
  const inProgressFn = c => c.progress.proses < c.progress.total;
  const res = await getCached(url, `${LOCAL_FS}/${id}.json`, inProgressFn);

  if (!inProgressFn(res)) return;

  if (depth === 4) {
    uploadPromises[uploadPromiseIdx] = uploadPromises[uploadPromiseIdx].then(
      () => kpuUploadKel(id, path).catch(console.error)
    );
    uploadPromiseIdx = (uploadPromiseIdx + 1) % uploadParallelsim;
    return;
  }

  const arr = Object.keys(res.table).filter(
    key => res.table[key]['21'] !== null
  );
  for (const cid of arr) {
    if (depth === 0) {
      console.log('Scanning', H[cid].name);
    }
    if (id === -99) {
      const cpath = path.slice();
      for (let i = 2; i > 0; i--) {
        cpath.push(+cid + i);
      }
      await kpuUpload(+cid, depth + 3, cpath);
    } else {
      await kpuUpload(+cid, depth + 1, path);
    }
  }
}

async function continuousKpuUpload() {
  while (true) {
    uploadPromiseIdx = 0;
    uploadPromises.length = 0;
    for (let i = 0; i < uploadParallelsim; i++) {
      uploadPromises.push(Promise.resolve());
    }

    await kpuUpload(0, 0, [])
      .then(async () => {
        console.log('KPU upload setup');
        await Promise.all(uploadPromises);
        console.log('ALL done');
      })
      .catch(console.error);
  }
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

// parallelUpload().catch(console.error);
// loadTest().catch(console.error);
// fixClaimersRole().catch(console.error);
// fixUploadersCount().catch(console.error);
// checkHierarchy().catch(console.error);
// fixPemandangan().catch(console.error);
// whoChangedRole().catch(console.error);
// fixHierarchy().catch(console.error);

continuousKpuUpload().catch(console.error);
