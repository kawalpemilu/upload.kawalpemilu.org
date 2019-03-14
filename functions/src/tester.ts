import * as admin from 'firebase-admin';
import * as request from 'request-promise';
import * as fs from 'fs';

import { ApiUploadRequest, ImageMetadata, SumMap, UpsertData } from 'shared';

import { H } from './hierarchy';

const delay = (ms: number) => new Promise(_ => setTimeout(_, ms));

admin.initializeApp({
  credential: admin.credential.cert(require('./sa-key.json')),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const auth = admin.auth();

interface User {
  uid: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
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
  const sum = {
    pas1: Math.floor(Math.random() * 999),
    pas2: 0,
    sah: 0,
    tSah: 1,
    cakupan: 1,
    pending: 0,
    error: 0
  } as SumMap;
  const imageId = `zzzzzzz${kelId}t${tpsNo}`;
  const data = { sum, updateTs: 0, imageId, url: null } as UpsertData;
  const metadata = {} as ImageMetadata;
  const body: ApiUploadRequest = { kelId, tpsNo, data, metadata };
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
  let requests: ApiUploadRequest[] = [];

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

async function upload(body) {
  for (let retry = 1; ; retry++) {
    try {
      const uid = '1oz4pZ0MTidjEteHbvlNdfvAu7p1';
      const user = await getUser(uid);
      const res = await request({
        method: 'POST',
        uri: 'https://kawal-c1.firebaseapp.com/api/upload',
        body,
        headers: {
          Authorization: `Bearer ${user.idToken}`
        },
        timeout: 5000,
        json: true
      });
      if (!res.ok) throw new Error(`Result not OK: ${JSON.stringify(res)}`);
      break;
    } catch (e) {
      if (retry > 3) console.warn(e.message, retry, body);
      if (retry > 7) {
        console.error(e.message, retry, body);
        break;
      }
      await delay(retry * 1000);
    }
  }
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
    promises[j] = promises[j].then(() => upload(req));
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

parallelUpload().catch(console.error);
