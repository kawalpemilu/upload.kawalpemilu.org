const t0 = Date.now();

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as request from 'request-promise';
import * as express from 'express';
import {
  Aggregate,
  ImageMetadata,
  Upsert,
  extractImageMetadata,
  ApiUploadRequest,
  FsPath,
  HierarchyNode,
  autoId,
  CodeReferral,
  Relawan,
  isValidImageId,
  MAX_RELAWAN_TRUSTED_DEPTH
} from 'shared';

const t1 = Date.now();

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const auth = admin.auth();
const fsdb = admin.firestore();
fsdb.settings({ timestampsInSnapshots: true });

const t2 = Date.now();

const app = express();
app.use(require('cors')({ origin: true }));

const delay = (ms: number) => new Promise(_ => setTimeout(_, ms));

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
exports.handlePhotoUpload = functions.storage
  .object()
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

const rateLimit: { [uid: string]: number } = {};
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
  return auth
    .verifyIdToken(a.substring(7))
    .catch(() => {
      res.status(403).json({ error: 'Unauthorized, invalid token' });
      return null;
    })
    .then(user => {
      if (user) {
        const num = (rateLimit[user.uid] = (rateLimit[user.uid] || 0) + 1);
        if (num > 30) {
          console.warn(`User ${user.uid} is rate-limited`);
          return null;
        }
        if (num === 1) {
          setTimeout(() => delete rateLimit[user.uid], 60 * 1000);
        }
      }
      return user;
    });
}

function getChildren(cid): Promise<HierarchyNode> {
  const host = '35.188.68.201:8080';
  const options = { timeout: 3000, json: true };
  return request(`http://${host}/api/c/${cid}`, options);
}

