import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as request from 'request-promise';
import * as express from 'express';
import { Aggregate, DbPath, AggregateResponse, ImageMetadata } from 'shared';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const auth = admin.auth();
const rtdb = admin.database();

const app = express();
app.use(require('cors')({ origin: true }));

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
  const inputM = req.body.metadata as ImageMetadata;
  const validM = {} as ImageMetadata;
  if (!inputM) {
    return res.json({ error: 'Invalid metadata' });
  }
  if (!inputM.i || !inputM.i.match(/^[A-Za-z0-9]{20}$/)) {
    return res.json({ error: 'Invalid imageId' });
  }
  validM.i = inputM.i;
  ['w', 'h', 'o', 'y', 'x', 'l', 's', 'z'].forEach(attr => {
    if (typeof inputM[attr] === 'number') {
      validM[attr] = inputM[attr];
    }
  });
  if (typeof inputM.m === 'object') {
    validM.m = ['', ''];
    if (typeof inputM.m[0] === 'string') {
      validM.m[0] = inputM.m[0].substring(0, 50);
    }
    if (typeof inputM.m[1] === 'string') {
      validM.m[1] = inputM.m[1].substring(0, 50);
    }
  }

  const kelurahanId = parseInt(req.body.kelurahanId, 10);
  if (isNaN(kelurahanId) || kelurahanId < 0 || kelurahanId > 100000) {
    return res.json({ error: 'kelurahanId out of range' });
  }
  if (
    (await rtdb.ref(DbPath.hieDepth(kelurahanId)).once('value')).val() !== 4
  ) {
    return res.json({ error: 'Invalid kelurahanId' });
  }

  const tpsNo = parseInt(req.body.tpsNo, 10);
  if (isNaN(tpsNo) || tpsNo < 0 || tpsNo > 1000) {
    return res.json({ error: 'tpsNo out of range' });
  }
  // TODO: ensure TPS no exists.

  const ts = Date.now();
  const agg = { sum: [], max: [ts] } as Aggregate;
  const a = req.body.aggregates;
  if (!a || !a.sum || !a.sum.length || a.sum.length > 5) {
    return res.json({ error: 'Invalid aggregates sum' });
  }
  for (let i = 0; i < a.sum.length; i++) {
    const sum = parseInt(a.sum[i], 10);
    if (isNaN(sum) || sum < 0 || sum > 1000) {
      return res.json({ error: 'Invalid sum range' });
    }
    agg.sum.push(sum);
  }

  const url = (await rtdb.ref(`uploads/${validM.i}/url`).once('value')).val();
  if (!url) {
    return res.json({ error: 'Invalid url' });
  }

  const rootId = (await rtdb.ref(`h/${kelurahanId}/p/1`).once('value')).val();

  // TODO: move this to admin action.
  const u: Upsert = {
    k: kelurahanId,
    n: tpsNo,
    a: agg,
    i: req.headers['fastly-client-ip'],
    t: `${rootId}-${ts}`,
    d: 0
  };

  await rtdb.ref().update({
    [`kelurahan/${kelurahanId}/tps/${tpsNo}/${validM.i}`]: {
      u: url,
      a: agg,
      m: validM
    },
    [DbPath.upsertsDataImage(validM.i)]: u
  });

  return res.json({ ok: await processAggregate(rootId) });
});

export interface Upsert {
  k: number; // Kelurahan ID
  n: number; // Tps No
  i: string | string[]; // IP Address
  a: Aggregate; // Value to set
  t: string; // Root ID + '-' + Request Timestamp
  d: number; // Processed Timestamp
}

async function updateAggregates(path: number[], u: Upsert, ha: any) {
  let t = ha[path[4]];
  t = t && t[path[5]];
  t = t || { sum: [], max: [] };

  const deltaSum = [];
  for (let i = 0; i < u.a.sum.length; i++) {
    deltaSum.push(u.a.sum[i] - (t.sum[i] || 0));
  }
  const newMax = [];
  for (let i = 0; i < u.a.max.length; i++) {
    newMax[i] = Math.max(u.a.max[i], t.max[i] || u.a.max[i]);
  }

  for (let i = 0; i <= 4; i++) {
    const pid = path[i];
    if (!ha[pid]) ha[pid] = {};

    const c = ha[pid];
    const cid = path[i + 1];
    if (!c[cid]) c[cid] = { sum: [], max: [] };
    const p = c[cid];

    for (let j = 0; j < u.a.sum.length; j++) {
      p.sum[j] = (p.sum[j] || 0) + deltaSum[j];
    }
    for (let j = 0; j < u.a.max.length; j++) {
      p.max[j] = Math.max(p.max[j] || newMax[j], newMax[j]);
    }
  }
}

function getParentIds(kelurahanIds: number[]) {
  return Promise.all(
    kelurahanIds.map(kelurahanId =>
      rtdb
        .ref(DbPath.hieParents(kelurahanId))
        .once('value')
        .then(s => {
          const parentIds = s.val();
          parentIds.push(kelurahanId);
          return parentIds;
        })
    )
  );
}

