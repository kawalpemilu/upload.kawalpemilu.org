// TODO: review ACLs

const t0 = Date.now();

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as request from 'request-promise';
import * as express from 'express';
import {
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
  ApiApproveRequest,
  UpsertData,
  SUM_KEY,
  APP_SCOPED_PREFIX_URL,
  MAX_REFERRALS,
  MAX_NUM_UPLOADS,
  USER_ROLE,
  isValidUserId,
  ChangeLog,
  Action,
  SumMap
} from 'shared';

const t1 = Date.now();

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const auth = admin.auth();
const rtdb = admin.database();
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
    m.a = Date.now();
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
  const trace = new Error().stack;
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
          console.warn(`User ${user.uid} is rate-limited: ${trace}`);
          res.status(403).json({ error: 'Rate-limited' });
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

const CACHE_TIMEOUT = 1;
const cache_c: any = {};
app.get('/api/c/:id', async (req, res) => {
  if (!req.query.abracadabra) {
    const user = await validateToken(req, res);
    if (!user) return null;
  }
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

  for (let i = 1; i <= 5; i++) {
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

async function getKelName(res, uid, kelId, tpsNo) {
  let kelName = '';
  try {
    const c = await getChildren(kelId);
    if (!c || !c.name) {
      console.warn(`Children missing ${kelId}, uid = ${uid}`);
      res.json({ error: 'kelId does not exists' });
      return null;
    }
    kelName = c.name;
    const tpsNos = c.children;
    if (!tpsNos || tpsNos.findIndex(t => t[0] === tpsNo) === -1) {
      console.warn(`TPS missing ${kelId} ${tpsNo}, uid = ${uid}`);
      res.json({ error: 'tpsNo does not exists' });
      return null;
    }
  } catch (e) {
    console.warn(`Error ${e.message}, uid = ${uid}`);
    res.json({ error: 'Server error please retry in 1 minute' });
    return null;
  }
  return kelName;
}

app.post('/api/upload', async (req, res) => {
  const user = await validateToken(req, res);
  if (!user) return null;

  const b = req.body as ApiUploadRequest;
  if (!b.data) {
    console.error(`Upload data is missing ${user.uid}`);
    return res.json({ error: 'Missing data' });
  }

  const imageId = b.data.imageId;
  const servingUrl = await getServingUrlFromFirestore(imageId, res, user.uid);
  if (!servingUrl) return null;

  const kelId = b.kelId;
  const tpsNo = b.tpsNo;
  const kelName = await getKelName(res, user.uid, kelId, tpsNo);
  if (!kelName) return null;

  const data: UpsertData = {
    sum: { cakupan: 1, pending: 1, error: 0 } as SumMap,
    updateTs: Date.now(),
    imageId,
    url: servingUrl
  };

  const uRef = fsdb.doc(FsPath.relawan(user.uid));
  const uploader = (await uRef.get()).data() as Relawan;
  if (!uploader) {
    console.error(`Uploader is missing ${user.uid}`);
    return res.json({ error: 'Uploader not found' });
  }

  const meta = extractImageMetadata(b.metadata);
  uploader.uploads = uploader.uploads || [];
  uploader.uploads.unshift({ kelId, kelName, tpsNo, data, meta });
  uploader.numUploads = (uploader.numUploads || 0) + 1;

  if (uploader.numUploads > MAX_NUM_UPLOADS) {
    console.error(`Exceeded max uploads ${user.uid}`);
    return res.json({ error: 'Exceeded max number of uploads' });
  }

  const upsert: Upsert = {
    uploader: {
      ...uploader.profile,
      ts: data.updateTs,
      ua: req.headers['user-agent'],
      ip: getIp(req)
    },
    reviewer: null,
    reporter: null,
    kelId,
    tpsNo,
    data,
    meta,
    done: 0,
    action: {
      sum: {
        cakupan: 1,
        pending: 1
      },
      ts: data.updateTs
    } as Action
  };

  try {
    const batch = fsdb.batch();
    batch.create(fsdb.doc(FsPath.upserts(imageId)), upsert);
    batch.update(uRef, uploader);
    await batch.commit();
  } catch (e) {
    console.error(`Database error for ${user.uid}`);
    return res.json({ error: 'Database error' });
  }

  return res.json({ ok: true });
});

function getIp(req: express.Request) {
  const ip = req.headers['fastly-client-ip'];
  return typeof ip === 'string' ? ip : JSON.stringify(ip);
}

app.post('/api/approve', async (req, res) => {
  const user = await validateToken(req, res);
  if (!user) return null;

  const b = req.body as ApiApproveRequest;
  if (!b.action || !b.action.sum) {
    console.warn(`No action, uid = ${user.uid}`);
    return res.json({ error: 'No action' });
  }

  const kelId = +b.kelId;
  const tpsNo = +b.tpsNo;
  if (!(await getKelName(res, user.uid, kelId, tpsNo))) return null;

  const imageIds = [];
  for (const imageId of b.action.imageIds) {
    if (!isValidImageId(imageId)) {
      console.warn(`Invalid imageId ${imageId} for user ${user.uid}`);
      return res.json({ error: 'Invalid imageId' });
    }
    imageIds.push(imageId);
  }
  if (!imageIds.length) {
    console.warn(`Empty imageIds for user ${user.uid}`);
    return res.json({ error: 'No imageId' });
  }

  const ts = Date.now();
  const action: Action = { sum: {} as SumMap, ts, imageIds };
  for (const key in SUM_KEY) {
    const sum = b.action.sum[key] || 0;
    if (typeof sum !== 'number' || sum < 0 || sum > 1000) {
      console.error(`Sum ${sum} out of range ${user.uid}`);
      res.json({ error: 'Invalid sum range' });
      return null;
    }
    if (
      (key === SUM_KEY.pending ||
        key === SUM_KEY.error ||
        key === SUM_KEY.cakupan) &&
      sum > 1
    ) {
      console.error(`Sum ${sum} out of range ${user.uid}`);
      res.json({ error: 'Invalid sum range' });
      return null;
    }
    action.sum[key] = sum;
  }

  const uRef = fsdb.doc(FsPath.upserts(imageIds[0]));
  const rRef = fsdb.doc(FsPath.relawan(user.uid));
  const ok = await fsdb.runTransaction(async t => {
    const r = (await t.get(rRef)).data() as Relawan;
    if (r.profile.role < USER_ROLE.MODERATOR) {
      return 'not_authorized';
    }

    const u = (await t.get(uRef)).data() as Upsert;
    u.reviewer = {
      ...r.profile,
      ts,
      ua: req.headers['user-agent'],
      ip: getIp(req)
    };
    u.action = action;
    u.done = 0;
    t.update(uRef, u);
    return true;
  });

  if (ok !== true) {
    console.warn(`Error approve ${user.uid} : ${ok}`);
    return res.json({ error: ok });
  }
  return res.json({ ok: true });
});

app.post('/api/problem', async (req, res) => {
  const user = await validateToken(req, res);
  if (!user) return null;

  const imageId = req.body.imageId;
  if (!isValidImageId(imageId)) {
    return res.json({ error: 'Invalid imageId' });
  }

  const uRef = fsdb.doc(FsPath.upserts(imageId));
  const rRef = fsdb.doc(FsPath.relawan(user.uid));
  const ok = await fsdb.runTransaction(async t => {
    const u = (await t.get(uRef)).data() as Upsert;
    if (!u || !u.data) {
      return false;
    }
    const r = (await t.get(rRef)).data() as Relawan;
    u.reporter = {
      ...r.profile,
      ts: Date.now(),
      ua: req.headers['user-agent'],
      ip: getIp(req)
    };
    u.action = { sum: { error: 1 } } as Action;
    u.done = 0;
    t.update(uRef, u);
    return true;
  });

  return res.json(ok ? { ok: true } : { error: 'Invalid imageId' });
});

app.post('/api/register/login', async (req, res) => {
  const user = await validateToken(req, res);
  if (!user) return null;

  let link = req.body.link;
  const p = APP_SCOPED_PREFIX_URL;
  if (!link || !link.startsWith(p) || !link.match(/[a-zA-Z0-9]+\//)) {
    console.error(`Invalid login ${user.uid} link: ${link}`);
    link = '';
  } else {
    link = link.substring(p.length);
  }

  if (user.uid !== user.user_id) {
    console.error(`UID differs ${user.uid} !== ${user.user_id}`);
  }

  await fsdb.doc(FsPath.relawan(user.uid)).set(
    {
      lowerCaseName: user.name.toLowerCase(),
      profile: {
        uid: user.user_id,
        link,
        email: user.email || '',
        name: user.name,
        pic: user.picture,
        loginTs: Date.now()
      }
    },
    { merge: true }
  );

  return res.json({ ok: true });
});

app.post('/api/register/create_code', async (req, res) => {
  const user = await validateToken(req, res);
  if (!user) return null;

  const nama = req.body.nama;
  if (!nama || !nama.match(/^[A-Za-z ]{1,50}$/))
    return res.json({ error: 'Nama tidak valid' });

  const rRef = fsdb.doc(FsPath.relawan(user.uid));
  const c = await fsdb.runTransaction(async t => {
    const r = (await t.get(rRef)).data() as Relawan;
    if (!r) return 'no_user';
    if (r.depth === undefined) return 'no_trust';

    let code;
    for (let i = 0; ; i++) {
      code = autoId(10);
      if (!(await t.get(fsdb.doc(FsPath.codeReferral(code)))).data()) break;
      console.warn(`Exists auto id ${code}`);
      if (i > 10) return 'no_id';
    }

    const newCode: CodeReferral = {
      issuer: r.profile,
      issuedTs: Date.now(),
      depth: r.depth + 1,
      name: nama,
      claimer: null,
      claimedTs: null
    };
    t.set(fsdb.doc(FsPath.codeReferral(code)), newCode);

    if (!r.code) r.code = {};
    r.code[code] = { name: nama, issuedTs: newCode.issuedTs } as CodeReferral;
    if (Object.keys(r.code).length > MAX_REFERRALS) return 'no_quota';
    t.update(rRef, r);
    return code;
  });

  switch (c) {
    case 'no_user':
      return res.json({ error: 'Data anda tidak ditemukan' });
    case 'no_trust':
      return res.json({ error: 'Maaf, anda belum berstatus relawan' });
    case 'no_quota':
      return res.json({
        error: 'Maaf, anda telah melebihi jumlah pembuatan kode referrals'
      });
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
    if (!cd || cd.claimer) return cd;

    // Abort if the claimer does not have relawan entry.
    const claimer = (await t.get(claimerRef)).data() as Relawan;
    if (!claimer) {
      console.error(`Claimer ${user.uid} is not in Firestore, ${code}`);
      return null;
    }

    // Abort if the user is already trusted.
    if (claimer.depth && claimer.depth <= cd.depth && !req.query.abracadabra) {
      console.log(`Attempt to downgrade ${user.uid}, ${code}`);
      return null;
    }

    // Abort if the issuer does not have relawan entry.
    const issuerRef = fsdb.doc(FsPath.relawan(cd.issuer.uid));
    const issuer = (await t.get(issuerRef)).data() as Relawan;
    if (!issuer) {
      console.error(`Issuer ${user.uid} is not in Firestore, ${code}`);
      return null;
    }

    // Abort if the issuer never generate the code.
    const i = issuer.code[code];
    if (!i) {
      console.error(`Issuer ${user.uid} never generate ${code}`);
      return null;
    }

    i.claimer = cd.claimer = claimer.profile;
    i.claimedTs = cd.claimedTs = ts;

    claimer.depth = cd.depth;
    claimer.referrer = cd.issuer;

    t.update(codeRef, cd);
    t.update(issuerRef, issuer);
    t.update(claimerRef, claimer);
    return cd;
  });

  if (!c || !c.claimer || c.claimer.uid !== user.uid) {
    return res.json({ error: `Maaf, kode ${code} tidak dapat digunakan` });
  }
  await rtdb.ref(`r/${user.uid}`).set([c.issuer.uid, ts]);
  return res.json({ code: c });
});

app.post('/api/change_role', async (req, res) => {
  const user = await validateToken(req, res);
  if (!user) return null;

  const tuid = req.body.uid;
  if (!isValidUserId(tuid) || tuid === user.uid) {
    console.error(`Invalid tuid ${user.uid} to ${tuid}`);
    return res.json({ error: 'Invalid uid' });
  }

  const role = req.body.role;
  if (!USER_ROLE[role] || typeof role !== 'number') {
    console.error(`Invalid role ${user.uid} to ${role}`);
    return res.json({ error: 'Invalid role' });
  }

  const ts = Date.now();
  const actorRef = fsdb.doc(FsPath.relawan(user.uid));
  const targetRef = fsdb.doc(FsPath.relawan(tuid));
  const ok = await fsdb.runTransaction(async t => {
    const actor = (await t.get(actorRef)).data() as Relawan;
    if (!actor) return `No relawan for ${user.uid}`;
    if (actor.profile.role < USER_ROLE.ADMIN) return `Not an admin ${user.uid}`;

    const target = (await t.get(targetRef)).data() as Relawan;
    if (!target) return `No relawan for ${tuid}`;
    if (target.profile.role === role) return `No change`;
    if (target.profile.role === USER_ROLE.ADMIN) return `Admin demoted`;
    target.profile.role = role;
    t.update(targetRef, target);

    const logRef = fsdb.doc(FsPath.changeLog(autoId()));
    const cl: ChangeLog = { auid: user.uid, tuid, role, ts };
    t.create(logRef, cl);
    return true;
  });

  if (ok !== true) {
    console.error(ok);
    return res.json({ error: 'Unable to change role' });
  }

  return res.json({ ok: true });
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