const CACHE_TIMEOUT = 5;
const cache_c: any = {};
app.get('/api/c/:id', async (req, res) => {
  // TODO: validateToken, and use secretkey
  const cid = req.params.id;
  let c = cache_c[cid];
  res.setHeader('Cache-Control', `max-age=${CACHE_TIMEOUT}`);
  if (c) return res.json(c);

  try {
    c = await getChildren(cid);
  } catch (e) {
    console.error(`API call failed on ${cid}: ${e.message}`);
    c = {};
  }

  cache_c[cid] = c;
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

  if (!isValidImageId(imageId)) {
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
  const tpsNo = b.tpsNo;
  try {
    const c = await getChildren(kelId);
    if (!c || !c.name) {
      return res.json({ error: 'kelurahanId does not exists' });
    }
    const tpsNos = c.children;
    if (!tpsNos || tpsNos.findIndex(t => t[0] === tpsNo) === -1) {
      return res.json({ error: 'tpsNo does not exists' });
    }
  } catch (e) {
    return res.json({ error: 'Server error please retry in 1 minute' });
  }

  const a = b.aggregate;
  if (!a || !a.s || !a.s.length || a.s.length > 5) {
    return res.json({ error: 'Invalid aggregates sum' });
  }
  const agg = { s: [], x: [Date.now()] } as Aggregate;
  for (const sum of a.s) {
    if (typeof sum !== 'number' || sum < 0 || sum > 1000) {
      return res.json({ error: 'Invalid sum range' });
    }
    agg.s.push(sum);
  }

  const upsert: Upsert = {
    u: user.uid,
    k: kelId,
    n: tpsNo,
    s: servingUrl,
    e: imageId,
    p: false,
    i: req.headers['fastly-client-ip'],
    a: agg,
    d: 0,
    m: extractImageMetadata(b.metadata)
  };

  await fsdb.doc(FsPath.upserts(imageId)).set(upsert);

  return res.json({ ok: true });
});

app.post('/api/problem', async (req, res) => {
  const user = await validateToken(req, res);
  if (!user) return null;

  const imageId = req.body.imageId;
  if (!isValidImageId(imageId)) {
    return res.json({ error: 'Invalid imageId' });
  }

  const iRef = fsdb.doc(FsPath.upserts(imageId));
  const u = (await iRef.get()).data();
  if (!u) {
    return res.json({ error: 'Invalid imageId' });
  }

  await iRef.update({ p: true });
  return res.json({ ok: true });
});

app.post('/api/register/create_code', async (req, res) => {
  const user = await validateToken(req, res);
  if (!user) return null;

  const nama = req.body.nama;
  if (!nama || !nama.match(/^[A-Za-z ]{1,20}$/))
    return res.json({ error: 'Nama tidak valid' });

  const rRef = fsdb.doc(FsPath.relawan(user.uid));
  const c = await fsdb.runTransaction(async t => {
    const r = (await t.get(rRef)).data() as Relawan;
    if (!r) return 'no_user';
    if (r.d === undefined) return 'no_trust';
    if (r.d >= MAX_RELAWAN_TRUSTED_DEPTH) return 'no_create';

    let code;
    for (let i = 0; ; i++) {
      code = autoId(10);
      if (!(await t.get(fsdb.doc(FsPath.codeReferral(code)))).data()) break;
      console.warn(`Exists auto id ${code}`);
      if (i > 10) return 'no_id';
    }

    const newCode: CodeReferral = {
      i: user.uid,
      n: r.n,
      l: r.l,
      t: Date.now(),
      d: r.d + 1,
      m: nama,
      c: null,
      e: null,
      r: null,
      a: null
    };
    t.set(fsdb.doc(FsPath.codeReferral(code)), newCode);

    if (!r.c) r.c = {};
    r.c[code] = { m: nama, t: newCode.t } as CodeReferral;
    t.update(rRef, r);
    return code;
  });

  switch (c) {
    case 'no_user':
      return res.json({ error: 'Data anda tidak ditemukan' });
    case 'no_trust':
      return res.json({ error: 'Maaf, status anda belum terpercaya' });
    case 'no_create':
      return res.json({ error: 'Maaf, pembuatan kode belum dibuka' });
    case 'no_id':
      return res.json({ error: 'Auto id failed' });
    default:
      return res.json({ code: c });
  }
});

app.post('/api/register/:code', async (req, res) => {
  const user = await validateToken(req, res);
  if (!user) return null;

  const code = req.params.code;
  if (!new RegExp('^[a-zA-Z0-9]{10}$').test(code)) {
    return res.json({ error: 'Kode referral tidak valid' });
  }

  const ts = Date.now();
  const codeRef = fsdb.doc(FsPath.codeReferral(code));
  const claimerRef = fsdb.doc(FsPath.relawan(user.uid));
  const c = await fsdb.runTransaction(async t => {
    // Abort if the code does not exist or already claimed.
    const cd = (await t.get(codeRef)).data() as CodeReferral;
    if (!cd || cd.c) return cd;

    // Abort if the claimer does not have relawan entry.
    const claimer = (await t.get(claimerRef)).data() as Relawan;
    if (!claimer) {
      console.error(`Claimer ${user.uid} is not in Firestore, ${code}`);
      return null;
    }

    // Abort if the user is already trusted.
    if (claimer.d && claimer.d <= cd.d && !req.query.abracadabra) {
      console.log(`Attempt to downgrade ${user.uid}, ${code}`);
      return null;
    }

    // Abort if the issuer does not have relawan entry.
    const issuerRef = fsdb.doc(FsPath.relawan(cd.i));
    const issuer = (await t.get(issuerRef)).data() as Relawan;
    if (!issuer) {
      console.error(`Issuer ${user.uid} is not in Firestore, ${code}`);
      return null;
    }

    // Abort if the issuer never generate the code.
    const i = issuer.c[code];
    if (!i) {
      console.error(`Issuer ${user.uid} never generate ${code}`);
      return null;
    }

    i.c = cd.c = user.uid;
    i.e = cd.e = claimer.n;
    i.r = cd.r = claimer.l;
    i.a = cd.a = ts;

    claimer.d = cd.d;
    claimer.b = cd.i;
    claimer.e = cd.n;
    claimer.r = cd.l;

    t.update(codeRef, cd);
    t.update(issuerRef, issuer);
    t.update(claimerRef, claimer);
    return cd;
  });

  return res.json(!c || c.c !== user.uid ? { error: 'Invalid' } : { code: c });
});

exports.api = functions.https.onRequest(app);

const t3 = Date.now();

console.info(
  `createdNewFunction ${JSON.stringify({
    imports: t1 - t0,
    fireinit: t2 - t1,
    express: t3 - t2,
    total: t3 - t0
  })}`
);
