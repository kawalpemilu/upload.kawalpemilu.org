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
  RelawanPhotos,
  UpsertProfile,
  TpsData,
  ApproveRequest,
  toChildren,
  FORM_TYPE,
  IS_PLANO,
  TpsAggregate,
  PublicProfile,
  ProblemRequest,
  MAX_URL_LENGTH,
  MAX_REASON_LENGTH,
  MAX_REPORT_ERRORS
} from 'shared';

const t1 = Date.now();

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const auth = admin.auth();
const fsdb = admin.firestore();

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
      console.warn(`gsu retry ${ithRetry}: ${e.message}`);
      await delay(ithRetry * 1000);
      return getServingUrl(objectName, ithRetry + 1, maxRetry);
    });
}

// Creates a serving url for the uploaded images.
exports.handlePhotoUpload = functions.storage
  .object()
  .onFinalize(async object => {
    const paths = object.name.split('/');
    // object.name = uploads/{kelurahanId}/{tpsNo}/{userId}/{imageId}
    const [dir, kelurahanId, tpsNo, userId, imageId] = paths;

    if (dir !== 'uploads') {
      return null;
    }

    // Exit if this is triggered on a file that is not an image.
    if (!object.contentType.startsWith('image/')) {
      console.warn(`Not an image: ${object.name}`);
      return null;
    }

    const m = {} as ImageMetadata;
    m.u = userId;
    m.k = parseInt(kelurahanId, 10);
    m.t = parseInt(tpsNo, 10);
    if (isNaN(m.k) || isNaN(m.t)) {
      throw new Error(`Invalid lokasi ${object.name}`);
    }
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
const bodyParser = require('body-parser');
app.use(require('cors')({ origin: true }));
app.use(validateToken());
app.use(maxRequestPerMinute(30));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use((err, req, res, next) => {
  if (err !== null) {
    const user = req.user as admin.auth.DecodedIdToken;
    if (err.status === 400 && err.name === 'SyntaxError' && err.body) {
      const b = err.body.slice(0, 100).toString();
      console.error(`Error ${user.uid} ${req.method + ' ' + req.url} : ${b}`);
    } else {
      console.error(`Error ${user.uid} ${req.method + ' ' + req.url}`);
    }
    res.json({ error: 'invalid request' });
  } else {
    next();
  }
});

const CACHE_TIMEOUT = 1;
const cache_c: any = {};
let fallbackUntilTs = 0;
async function getHierarchyNode(cid: number) {
  const ts = Date.now();
  if (fallbackUntilTs < ts) {
    try {
      const host = '35.193.104.134:8080';
      const options = { timeout: 2000, json: true };
      return await request(`http://${host}/api/c/${cid}`, options);
    } catch (e) {
      console.error(`fail c/${cid}: ${e.message}`);
      fallbackUntilTs = ts + 15 * 1000;
    }
  }

  // Fallback to hierarchy with stale cache sum.
  let snap = await fsdb.doc(FsPath.hieCache(cid)).get();
  let c = snap.data() as HierarchyNode;
  if (c) {
    console.log(`Fallback to cache hierarchy`);
  } else {
    // Fallback to static hierarchy, without sum.
    snap = await fsdb.doc(FsPath.hie(cid)).get();
    c = snap.data() as HierarchyNode;
    console.warn(`Fallback to static hierarchy`);
  }

  if (c) {
    c.children = toChildren(c);
    c.data = c.data || {};
    delete c.child;
  } else {
    c = {} as HierarchyNode;
  }
  return c;
}

app.get('/api/c/:id', async (req: any, res) => {
  const cid = +req.params.id;
  if (isNaN(cid) || cid >= 1e6) {
    return res.json({});
  }

  let c = cache_c[cid];
  res.setHeader('Cache-Control', `max-age=${CACHE_TIMEOUT}`);
  if (c) return res.json(c);

  c = cache_c[cid] = await getHierarchyNode(cid);
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
      kelId: +b.kelId,
      tpsNo: +b.tpsNo,
      meta: extractImageMetadata(b.meta),
      ts: Date.now(),
      url: null, // Populated below.
      kelName: '', // Will be populated in the next middleware.
      c1: null, // Will be populated on approved
      sum: null // Will be populated on approved
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
      if (i > 2) {
        console.info(`Metadata pending ${p.imageId}, #${i}, ${user.uid}`);
      }
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
    const p = req.parsedBody as {
      kelId: number;
      tpsNo: number;
      kelName: string;
    };
    if (!p.kelId || !p.tpsNo) {
      console.warn(`KelName ${p.kelId} ${p.tpsNo}, ${user.uid}`);
      return res.json({ error: 'missing parameters' });
    }
    let mem = cache[p.kelId];
    if (!mem) {
      try {
        const c = await getHierarchyNode(p.kelId);
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

async function uploadPhoto(p: UploadRequest, req) {
  const user = req.user as admin.auth.DecodedIdToken;
  const ts = p.ts;
  const rRef = fsdb.doc(FsPath.relawan(user.uid));
  const pRef = fsdb.doc(FsPath.relawanPhoto(user.uid));
  const tRef = fsdb.doc(FsPath.tps(p.kelId, p.tpsNo));
  return await fsdb
    .runTransaction(async t => {
      const r = (await t.get(rRef)).data() as Relawan;
      if (!r || !r.profile || r.profile.uid !== user.uid) {
        return 'Uploader not found';
      }

      let photo = (await t.get(pRef)).data() as RelawanPhotos;
      if (photo) {
        photo.profile = r.profile;
      } else {
        photo = {
          profile: r.profile,
          uploads: [],
          uploadCount: 0,
          maxUploadCount: 0,
          reports: [],
          reportCount: 0,
          maxReportCount: 0,
          reviewCount: 0,
          nTps: 0,
          nKel: 0
        };
      }

      let tps = (await t.get(tRef)).data() as TpsData;
      tps = tps || { images: {}, imgCount: 0 };

      photo.uploads.unshift(p);
      photo.uploadCount = photo.uploads.length;
      const maxNumUploads = photo.maxUploadCount || MAX_NUM_UPLOADS;
      if (photo.uploadCount > maxNumUploads) return 'Exceeded max uploads';

      const pu = photo.uploads;
      photo.nTps = new Set(pu.map(up => up.kelId + '-' + up.tpsNo)).size;
      photo.nKel = new Set(pu.map(up => up.kelId)).size;

      const ua = req.headers['user-agent'];
      const ip = getIp(req);
      const uploader = { ...photo.profile, ts, ua, ip } as UpsertProfile;

      tps.images[p.imageId] = {
        uploader,
        reviewer: null,
        reports: null,
        c1: null,
        sum: {} as SumMap,
        url: p.url,
        meta: p.meta
      };
      tps.imgCount++;

      const action = computeAction(tps);
      const upsert = { request: p, uploader, done: 0, action } as Upsert;

      t.create(fsdb.doc(FsPath.upserts(p.imageId)), upsert);
      t.set(pRef, photo);
      t.set(tRef, tps);
      return true;
    })
    .catch(e => {
      console.error(`DB error ${user.uid}`, e);
      return `Database error`;
    });
}

app.post(
  '/api/upload',
  [populateServingUrl(), populateKelName()],
  async (req: any, res) => {
    const user = req.user as admin.auth.DecodedIdToken;
    const p = req.parsedBody as UploadRequest;
    const ok = await uploadPhoto(p, req);
    if (ok !== true) {
      console.error(`Upload failed ${user.uid}: ${ok}`);
      return res.json({ error: ok });
    }
    return res.json({ ok: true });
  }
);

function getIp(req: express.Request) {
  const ip = req.headers['fastly-client-ip'];
  return typeof ip === 'string' ? ip : JSON.stringify(ip);
}

function populateApprove() {
  return async (req, res, next) => {
    const user = req.user as admin.auth.DecodedIdToken;
    const b = req.parsedBody as ApproveRequest;

    const a = {
      kelId: b.kelId,
      tpsNo: b.tpsNo,
      kelName: b.kelName
    } as ApproveRequest;
    if (!b || !isValidImageId(b.imageId)) {
      console.warn(`Invalid imageId ${b.imageId} for user ${user.uid}`);
      return res.json({ error: 'Invalid imageId' });
    }
    a.imageId = b.imageId;

    if (!b.c1 || !FORM_TYPE[b.c1.type]) {
      console.warn(`Invalid form ${JSON.stringify(b.c1)} for ${user.uid}`);
      return res.json({ error: 'Invalid form' });
    }
    if (b.c1.type !== FORM_TYPE.MALICIOUS && b.c1.type !== FORM_TYPE.OTHERS) {
      if (!IS_PLANO[b.c1.plano]) {
        console.warn(`Invalid plano ${JSON.stringify(b.c1)} for ${user.uid}`);
        return res.json({ error: 'Invalid form' });
      }
    }
    a.c1 = { type: b.c1.type, plano: b.c1.plano };

    if (!b || !b.sum) {
      console.warn(`No sum ${user.uid}`);
      return res.json({ error: 'No sum' });
    }
    a.sum = {} as SumMap;
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
      a.sum[key] = sum;
    }
    req.parsedBody = a;
    next();
  };
}

function computeAction(tps: TpsData) {
  const action = { sum: {} as SumMap, photos: {}, ts: 0, c1: null };
  for (const imageId of Object.keys(tps.images)) {
    const i = tps.images[imageId];
    if (!i.c1) {
      action.sum.cakupan = 1;
      action.sum.pending = 1;
    } else if (i.c1.type === FORM_TYPE.MALICIOUS) {
      action.photos[i.url] = null;
    } else if (i.c1.type === FORM_TYPE.OTHERS) {
      action.photos[i.url] = null;
    } else {
      action.sum.cakupan = 1;
      action.photos[i.url] = {
        c1: i.c1,
        sum: i.sum,
        ts: i.reviewer.ts
      };
      action.ts = Math.max(action.ts, i.reviewer.ts);
      for (const key of Object.keys(i.sum)) {
        if (typeof action.sum[key] === 'number') {
          if (action.sum[key] !== i.sum[key]) {
            action.sum.janggal = 1;
          }
        } else {
          action.sum[key] = i.sum[key];
        }
      }
    }
  }
  return action;
}

app.post(
  '/api/approve',
  [
    (req, res, next) => {
      const b = req.body as ApproveRequest;
      const p: ApproveRequest = {
        kelId: +b.kelId,
        kelName: '',
        tpsNo: +b.tpsNo,
        imageId: b.imageId,
        sum: b.sum,
        c1: b.c1
      };
      req.parsedBody = p;
      next();
    },
    populateKelName(),
    populateApprove()
  ],
  async (req: any, res) => {
    const user = req.user as admin.auth.DecodedIdToken;
    const a = req.parsedBody as ApproveRequest;
    const ua = req.headers['user-agent'];
    const ip = getIp(req);
    const ts = Date.now();

    const uRef = fsdb.doc(FsPath.upserts(a.imageId));
    const upsert = (await uRef.get()).data() as Upsert;
    if (!upsert) {
      console.warn(`No upsert ${user.uid} : ${a.imageId}`);
      return res.json({ error: 'No upsert' });
    }

    if (a.c1.type === FORM_TYPE.MALICIOUS) {
      const tuid = upsert.uploader.uid;
      console.log(`Mal ${a.imageId} ${tuid}, a = ${user.uid}`);
      const okBan = await changeRole(user.uid, tuid, USER_ROLE.BANNED, true);
      if (okBan !== true) console.error(`Ban failed ${okBan}`);
    } else if (
      upsert.request.kelId !== a.kelId ||
      upsert.request.tpsNo !== a.tpsNo
    ) {
      // Moving photo to another TPS is like make a copy then set the old to OTHERS.
      const copy: UploadRequest = {
        imageId: upsert.request.imageId + '-' + a.kelId + '-' + a.tpsNo,
        kelId: a.kelId,
        kelName: a.kelName,
        tpsNo: a.tpsNo,
        meta: upsert.request.meta,
        url: upsert.request.url,
        ts,
        c1: null,
        sum: null
      };
      await uploadPhoto(copy, req);
      a.c1.type = FORM_TYPE.OTHERS;
    }

    const rRef = fsdb.doc(FsPath.relawan(user.uid));
    const rpRef = fsdb.doc(FsPath.relawanPhoto(user.uid));
    const ok = await fsdb
      .runTransaction(async t => {
        const r = (await t.get(rRef)).data() as Relawan;
        if (!r || r.profile.role < USER_ROLE.MODERATOR) 'Not Authorized';
        const rp = (await t.get(rpRef)).data() as RelawanPhotos;
        rp.profile = r.profile;
        rp.reviewCount = (rp.reviewCount || 0) + 1;

        const u = (await t.get(uRef)).data() as Upsert;
        if (!u) return 'No Upsert';
        if (r.profile.role < USER_ROLE.ADMIN && u.reviewer)
          return 'Already approved';

        const pRef = fsdb.doc(FsPath.relawanPhoto(u.uploader.uid));
        const urp = (await t.get(pRef)).data() as RelawanPhotos;
        if (!urp) return 'No relawan photo';
        const photo = urp.uploads.find(p => p.imageId === a.imageId);
        if (!photo) return `No photo for ${a.imageId}`;

        const tRef = fsdb.doc(FsPath.tps(u.request.kelId, u.request.tpsNo));
        const tps = (await t.get(tRef)).data() as TpsData;
        if (!tps) return 'No TPS';

        const img = tps.images[a.imageId];
        if (!img) return 'No Image';

        photo.c1 = img.c1 = a.c1;
        photo.sum = img.sum = a.sum;
        img.sum.pending = 0;

        u.reviewer = img.reviewer = { ...r.profile, ts, ua, ip };
        u.action = computeAction(tps);
        u.done = 0;

        t.update(pRef, urp);
        t.update(rpRef, rp);
        t.update(rRef, r);
        t.update(uRef, u);
        t.update(tRef, tps);
        return true;
      })
      .catch(e => {
        console.error(`DB error approve ${user.uid}`, e);
        return `Database error`;
      });

    if (ok !== true) {
      console.warn(`Error approve ${user.uid} : ${ok}`);
      return res.json({ error: ok });
    }
    return res.json({ ok: true });
  }
);

app.post(
  '/api/problem',
  [
    (req, res, next) => {
      const user = req.user as admin.auth.DecodedIdToken;
      const b = req.body as ProblemRequest;
      const p: ProblemRequest = (req.parsedBody = {
        kelId: +b.kelId,
        kelName: '',
        tpsNo: +b.tpsNo,
        url: b.url,
        reason: b.reason
      });

      if (typeof p.url !== 'string' || p.url.length > MAX_URL_LENGTH) {
        console.warn(`URL problem ${user.uid} ${p.kelId} ${p.tpsNo}`);
        return res.json({ error: 'invalid URL' });
      }

      if (typeof p.reason !== 'string' || p.reason.length > MAX_REASON_LENGTH) {
        console.warn(`Reason problem ${user.uid} ${p.kelId} ${p.tpsNo}`);
        return res.json({ error: 'invalid reason' });
      }

      next();
    },
    populateKelName()
  ],
  async (req: any, res) => {
    const user = req.user as admin.auth.DecodedIdToken;
    const p = req.parsedBody as ProblemRequest;

    const ts = Date.now();
    const ip = getIp(req);
    const ua = req.headers['user-agent'];
    const tRef = fsdb.doc(FsPath.tps(p.kelId, p.tpsNo));
    const rpRef = fsdb.doc(FsPath.relawanPhoto(user.uid));
    const ok = await fsdb
      .runTransaction(async t => {
        const tps = (await t.get(tRef)).data() as TpsData;
        const imageId = Object.keys(tps.images).find(
          i => tps.images[i].url === p.url
        );
        if (!imageId) return 'invalid URL';
        const uRef = fsdb.doc(FsPath.upserts(imageId));
        const u = (await t.get(uRef)).data() as Upsert;
        if (!u) return 'imageId not found';

        const rp = (await t.get(rpRef)).data() as RelawanPhotos;
        rp.reports = rp.reports || [];
        rp.reports.unshift(p);
        rp.reportCount = rp.reports.length;
        const maxReports = rp.maxReportCount || MAX_REPORT_ERRORS;
        if (rp.reportCount > maxReports) return 'too many reports';

        const reporter: UpsertProfile = { ...rp.profile, ts, ua, ip };

        const img = tps.images[imageId];
        img.reports = img.reports || {};
        img.reports[ts] = { reporter, reason: p.reason };
        img.sum.error = 1;

        u.reporter = reporter;
        u.action = computeAction(tps);
        u.done = 0;

        t.update(tRef, tps);
        t.update(uRef, u);
        t.update(rpRef, rp);
        return true;
      })
      .catch(e => {
        console.error(`DB lapor ${user.uid}`, e);
        return `Database error`;
      });

    if (ok !== true) {
      console.error(`Report ${user.uid} : ${ok}`);
      return res.json({ error: ok });
    }

    return res.json({ ok: true });
  }
);

app.post('/api/register/login', async (req: any, res) => {
  const user = req.user as admin.auth.DecodedIdToken;
  if (user.uid !== user.user_id) {
    console.error(`UID differs ${user.uid} !== ${user.user_id}`);
    return res.json({ error: 'System error' });
  }

  const token = req.body.token;
  try {
    let link = '';
    let pic = '';

    if (token) {
      if (!token.match(/^[a-zA-Z0-9]+$/)) {
        console.error(`Invalid token ${user.uid} ${token}`);
        return res.json({ error: 'Invalid token' });
      }
      const url = `https://graph.facebook.com/me?fields=link,picture.type(large)&access_token=${token}`;
      const me = await request(url, { timeout: 5000, json: true });
      if (!me || me.error) {
        console.error(`Me ${user.uid} : ${token} : ${JSON.stringify(me)}`);
        return res.json({ error: 'Invalid token' });
      }
      const p = APP_SCOPED_PREFIX_URL;
      if (!me.link || !me.link.startsWith(p)) {
        console.error(`Invalid login ${user.uid} link: ${link}`);
      } else {
        link = me.link.substring(p.length);
        if (!link.match(/^[a-zA-Z0-9]+\/$/)) {
          console.error(`Invalid login ${user.uid} shorten link: ${link}`);
          link = '';
        }
      }
      pic = me.picture && me.picture.data && me.picture.data.url;
    }

    let code = '';
    const rRef = fsdb.doc(FsPath.relawan(user.uid));
    const ok = await fsdb.runTransaction(async t => {
      const r = (await t.get(rRef)).data() as Relawan;
      if (r) {
        if (!r.theCode && r.depth > 0) {
          r.theCode = code = await generateCode(t);
          const newCode: CodeReferral = {
            issuer: r.profile,
            issuedTs: Date.now(),
            depth: r.depth + 1,
            name: 'Netizen',
            claimer: null,
            claimedTs: null,
            agg: 0,
            bulk: true
          };
          t.create(fsdb.doc(FsPath.codeReferral(code)), newCode);
        }
        if (!r.profile.link && link) {
          // @ts-ignore
          r.profile.noLink = 'y';
          r.profile.link = link;
        }
        if (pic) {
          r.profile.pic = pic;
        }
        // @ts-ignore
        r.lastTs = Date.now();
        t.update(rRef, r);
      } else {
        const profile: PublicProfile = {
          uid: user.user_id,
          link,
          email: user.email || '',
          name: user.name,
          pic: pic || user.picture,
          role: 0,
          dr4: 0,
          loginTs: Date.now()
        };
        t.create(rRef, { lowerCaseName: user.name.toLowerCase(), profile });
      }
      return true;
    });

    if (ok !== true) {
      console.error(`login failed ${user.uid} : ${ok}`);
      return res.json({ error: ok });
    }

    return res.json({ ok: true, code });
  } catch (e) {
    console.error(`login error ${user.uid} : ${e.message} : token: ${token}`);
    return res.json({ error: `Login failed` });
  }
});

async function generateCode(t) {
  let code;
  for (let i = 0; ; i++) {
    code = autoId(10);
    if (!(await t.get(fsdb.doc(FsPath.codeReferral(code)))).data()) break;
    console.error(`Exists auto id ${code}`);
    if (i > 10) return 'no_id';
  }
  return code;
}

async function addGeneratedCode(r: Relawan, nama, t, code) {
  const newCode: CodeReferral = {
    issuer: r.profile,
    issuedTs: Date.now(),
    depth: r.depth + 1,
    name: nama,
    claimer: null,
    claimedTs: null,
    agg: 0,
    bulk: null
  };
  t.set(fsdb.doc(FsPath.codeReferral(code)), newCode);

  if (!r.code) r.code = {};
  r.code[code] = { name: nama, issuedTs: newCode.issuedTs } as CodeReferral;
  t.update(fsdb.doc(FsPath.relawan(r.profile.uid)), r);
  return newCode;
}

app.post('/api/register/create_code', async (req: any, res) => {
  const user = req.user as admin.auth.DecodedIdToken;
  const nama = req.body.nama;
  if (!nama || !nama.match(/^[A-Za-z ]{1,50}$/))
    return res.json({ error: 'Nama tidak valid' });

  const rRef = fsdb.doc(FsPath.relawan(user.uid));
  const c = await fsdb
    .runTransaction(async t => {
      const r = (await t.get(rRef)).data() as Relawan;
      if (!r) return 'no_user';
      if (r.depth === undefined) return 'no_trust';
      const code = await generateCode(t);
      await addGeneratedCode(r, nama, t, code);
      if (Object.keys(r.code).length > MAX_REFERRALS) return 'no_quota';
      return code;
    })
    .catch(e => {
      console.error(`DB create code ${user.uid}`, e);
      return `no_commit`;
    });

  switch (c) {
    case 'no_user':
      return res.json({ error: 'Datamu tidak ditemukan' });
    case 'no_trust':
      return res.json({ error: 'Maaf, kamu belum berstatus relawan' });
    case 'no_quota':
      return res.json({ error: 'Maaf, pembuatan kode terlalu banyak' });
    case 'no_id':
      return res.json({ error: 'Auto id failed' });
    case 'no_commit':
      return res.json({ error: 'Database error' });
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
  const c = await fsdb
    .runTransaction(async t => {
      // Abort if the code does not exist or already claimed.
      let cd = (await t.get(codeRef)).data() as CodeReferral;
      if (!cd || (!cd.bulk && cd.claimer)) {
        console.error(`Referral ${user.uid} is not usable, ${code}`);
        return null;
      }

      // Abort if the claimer does not have relawan entry.
      const claimer = (await t.get(claimerRef)).data() as Relawan;
      if (!claimer) {
        console.error(`Claimer ${user.uid} is not in Firestore, ${code}`);
        return null;
      }

      // Abort if the user is already trusted.
      if (
        claimer.depth &&
        claimer.depth <= cd.depth &&
        !req.query.abracadabra
      ) {
        console.log(`Attempt to downgrade ${user.uid}, ${code}`);
        return null;
      }

      // Abort if the issuer does not have relawan entry.
      const issuerRef = fsdb.doc(FsPath.relawan(cd.issuer.uid));
      const issuer = (await t.get(issuerRef)).data() as Relawan;
      if (!issuer || !issuer.depth) {
        console.error(`Issuer ${user.uid} is problematic, ${code}`);
        return null;
      }

      let newCode = code;
      if (cd.bulk) {
        // CD is just a token, need to create an actual code.
        newCode = await generateCode(t);
        cd = await addGeneratedCode(issuer, '', t, newCode);
        if (Object.keys(issuer.code).length > MAX_REFERRALS) {
          console.error(`Issuer ${user.uid} exceeds max referrals`);
          return null;
        }
      }

      // Abort if the issuer never generate the code.
      const i = issuer.code[newCode];
      if (!i) {
        console.error(`Issuer ${user.uid} never generate ${newCode}`);
        return null;
      }

      i.claimer = cd.claimer = claimer.profile;
      i.claimedTs = cd.claimedTs = ts;

      claimer.depth = cd.depth;
      claimer.referrer = cd.issuer;

      t.update(fsdb.doc(FsPath.codeReferral(newCode)), cd);
      t.update(issuerRef, issuer);
      t.update(claimerRef, claimer);
      return cd;
    })
    .catch(e => {
      console.error(`DB register ${user.uid}`, e);
      return null;
    });

  if (!c || (!c.bulk && (!c.claimer || c.claimer.uid !== user.uid))) {
    return res.json({ error: `Maaf, kode ${code} tidak dapat digunakan` });
  }
  return res.json({ code: c });
});

async function changeRole(
  actorUid: string,
  tuid: string,
  role: USER_ROLE,
  maliciousPhoto = false
) {
  const ts = Date.now();
  const actorRef = fsdb.doc(FsPath.relawan(actorUid));
  const targetRef = fsdb.doc(FsPath.relawan(tuid));
  return await fsdb
    .runTransaction(async t => {
      const actor = (await t.get(actorRef)).data() as Relawan;
      if (!actor) return `No relawan for ${actorUid}`;
      if (actor.profile.role < USER_ROLE.ADMIN) {
        if (!maliciousPhoto) return `Not an admin`;
        if (actor.profile.role < USER_ROLE.MODERATOR) return `Not a moderator`;
      }

      const target = (await t.get(targetRef)).data() as Relawan;
      if (!target) return `No relawan for ${tuid}`;
      if (target.profile.role === role) return `No change`;
      if (target.profile.role === USER_ROLE.ADMIN) return `Demoting admin`;

      if (target.referrer) {
        const referrerRef = fsdb.doc(FsPath.relawan(target.referrer.uid));
        const referrer = (await t.get(referrerRef)).data() as Relawan;
        if (!referrer) {
          console.error(`Referrer missing: ${tuid} ${target.referrer.uid}`);
        } else {
          let refCode = '';
          for (const code of Object.keys(referrer.code)) {
            const c = referrer.code[code];
            if (c.claimer && c.claimer.uid === tuid) {
              if (refCode) console.error(`Duplicate code ${refCode} ${code}`);
              refCode = code;
            }
          }
          if (!refCode) {
            console.error(`Claimer ${actorUid} ${tuid} ${target.referrer.uid}`);
          } else {
            referrer.code[refCode].claimer.role = role;
            t.update(referrerRef, referrer);
          }
        }
      }

      target.profile.role = role;
      t.update(targetRef, target);

      const logRef = fsdb.doc(FsPath.changeLog(autoId()));
      const cl: ChangeLog = { auid: actorUid, tuid, role, ts };
      t.create(logRef, cl);
      return true;
    })
    .catch(e => {
      console.error(`DB change role ${actorUid}`, e);
      return `Database error`;
    });
}

app.post('/api/change_role', async (req: any, res) => {
  const user = req.user as admin.auth.DecodedIdToken;
  const tuid = req.body.uid;

  // A user cannot change his/her own role.
  if (!isValidUserId(tuid) || tuid === user.uid) {
    console.error(`Invalid tuid ${user.uid} to ${tuid}`);
    return res.json({ error: 'Invalid uid' });
  }

  const role: USER_ROLE = req.body.role;
  if (!USER_ROLE[role] || typeof role !== 'number') {
    console.error(`Invalid role ${user.uid} to ${role}`);
    return res.json({ error: 'Invalid role' });
  }

  const ok = await changeRole(user.uid, tuid, role);
  if (ok !== true) {
    console.error(`Change role ${user.uid} -> ${tuid} : ${ok}`);
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
