import * as admin from 'firebase-admin';
import * as request from 'request-promise';
import * as fs from 'fs';

import { ROOT_ID, ROOT_IDS, PARENT_IDS, CHILDREN } from './hierarchy';
import { ApiUploadRequest, ImageMetadata } from 'shared';

admin.initializeApp({
  credential: admin.credential.cert(require('./sa-key.json')),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const auth = admin.auth();
const rtdb = admin.database();
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
  const user = {
    uid,
    idToken: res[idTokenKey],
    refreshToken: res[refreshTokenKey],
    expiresIn: res[expiresInKey],
    expiresAt: res.expiresIn * 1000 + Date.now()
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

const requests: ApiUploadRequest[] = [];

function rec(id, depth) {
  const arr = CHILDREN[id];
  if (depth === 4) {
    for (const tpsNo of arr) {
      const body: ApiUploadRequest = {
        kelurahanId: id,
        tpsNo,
        aggregate: {
          s: [1, Math.floor(Math.random() * 999), 3, 4, 0],
          x: []
        },
        metadata: {} as ImageMetadata,
        imageId: `zzzzzzz${id}t${tpsNo}`
      };
      requests.push(body);
    }
  } else {
    for (const cid of arr) {
      rec(cid, depth + 1);
    }
  }
}

function upsert(body, token, retry = 0) {
  return request({
    method: 'POST',
    uri: 'https://kawal-c1.firebaseapp.com/api/upload',
    body,
    headers: {
      Authorization: `Bearer ${token}`
    },
    json: true // Automatically stringifies the body to JSON
  })
    .then(res => {
      if (!res.ok) {
        console.error(`Error posting `, body);
      }
    })
    .catch(error => {
      if (retry < 5) {
        return upsert(body, token, retry + 1);
      }
      console.error(error.message, body);
    });
}

(async () => {
  rec(0, 0);

  console.log(requests.length);

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

  const uid = '1oz4pZ0MTidjEteHbvlNdfvAu7p1';
  const user = await getUser(uid);

  let promises: any = [];
  for (let i = 16259; i < requests.length; i++) {
    promises.push(upsert(requests[i], user.idToken));
    if (promises.length > 100) {
      await Promise.all(promises);
      await delay(1000);
      promises = [];
      console.log('i', i);
    }
  }
})();
