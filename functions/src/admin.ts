import * as admin from 'firebase-admin';
import * as request from 'request-promise';
import * as fs from 'fs';

import { CHILDREN } from './hierarchy';
import { ApiUploadRequest, ImageMetadata, FsPath } from 'shared';

admin.initializeApp({
  credential: admin.credential.cert(require('./sa-key.json')),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const auth = admin.auth();
const fsdb = admin.firestore();
fsdb.settings({ timestampsInSnapshots: true });

const delay = (ms: number) => new Promise(_ => setTimeout(_, ms));

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

let requests: ApiUploadRequest[] = [];

function makeRequest(kelurahanId, tpsNo) {
  const body: ApiUploadRequest = {
    kelurahanId,
    tpsNo,
    aggregate: {
      s: [0, 0, 0, 0, 0],
      // s: [Math.floor(Math.random() * 999), 1, 3, 4, 0],
      x: []
    },
    metadata: {} as ImageMetadata,
    imageId: `zzzzzzz${kelurahanId}t${tpsNo}`
  };
  return body;
}

function rec(id, depth) {
  const arr = CHILDREN[id];
  if (depth === 4) {
    for (const tpsNo of arr) {
      requests.push(makeRequest(id, tpsNo));
    }
  } else {
    for (const cid of arr) {
      rec(cid, depth + 1);
    }
  }
}

function upsert(body, token, retry = 0) {
  // console.log('upsert', JSON.stringify(body));
  return request({
    method: 'POST',
    uri: 'https://kawal-c1.firebaseapp.com/api/upload',
    body,
    headers: {
      Authorization: `Bearer ${token}`
    },
    timeout: 15000,
    json: true // Automatically stringifies the body to JSON
  })
    .then(res => {
      if (!res.ok) {
        console.error(`Error posting `, body);
      }
    })
    .catch(error => {
      if (retry > 2) {
        console.warn(error.message, retry, body);
      }
      if (retry < 5) {
        return upsert(body, token, retry + 1);
      }
      console.error(error.message, retry, body);
    });
}

(async () => {
  (await fsdb
    .collection(FsPath.upserts(55065))
    .where('k', '==', 56720)
    .limit(100)
    .get()).forEach(s => {
    console.log(JSON.stringify(s.data(), null, 2));
  });
  // rec(0, 0);

  // requests = [
  //   makeRequest(38901, 7),
  //   makeRequest(4, 1),
  //   makeRequest(4, 2),
  // ];

  // console.log(requests.length);
  // if (request.length) return;
  // requests = requests.slice(0, 10);
  // console.log(requests.length);

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

  requests = requests.slice(0, 135000);
  console.log(requests.length);

  const uid = '1oz4pZ0MTidjEteHbvlNdfvAu7p1';
  const user = await getUser(uid);

  const promises: any = [];
  for (let i = 0; i < 500 && i < requests.length; i++) {
    promises.push(Promise.resolve());
  }
  for (let i = 130000, j = 0; i < requests.length; i++) {
    const idx = i;
    const req = requests[i];
    promises[j] = promises[j].then(() => upsert(req, user.idToken));
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
})().catch(console.error);
