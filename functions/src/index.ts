import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as request from 'request-promise';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const auth = admin.auth();
const rtdb = admin.database();

// Creates a serving url for the uploaded images.
export const handlePhotoUpload = functions.storage
  .object()
  .onFinalize(async object => {
    // Exit if this is triggered on a file that is not an image.
    if (!object.contentType.startsWith('image/')) {
      console.warn(`Not an image: ${object.name}`);
      return null;
    }

    const domain = 'kawal-c1.appspot.com';
    const path = encodeURIComponent(`${domain}/${object.name}`);
    const url = await request(`https://${domain}/gsu?path=${path}`);

    // object.name = uploads/{kelurahanId}/{tpsNo}/{userId}/{imageId}
    const paths = object.name.split('/');
    const [, kelurahanId, tpsNo, userId, imageId] = paths;
    await rtdb.ref(`/uploads/${imageId}`).set({
      kelurahanId,
      tpsNo,
      userId,
      url
    });
  });

import * as express from 'express';

const app = express();
app.use(require('cors')({ origin: true }));

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

app.post('/api/upload', async (req, res) => {
  const user = await validateToken(req, res);
  if (!user) return null;

  console.log('body', req.body);
  const imageId = req.body.imageId;
  if (!imageId.match(/^[A-Za-z0-9]{20}$/)) {
    return res.json({ error: 'Invalid imageId' });
  }
  // TODO: centralize check.
  const kelurahanId = parseInt(req.body.kelurahanId, 10);
  if (isNaN(kelurahanId) || kelurahanId < 0 || kelurahanId > 100000) {
    return res.json({ error: 'Invalid kelurahanId' });
  }
  const tpsNo = parseInt(req.body.tpsNo, 10);
  if (isNaN(tpsNo) || tpsNo < 0 || tpsNo > 1000) {
    return res.json({ error: 'Invalid tpsNo' });
  }
  const jokowi = parseInt(req.body.jokowi, 10);
  if (isNaN(jokowi) || jokowi < 0 || jokowi > 1000) {
    return res.json({ error: 'Invalid jokowi' });
  }
  const prabowo = parseInt(req.body.prabowo, 10);
  if (isNaN(prabowo) || prabowo < 0 || prabowo > 1000) {
    return res.json({ error: 'Invalid prabowo' });
  }
  const sah = parseInt(req.body.sah, 10);
  if (isNaN(sah) || sah < 0 || sah > 1000) {
    return res.json({ error: 'Invalid sah' });
  }
  const tidakSah = parseInt(req.body.tidakSah, 10);
  if (isNaN(tidakSah) || tidakSah < 0 || tidakSah > 1000) {
    return res.json({ error: 'Invalid tidakSah' });
  }
  const url = (await rtdb.ref(`uploads/${imageId}/url`).once('value')).val();
  if (!url) {
    return res.json({ error: 'Invalid url' });
  }

  // TODO: move this to admin action.
  const ts = Date.now();
  const u: Upsert = {
    kelurahanId,
    tpsNo,
    a: {
      sum: [jokowi, prabowo, sah, tidakSah, 0],
      max: [ts]
    },
    t: ts
  };
  await rtdb.ref().update({
    [`kelurahan/${kelurahanId}/tps/${tpsNo}/${imageId}`]: {
      url,
      jokowi,
      prabowo,
      sah,
      tidakSah,
      ts
    },
    [`upserts/data/${imageId}`]: u
  });

  return res.json({ url });
});

export interface Aggregate {
  sum: number[];
  max: number[];
}

export interface Upsert {
  kelurahanId: number;
  tpsNo: number;
  a: Aggregate;
  t: number;
}

