import * as admin from 'firebase-admin';
import * as request from 'request-promise';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { spawn } from 'child_process';

import {
  UploadRequest,
  ImageMetadata,
  autoId,
  HierarchyNode,
  BAWASLU_UID
} from 'shared';
import { H } from './hierarchy';

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

const renewUser$ = {};

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
    if (!renewUser$[user.uid]) {
      console.log('Refresh id token', user.uid);
      renewUser$[user.uid] = reauthenticate(
        `https://securetoken.googleapis.com/v1/token`,
        { grant_type: 'refresh_token', refresh_token: user.refreshToken },
        user.uid,
        'id_token',
        'refresh_token',
        'expires_in'
      );
      const newUser = await renewUser$[user.uid];
      delete renewUser$[user.uid];
      return newUser;
    }
    return await renewUser$[user.uid];
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

export async function upload(uid, body: UploadRequest) {
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

export async function kpuUploadImage(uid, kelId, tpsNo, filename: string) {
  const stats = fs.statSync(filename);

  if (stats.size < 10 << 10) {
    fs.unlinkSync(filename);
    throw new Error(`Image too small ${kelId} ${tpsNo}: ${filename}`);
  }

  const h: HierarchyNode = H[kelId];
  if (uid !== BAWASLU_UID && !h.children.find(c => c[0] === tpsNo)) {
    throw new Error(`TPS not found ${kelId} ${tpsNo}`);
  }

  const imageId = autoId();
  const destination = `uploads/${kelId}/${tpsNo}/${uid}/${imageId}`;

  await gsutilCopy(filename, destination);

  const res = await upload(uid, {
    imageId,
    kelId,
    kelName: '', // Will be populated on the server.
    tpsNo,
    meta: {
      u: uid,
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

export function md5(str) {
  return crypto
    .createHash('md5')
    .update(str)
    .digest('hex');
}
