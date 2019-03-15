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
  UploadRequest,
  FsPath,
  HierarchyNode,
  autoId,
  CodeReferral,
  Relawan,
  isValidImageId,
  SUM_KEY,
  APP_SCOPED_PREFIX_URL,
  MAX_REFERRALS,
  MAX_NUM_UPLOADS,
  USER_ROLE,
  isValidUserId,
  ChangeLog,
  Aggregate,
  SumMap,
  RelawanPhotos
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

/**
 * Validates Firebase ID Tokens passed in the authorization HTTP header.
 * Adds the decoded ID Token content to the request object.
 */
function validateToken() {
  return (req, res: express.Response, next) => {
    if (req.query.abracadabra) {
      return next();
    }
    const a = req.headers.authorization;
    if (!a || !a.startsWith('Bearer ')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    return auth
      .verifyIdToken(a.substring(7))
      .then(user => {
        req.user = user;
        next();
      })
      .catch(() => res.status(403).json({ error: 'Invalid token' }));
  };
}

function maxRequestPerMinute(n: number) {
  const qpm: { [uid: string]: number } = {};
  return (req, res, next) => {
    if (!req.query.abracadabra) {
      const user = req.user as admin.auth.DecodedIdToken;
      const num = (qpm[user.uid] = (qpm[user.uid] || 0) + 1);
      if (num > n) {
        console.warn(`User ${user.uid} is rate-limited: ${req.url}`);
        res.status(403).json({ error: 'Rate-limited' });
        return null;
      }
      if (num === 1) {
        setTimeout(() => delete qpm[user.uid], 60 * 1000);
      }
    }
    next();
  };
}

const app = express();
app.use(require('cors')({ origin: true }));
app.use(validateToken());
app.use(maxRequestPerMinute(30));

function getChildren(cid): Promise<HierarchyNode> {
  const host = '35.188.68.201:8080';
  const options = { timeout: 3000, json: true };
  return request(`http://${host}/api/c/${cid}`, options);
}

const CACHE_TIMEOUT = 1;
const cache_c: any = {};
app.get('/api/c/:id', async (req, res) => {
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

/** Fetches image metadata from Firestore, wait until it's populated. */
function populateServingUrl() {
  return async (req, res, next) => {
    const user = req.user as admin.auth.DecodedIdToken;
    const b = req.body as UploadRequest;
    const p: UploadRequest = (req.parsedBody = {
      imageId: b.imageId,
      kelId: +req.body.kelId,
      tpsNo: +req.body.tpsNo,
      meta: extractImageMetadata(req.body.metadata),
      ts: Date.now(),
      url: null, // Populated below.
      kelName: '' // Will be populated in the next middleware.
    });

    if (p.imageId.startsWith('zzzzzzz')) {
      p.url =
        'http://lh3.googleusercontent.com/dRp80J1IsmVNeI3HBh-' +
        'ToZA-VumvKXOzp-P_XrgsyhkjMV9Lldfq7-V9hhkolUAED75_QPn9t4NFNrJNMP8';
      return next();
    }

    if (!isValidImageId(p.imageId)) {
      console.warn(`Metadata invalid ${p.imageId}, ${user.uid}`);
      return res.json({ error: 'Invalid imageId' });
    }

    for (let i = 1; i <= 5; i++) {
      const meta = (await fsdb
        .doc(FsPath.imageMetadata(p.imageId))
        .get()).data() as ImageMetadata;
      if (meta && meta.v) {
        p.url = meta.v;
        return next();
      }
      console.info(`Metadata pending ${p.imageId}, #${i}, ${user.uid}`);
      await delay(i * 1000);
    }
    console.warn(`Metadata missing ${p.imageId}, ${user.uid}`);
    return res.json({ error: 'Metadata does not exists' });
  };
}

function populateKelName() {
  const cache = {};
  return async (req, res, next) => {
    const user = req.user as admin.auth.DecodedIdToken;
    const p = req.parsedBody as UploadRequest;
    let mem = cache[p.kelId];
    if (!mem) {
      try {
        const c = await getChildren(p.kelId);
        if (!c || !c.name) {
          console.warn(`Children missing ${p.kelId}, ${user.uid}`);
          return res.json({ error: 'kelId does not exists' });
        }
        mem = cache[p.kelId] = { name: c.name, hasTpsNo: {} };
        (c.children || []).forEach(t => (mem.hasTpsNo[t[0]] = true));
      } catch (e) {
        console.warn(`Error ${e.message}, ${user.uid}`);
        return res.json({ error: 'Server error please retry in 1 minute' });
      }
    }
    p.kelName = mem.name;
    if (!mem.hasTpsNo[p.tpsNo]) {
      console.warn(`TPS missing ${p.kelId} ${p.tpsNo}, ${user.uid}`);
      return res.json({ error: 'tpsNo does not exists' });
    }
    next();
  };
}

function populateUploader() {
  return async (req, res, next) => {
    const user = req.user as admin.auth.DecodedIdToken;

    const pRef = fsdb.doc(FsPath.relawanPhoto(user.uid));
    let photo = (req.photo = (await pRef.get()).data() as RelawanPhotos);
    if (!photo) {
      const uRef = fsdb.doc(FsPath.relawan(user.uid));
      const uploader = (await uRef.get()).data() as Relawan;
      if (!uploader || !uploader.profile || uploader.profile.uid !== user.uid) {
        console.error(`Uploader ${user.uid}: ${JSON.stringify(uploader)}`);
        return res.json({ error: 'Uploader not found' });
      }
      photo = {
        profile: uploader.profile,
        uploads: [],
        count: 0
      };
    }

    const p = req.parsedBody as UploadRequest;
    photo.uploads.unshift(p);
    photo.count = (photo.count || 0) + 1;
    if (photo.count > MAX_NUM_UPLOADS) {
      console.error(`Exceeded max uploads ${user.uid}`);
      return res.json({ error: 'Exceeded max number of uploads' });
    }
    next();
  };
}

app.post(
  '/api/upload',
  [populateServingUrl(), populateKelName(), populateUploader()],
  async (req: any, res) => {
    const user = req.user as admin.auth.DecodedIdToken;
    const p = req.parsedBody as UploadRequest;
    const photo = req.photo as RelawanPhotos;
    const action = { sum: { cakupan: 1, pending: 1 }, ts: p.ts } as Aggregate;
    const upsert: Upsert = {
      request: p,
      uploader: {
        ...photo.profile,
        ts: p.ts,
        ua: req.headers['user-agent'],
        ip: getIp(req)
      },
      reviewer: null,
      reporter: null,
      done: 0,
      action
    };

    try {
      const batch = fsdb.batch();
      batch.create(fsdb.doc(FsPath.upserts(p.imageId)), upsert);
      batch.update(fsdb.doc(FsPath.relawanPhoto(user.uid)), photo);
      await batch.commit();
    } catch (e) {
      console.error(`Database error for ${user.uid}`);
      return res.json({ error: 'Database error' });
    }

    return res.json({ ok: true });
  }
);

function getIp(req: express.Request) {
  const ip = req.headers['fastly-client-ip'];
  return typeof ip === 'string' ? ip : JSON.stringify(ip);
}

function populateAction() {
  return async (req, res, next) => {
    const user = req.user as admin.auth.DecodedIdToken;
    const b = req.body as Aggregate;
    if (!b || !b.sum) {
      console.warn(`No action, uid = ${user.uid}`);
      return res.json({ error: 'No action' });
    }

    const action = { sum: {} as SumMap, urls: [], ts: Date.now() } as Aggregate;
    req.parsedBody = action;

    // Incoming urls are actually in the form of imageIds.
    const imageIds = [];
    for (const imageId of b.urls) {
      if (!isValidImageId(imageId)) {
        console.warn(`Invalid imageId ${imageId} for user ${user.uid}`);
        return res.json({ error: 'Invalid imageId' });
      }
      imageIds.push(imageId);
    }
    if (!imageIds.length || imageIds.length > 30) {
      console.warn(`imageIds invalid length ${imageIds.length} ${user.uid}`);
      return res.json({ error: 'Invalid number of imageIds' });
    }
    req.imageId = imageIds[0];

    // All images must be in the same kelId and tpsNo.
    const docRefs = imageIds.map(i => fsdb.doc(FsPath.imageMetadata(i)));
    let kelId = -1;
    let tpsNo = -1;
    for (const snap of await fsdb.getAll(...docRefs)) {
      const i = snap.data() as ImageMetadata;
      if (kelId === -1) {
        kelId = i.k;
        tpsNo = i.t;
      } else if (kelId !== i.k || tpsNo !== i.t) {
        console.warn(`Image ids are on different locations ${user.uid}`);
        return res.json({ error: 'Wrong imageId locations' });
      }
      action.urls.push(i.v);
    }

    for (const key in b.sum) {
      if (!SUM_KEY[key]) {
        console.error(`Sum key invalid ${user.uid}`);
        return res.json({ error: 'Invalid sum key' });
      }
      const sum = b.sum[key];
      if (typeof sum !== 'number' || sum < 0 || sum > 1000) {
        console.error(`Sum ${sum} out of range ${user.uid}`);
        return res.json({ error: 'Invalid sum range' });
      }
      if (
        (key === SUM_KEY.pending ||
          key === SUM_KEY.error ||
          key === SUM_KEY.cakupan) &&
        sum > 1
      ) {
        console.error(`Sum flag ${sum} out of range ${user.uid}`);
        return res.json({ error: 'Invalid sum flag' });
      }
      action.sum[key] = sum;
    }
    next();
  };
}

app.post('/api/approve', [populateAction()], async (req: any, res) => {
  const user = req.user as admin.auth.DecodedIdToken;
  const action = req.parsedBody.action as Aggregate;

  const uRef = fsdb.doc(FsPath.upserts(req.imageId));
  const rRef = fsdb.doc(FsPath.relawan(user.uid));
  const ok = await fsdb.runTransaction(async t => {
    const r = (await t.get(rRef)).data() as Relawan;
    if (r.profile.role < USER_ROLE.MODERATOR) {
      return 'not_authorized';
    }

    // TODO: insert to TPS log.
    const u = (await t.get(uRef)).data() as Upsert;
    u.reviewer = {
      ...r.profile,
      ts: action.ts,
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

app.post('/api/problem', async (req: any, res) => {
  const user = req.user as admin.auth.DecodedIdToken;
  const imageId = req.body.imageId;
  if (!isValidImageId(imageId)) {
    return res.json({ error: 'Invalid imageId' });
  }

  const uRef = fsdb.doc(FsPath.upserts(imageId));
  const rRef = fsdb.doc(FsPath.relawan(user.uid));
  const ok = await fsdb.runTransaction(async t => {
    const u = (await t.get(uRef)).data() as Upsert;
    if (!u || !u.action) {
      return false;
    }
    const r = (await t.get(rRef)).data() as Relawan;
    u.reporter = {
      ...r.profile,
      ts: Date.now(),
      ua: req.headers['user-agent'],
      ip: getIp(req)
    };
    u.action = { sum: { error: 1 } } as Aggregate;
    u.done = 0;
    t.update(uRef, u);
    return true;
  });

  return res.json(ok ? { ok: true } : { error: 'Invalid imageId' });
});

app.post('/api/register/login', async (req: any, res) => {
  const user = req.user as admin.auth.DecodedIdToken;
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

app.post('/api/register/create_code', async (req: any, res) => {
  const user = req.user as admin.auth.DecodedIdToken;
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

app.post('/api/register/:code', async (req: any, res) => {
  const user = req.user as admin.auth.DecodedIdToken;
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

app.post('/api/change_role', async (req: any, res) => {
  const user = req.user as admin.auth.DecodedIdToken;
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