async function updateAggregates(parentIds: number[], u: Upsert, updates) {
  parentIds.push(u.tpsNo);
  const parentAs$: Promise<Aggregate>[] = [];
  for (let i = 0; i <= 4; i++) {
    const pid = parentIds[i];
    const cid = parentIds[i + 1];
    parentAs$.push(
      rtdb
        .ref(`h/${pid}/a/${cid}`)
        .once('value')
        .then(s => s.val())
    );
  }
  const parentAs = await Promise.all(parentAs$);
  const t = parentAs[4] || { sum: [], max: [] };
  const deltaSum = [];
  for (let i = 0; i < u.a.sum.length; i++) {
    deltaSum.push(u.a.sum[i] - (t.sum[i] || 0));
  }
  const newMax = [];
  for (let i = 0; i < u.a.max.length; i++) {
    newMax[i] = Math.max(u.a.max[i], t.max[i] || u.a.max[i]);
  }

  for (let i = 0; i <= 4; i++) {
    const pid = parentIds[i];
    const cid = parentIds[i + 1];
    const p = parentAs[i] || { sum: [], max: [] };
    for (let j = 0; j < u.a.sum.length; j++) {
      p.sum[j] = (p.sum[j] || 0) + deltaSum[j];
    }
    for (let j = 0; j < u.a.max.length; j++) {
      p.max[j] = Math.max(p.max[j] || newMax[j], newMax[j]);
    }
    updates[`h/${pid}/a/${cid}`] = p;
  }
}

async function getParentIds(kelurahanId: number) {
  const parentIds: Promise<number>[] = [Promise.resolve(0)];
  for (let i = 1; i < 4; i++) {
    parentIds.push(
      rtdb
        .ref(`h/${kelurahanId}/p/${i}/0`)
        .once('value')
        .then(s => s.val())
    );
  }
  parentIds.push(Promise.resolve(kelurahanId));
  return Promise.all(parentIds);
}

app.get('/api/processUpserts/:key/:timestamp', async (req, res) => {
  if (req.params.key !== 'l32kj09309823ll1kk1lasJKLDK83kjKJHD') {
    return res.json({ error: 'Invalid key' });
  }
  try {
    return res.json({ ok: await processAggregate() });
  } catch (e) {
    return res.json({ error: e.message });
  }
});

async function processAggregate() {
  const t0 = Date.now();
  const { committed, snapshot } = await rtdb
    .ref('upserts/lock')
    .transaction(t => {
      if (t && t.lease !== t0 && t0 - t.lease < 60000) return undefined;
      return { lease: t0, lower: (t && t.lower) || 0 };
    });

  if (!committed) return `Cannot grab the global lock`;

  let lower = snapshot.val().lower;
  let t1 = Date.now();
  const lockTime = t1 - t0;
  while (t1 - t0 < 55000) {
    const upserts: { [key: string]: Upsert } =
      (await rtdb
        .ref(`upserts/data`)
        .orderByChild('t')
        .startAt(lower + 1)
        .limitToFirst(1000)
        .once('value')).val() || {};

    const imageIds = Object.keys(upserts);
    if (imageIds.length === 0) break;
    const parentIds = await Promise.all(
      imageIds.map(k => getParentIds(upserts[k].kelurahanId))
    );
    const t2 = Date.now();

    const updates = {};
    const promises = [];
    for (let i = 0; i < imageIds.length; i++) {
      const imageId = imageIds[i];
      const u = upserts[imageId];
      promises.push(updateAggregates(parentIds[i], u, updates));
      lower = Math.max(lower, u.t);
      updates[`upserts/data/${imageId}/a/t`] = t0;
    }
    updates[`upserts/lock/lower`] = lower;
    await Promise.all(promises);
    const t3 = Date.now();

    await rtdb.ref().update(updates);
    const t4 = Date.now();

    const msg = `Processed ${
      imageIds.length
    } updates: lock ${lockTime}, parents ${t2 - t1}, updates = ${t3 -
      t2}, write = ${t4 - t3}, TOTAL: ${t4 - t1}`;
    console[t4 - t1 > 2000 ? 'warn' : 'log'](msg);
    t1 = t4;
  }

  if (t1 - t0 < 60000) {
    await rtdb.ref(`upserts/lock/lease`).set(0);
    console.log('Released lock');
  }
  return Date.now() - t0;
}

exports.processAggregate = functions.database
  .ref(`upserts/data/{imageId}`)
  .onCreate(processAggregate);

exports.api = functions.https.onRequest(app);
