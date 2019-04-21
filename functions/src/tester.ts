import * as admin from 'firebase-admin';
import * as request from 'request-promise';
import * as fs from 'fs';
import * as util from 'util';
import * as crypto from 'crypto';

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
  ChangeLog
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

interface User {
  uid: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
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

async function kpuUploadDir(kelId: number) {
  const LOCAL_FS = '/Users/felixhalim/Projects/kawal-c1/kpu/cache';
  const hashdir = LOCAL_FS + '/../uploaded-md5';
  const dir = LOCAL_FS + `/${kelId}`;
  if (!fs.existsSync(dir)) return;

  const promises = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.jpg')) continue;
    const filename = dir + `/${file}`;
    const hash = md5(fs.readFileSync(filename));
    const hashFile = hashdir + `/${hash}`;

    // TODO: query the actual fsdb, if not exist continuupload.
    if (fs.existsSync(hashFile)) continue;

    const s = file.split('-');
    const tpsNo = file[0] !== '-' ? +s[1] : decodeTpsNo(s[2]);
    promises.push(
      kpuUploadImage(kelId, tpsNo, filename).then(() =>
        fs.writeFileSync(hashFile, '1', 'utf8')
      )
    );
  }
  try {
    await Promise.all(promises);
  } catch (e) {
    console.error('failed upload', kelId, e.message);
  }
}

function decodeTpsNo(t) {
  const s = t.split(' ');
  if (s[0] === 'KSK') return +s[1] + 2000;
  if (s[0] === 'POS') return +s[1] + 1000;
  return +s[1];
}

async function kpuUpload() {
  for (const id of Object.keys(H)) {
    const h = H[id];
    if (h.depth === 4) {
      await kpuUploadDir(+id);
    }
  }
  console.log('upload done');
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

// parallelUpload().catch(console.error);
// loadTest().catch(console.error);
// fixClaimersRole().catch(console.error);
// fixUploadersCount().catch(console.error);
// checkHierarchy().catch(console.error);
// fixPemandangan().catch(console.error);
// whoChangedRole().catch(console.error);

kpuUpload().catch(console.error);
