import * as admin from 'firebase-admin';
import * as request from 'request-promise';
import * as express from 'express';
import * as fs from 'fs';

import { PARENT_IDS, CHILDREN } from './hierarchy';
import {
  ApiUploadRequest,
  ImageMetadata,
  FsPath,
  Upsert,
  Aggregate
} from 'shared';

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

function rec(id, depth, requests) {
  const arr = CHILDREN[id];
  if (depth === 4) {
    for (const tpsNo of arr) {
      requests.push(makeRequest(id, tpsNo));
    }
  } else {
    for (const cid of arr) {
      rec(cid, depth + 1, requests);
    }
  }
}

function generateRequests() {
  const requests: ApiUploadRequest[] = [];

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
        timeout: 5000
      });
      if (!res.ok) throw new Error(`Result not OK: ${JSON.stringify(res)}`);
      break;
    } catch (e) {
      if (retry > 2) console.warn(e.message, retry, body);
      if (retry > 5) {
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

// In memory database containing the aggregates of all children.
const c: { [key: string]: Aggregate } = {};

function mergeAggregates(target: Aggregate, source: Aggregate) {
  for (let j = 0; j < source.s.length; j++) {
    target.s[j] = (target.s[j] || 0) + source.s[j];
  }
  for (let j = 0; j < source.x.length; j++) {
    target.x[j] = Math.max(target.x[j] || source.x[j], source.x[j]);
  }
}

function getEmptyAggregate(): Aggregate {
  return { s: [], x: [] };
}

function updateAggregates(u: Upsert) {
  console.log(u);

  if (u.d) {
    console.error(`Upsert is already done: ${JSON.stringify(u)}`);
    return;
  }

  const kelurahanId = u.k;
  const path = PARENT_IDS[kelurahanId].slice();
  path.push(kelurahanId);

  if (path.length !== 5) {
    console.error(`Path length != 5: ${JSON.stringify(path)}`);
    return;
  }

  for (const id of path) {
    if (!c[id]) c[id] = getEmptyAggregate();
    mergeAggregates(c[id], u.a);
  }
}

async function processNewUpserts() {
  const upserts: { [key: string]: Upsert } = {};

  await new Promise((resolve, reject) => {
    const unsub = fsdb
      .collection(FsPath.upserts())
      .where('d', '==', 0)
      .limit(5)
      .onSnapshot(
        s => {
          if (!s.empty) {
            unsub();
            s.forEach(doc => (upserts[doc.id] = doc.data() as Upsert));
            resolve();
          }
        },
        e => {
          unsub();
          reject(e);
        }
      );
  }).catch(console.error);

  console.log('processing ', Object.keys(upserts));

  const batch = fsdb.batch();
  for (const imageId of Object.keys(upserts)) {
    updateAggregates(upserts[imageId]);
    batch.update(fsdb.doc(FsPath.upserts(imageId)), { d: 1 });
  }
  await batch.commit().catch(console.error);

  setTimeout(processNewUpserts, 1);
}

function continuousAggregation() {
  setTimeout(processNewUpserts, 1);

  const app = express();

  app.get('/api/c/:id', async (req, res) => {
    return res.json(c[req.params.id] || getEmptyAggregate());
  });

  const server = app.listen(8080, () => {
    const port = server.address().port;
    console.log(`App listening on port ${port}`);
  });
}

continuousAggregation();

// parallelUpload().catch(console.error);
