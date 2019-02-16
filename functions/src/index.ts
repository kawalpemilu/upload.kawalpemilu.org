import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as request from 'request-promise';
import * as express from 'express';
import {
  Aggregate,
  ImageMetadata,
  Upsert,
  extractImageMetadata,
  TpsImage,
  ApiUploadRequest,
  FsPath
} from 'shared';

import { H } from './hierarchy';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const auth = admin.auth();
const fsdb = admin.firestore();
fsdb.settings({ timestampsInSnapshots: true });

const app = express();
app.use(require('cors')({ origin: true }));

const delay = (ms: number) => new Promise(_ => setTimeout(_, ms));
console.info('createdNewFunction');

function getServingUrl(objectName: string, ithRetry = 0, maxRetry = 10) {
  const domain = 'kawal-c1.appspot.com';
  const path = encodeURIComponent(`${domain}/${objectName}`);
  return request(`https://${domain}/gsu?path=${path}`, { timeout: 5000 })
    .then(res => {
      if (!res.startsWith('http')) {
        throw new Error('gsu failed: ' + path);
      }
      return res;
    })
    .catch(async e => {
      if (ithRetry >= maxRetry) {
        console.error(`${e.message}; path = ${path}, #${ithRetry}/${maxRetry}`);
        throw e;
      }
      await delay(ithRetry * 1000);
      return getServingUrl(objectName, ithRetry + 1, maxRetry);
    });
}

// Creates a serving url for the uploaded images.
exports.handlePhotoUpload = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '512MB'
  })
  .storage.object()
  .onFinalize(async object => {
    // Exit if this is triggered on a file that is not an image.
    if (!object.contentType.startsWith('image/')) {
      console.warn(`Not an image: ${object.name}`);
      return null;
    }

    const paths = object.name.split('/');
    // object.name = uploads/{kelurahanId}/{tpsNo}/{userId}/{imageId}
    const [, kelurahanId, tpsNo, userId, imageId] = paths;
    const m = {} as ImageMetadata;
    m.u = userId;
    m.k = parseInt(kelurahanId, 10);
    m.t = parseInt(tpsNo, 10);
    m.v = await getServingUrl(object.name);
    await fsdb.doc(FsPath.imageMetadata(imageId)).set(m);
  });

/**
 * Validates Firebase ID Tokens passed in the authorization HTTP header.
 * Returns the decoded ID Token content.
 */
function validateToken(
  req: any,
  res: any
): Promise<admin.auth.DecodedIdToken | null> {
  const a = req.headers.authorization;
  if (!a || !a.startsWith('Bearer ')) {
    res.status(403).json({ error: 'Unauthorized' });
    return Promise.resolve(null);
  }
  return auth.verifyIdToken(a.substring(7)).catch(() => {
    res.status(403).json({ error: 'Unauthorized, invalid token' });
    return null;
  });
}

const CACHE_TIMEOUT = 5;
const cache_c: any = {};
app.get('/api/c/:id', async (req, res) => {
  const cid = req.params.id;
  const c = cache_c[cid];
  res.setHeader('Cache-Control', `max-age=${CACHE_TIMEOUT}`);
  if (c) return res.json(c);

  const host = '35.188.68.201:8080';
  const options = { timeout: 5000, json: true };
  H[cid].aggregate = await request(`http://${host}/api/c/${cid}`, options);

  cache_c[cid] = H[cid];
  setTimeout(() => delete cache_c[cid], CACHE_TIMEOUT * 1000);
  return res.json(c);
});

async function getServingUrlFromFirestore(imageId, res, uid) {
  if (imageId.startsWith('zzzzzzz')) {
    return (
      'http://lh3.googleusercontent.com/dRp80J1IsmVNeI3HBh-' +
      'ToZA-VumvKXOzp-P_XrgsyhkjMV9Lldfq7-V9hhkolUAED75_QPn9t4NFNrJNMP8'
    );
  }

  if (typeof imageId !== 'string' || !imageId.match(/^[A-Za-z0-9]{20}$/)) {
    res.json({ error: 'Invalid imageId' });
    console.warn(`Metadata invalid ${imageId}, uid = ${uid}`);
    return false;
  }

  for (let i = 1; i <= 4; i++) {
    const meta = (await fsdb
      .doc(FsPath.imageMetadata(imageId))
      .get()).data() as ImageMetadata;
    if (meta && meta.v) {
      return meta.v;
    }
    console.info(`Metadata pending ${imageId}, retry #${i}, uid = ${uid}`);
    await delay(i * 1000);
  }
  console.warn(`Metadata missing ${imageId}, uid = ${uid}`);
  res.json({ error: 'Metadata does not exists' });
  return false;
}

app.post('/api/upload', async (req, res) => {
  const user = await validateToken(req, res);
  if (!user) return null;

  const b = req.body as ApiUploadRequest;
  const imageId = b.imageId;

  // TODO: limit number of photos per tps and per user.

  const servingUrl = await getServingUrlFromFirestore(imageId, res, user.uid);
  if (!servingUrl) return null;

  const kelId = b.kelurahanId;
  const pid = H[kelId].parentIds;
  if (typeof kelId !== 'number' || (pid && pid.length) !== 4) {
    return res.json({ error: 'Invalid kelurahanId' });
  }

  const tpsNo = b.tpsNo;
  const tpsNos = H[kelId].children;
  if (!tpsNos || tpsNos.indexOf(tpsNo) === -1) {
    return res.json({ error: 'tpsNo does not exists' });
  }

  const a = b.aggregate;
  if (!a || !a.s || !a.s.length || a.s.length > 5) {
    return res.json({ error: 'Invalid aggregates sum' });
  }
  const ts = Date.now();
  const agg = { s: [], x: [ts] } as Aggregate;
  for (const sum of a.s) {
    if (typeof sum !== 'number' || sum < 0 || sum > 1000) {
      return res.json({ error: 'Invalid sum range' });
    }
    agg.s.push(sum);
  }

  const ti: TpsImage = {
    u: servingUrl,
    a: agg
  };
  const upsert: Upsert = {
    k: kelId,
    n: tpsNo,
    i: req.headers['fastly-client-ip'],
    a: agg,
    d: 0,
    m: extractImageMetadata(b.metadata)
  };

  const batch = fsdb.batch();
  batch.set(fsdb.doc(FsPath.tpsImage(kelId, tpsNo, imageId)), ti);
  batch.set(fsdb.doc(FsPath.upserts(imageId)), upsert);
  await batch.commit();

  return res.json({ ok: true });
});

exports.api = functions
  .runWith({
    timeoutSeconds: 90,
    memory: '512MB'
  })
  .https.onRequest(app);