async function getHierarchyAggregates(paths: number[][]) {
  const ha = {};
  const promises = [];
  paths.forEach(path => {
    if (path.length !== 6) throw new Error(`Invalid path: ${path}`);
    for (let i = 0; i <= 4; i++) {
      const pid = path[i];
      if (!ha[pid]) ha[pid] = {};

      const cid = path[i + 1];
      const c = ha[pid];
      if (!c[cid]) {
        c[cid] = true;
        promises.push(
          rtdb
            .ref(DbPath.hieAgg(pid, cid))
            .once('value')
            .then(s => (c[cid] = s.val()))
        );
      }
    }
  });
  await Promise.all(promises);
  return ha;
}

app.get('/api/processUpserts/:key/:rootId', async (req, res) => {
  if (req.params.key !== 'l32kj09309823ll1kk1lasJKLDK83kjKJHD') {
    return res.json({ error: 'Invalid key' });
  }
  try {
    return res.json({
      ok: await (req.params.rootId
        ? processAggregate(req.params.rootId)
        : Promise.all(DbPath.rootIds.map(rootId => processAggregate(rootId))))
    });
  } catch (e) {
    return res.json({ error: e.message });
  }
});

async function processAggregate(rootId: number): Promise<AggregateResponse> {
  if (DbPath.rootIds.indexOf(rootId) === -1)
    throw new Error(`Invalid rootId: ${rootId}`);

  const MAX_LEASE = 60000;
  const BATCH_TIME = 5000; // TODO: autotune.
  const t0 = Date.now();
  const { committed, snapshot } = await rtdb
    .ref(DbPath.upsertsLock(rootId))
    .transaction(t => {
      if (t && t.lease !== t0 && t0 - t.lease < MAX_LEASE) return undefined;
      return { lease: t0, lower: (t && t.lower) || `${rootId}-0` };
    });

  let t1 = Date.now();
  const lockTime = t1 - t0;
  const res: AggregateResponse = {
    rootId,
    totalUpdates: 0,
    totalRuntime: 0,
    totalBatches: 0,
    lockTime,
    readParents: 0,
    readHieAggs: 0,
    updateInMem: 0,
    writeDbAggs: 0,
    largeBatchTime: 0,
    lower: snapshot.val().lower
  };
  if (!committed) return res;

  while (t1 - t0 < MAX_LEASE - BATCH_TIME) {
    const nextLower = `${rootId}-${+res.lower.split('-')[1] + 1}`;
    const endLower = `${rootId}-2547403448438`;
    const upserts: { [key: string]: Upsert } =
      (await rtdb
        .ref(DbPath.upsertsData())
        .orderByChild('t')
        .startAt(nextLower)
        .endAt(endLower)
        .limitToFirst(100)
        .once('value')).val() || {};

    const imageIds = Object.keys(upserts);
    if (imageIds.length === 0) break;

    // Read the parentIds of all tps.
    const kelurahanIds = imageIds.map(k => upserts[k].k);
    const parentIds = await getParentIds(kelurahanIds);
    const t2 = Date.now();

    // Read the aggregate values of all intermediate nodes.
    const paths = [];
    for (let i = 0; i < imageIds.length; i++) {
      const path = parentIds[i].slice();
      path.push(upserts[imageIds[i]].n);
      paths.push(path);
    }
    const ha = await getHierarchyAggregates(paths);
    const t3 = Date.now();

    // Update the intermediate nodes (ha) in-memory.
    const updates = {};
    const promises = [];
    for (let i = 0; i < imageIds.length; i++) {
      const imageId = imageIds[i];
      const u = upserts[imageId];
      promises.push(updateAggregates(paths[i], u, ha));
      if (u.d) {
        console.error(`Upsert is already done: ${JSON.stringify(u)}`);
      }
      if (u.t > res.lower) {
        res.lower = u.t;
      }
      updates[`${DbPath.upsertsDataImageDone(imageId)}`] = 1;
    }
    updates[DbPath.upsertsLockLower(rootId)] = res.lower;
    await Promise.all(promises);
    const t4 = Date.now();

    // Atomically writes the in-memory aggregates to database.
    Object.keys(ha).map(pid => {
      const c = ha[pid];
      Object.keys(ha[pid]).map(cid => {
        updates[DbPath.hieAgg(+pid, +cid)] = c[cid];
      });
    });
    await rtdb.ref().update(updates);
    const t5 = Date.now();

    res.totalUpdates += imageIds.length;
    res.totalBatches++;
    res.readParents += t2 - t1;
    res.readHieAggs += t3 - t2;
    res.updateInMem += t4 - t3;
    res.writeDbAggs += t5 - t4;
    res.largeBatchTime += t5 - t1 > BATCH_TIME ? 1 : 0;
    t1 = t5;
  }

  if (t1 - t0 < MAX_LEASE) {
    await rtdb.ref(DbPath.upsertsLockLease(rootId)).set(0);
  }
  res.totalRuntime = Date.now() - t0;
  return res;
}

exports.api = functions.runWith({ memory: '512MB' }).https.onRequest(app);
