import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as request from 'request-promise';
import * as express from 'express';
import {
  Aggregate,
  DbPath,
  AggregateResponse,
  ImageMetadata,
  getTpsNumbers,
  Upsert,
  extractImageMetadata,
  TpsImage,
  ApiUploadRequest
} from 'shared';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const auth = admin.auth();
const rtdb = admin.database();
const MAX_LEASE = 60000;

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

    const paths = object.name.split('/');
    // object.name = uploads/{kelurahanId}/{tpsNo}/{userId}/{imageId}
    const [, kelurahanId, tpsNo, userId, imageId] = paths;
    const m = {} as ImageMetadata;
    m.u = userId;
    m.k = parseInt(kelurahanId, 10);
    m.t = parseInt(tpsNo, 10);
    m.v = url;
    await rtdb.ref(DbPath.imageMetadata(imageId)).set(m);
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

  const b = req.body as ApiUploadRequest;
  const imageId = b.imageId;
  if (typeof imageId !== 'string' || !imageId.match(/^[A-Za-z0-9]{20}$/)) {
    return res.json({ error: 'Invalid imageId' });
  }
  const servingUrl = (await rtdb
    .ref(DbPath.imageMetadataServingUrl(imageId))
    .once('value')).val();
  if (!servingUrl) {
    return res.json({ error: 'Invalid url' });
  }

  const kelId = b.kelurahanId;
  if (typeof kelId !== 'number' || kelId <= 0 || kelId > 100000) {
    return res.json({ error: 'kelurahanId out of range' });
  }
  if ((await rtdb.ref(DbPath.hieDepth(kelId)).once('value')).val() !== 4) {
    return res.json({ error: 'Invalid kelurahanId' });
  }

  const tpsNo = b.tpsNo;
  if (typeof tpsNo !== 'number' || tpsNo < 0 || tpsNo > 1000) {
    return res.json({ error: 'tpsNo out of range' });
  }
  const bits = (await rtdb.ref(DbPath.hieChildren(kelId)).once('value')).val();
  if (!bits || getTpsNumbers(bits).indexOf(tpsNo) === -1) {
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

  const rootId = (await rtdb.ref(DbPath.hieRootId(kelId)).once('value')).val();

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
  await rtdb.ref().update({
    [DbPath.tpsPendingImage(kelId, tpsNo, imageId)]: ti,
    [DbPath.upsertsArchiveImage(rootId, imageId)]: upsert,
    [DbPath.upsertsQueueImage(rootId, imageId)]: ts
  });

  // Will update aggregates later in the trigger below.
  const pRef = rtdb.ref(DbPath.upsertsPending(rootId));
  const p = (await pRef.once('value')).val();
  if (!p || ts - p > MAX_LEASE) {
    await pRef.remove();
    await pRef.set(ts);
  }

  return res.json({ ok: true });
});

exports.api = functions.https.onRequest(app);

/**
 * Update Aggregates via database triggers with distributed lock.
 */

type HierarchyAggregates = { [key: string]: { [key: string]: Aggregate } };

async function updateAggregates(
  path: number[],
  u: Upsert,
  ha: HierarchyAggregates
) {
  if (u.d) {
    console.error(`Upsert is already done: ${JSON.stringify(u)}`);
    return;
  }
  u.d = 1;

  const t = (ha[path[4]] && ha[path[4]][path[5]]) || { s: [], x: [] };
  const deltaSum = [];
  for (let i = 0; i < u.a.s.length; i++) {
    deltaSum.push(u.a.s[i] - (t.s[i] || 0));
  }
  const newMax = [];
  for (let i = 0; i < u.a.x.length; i++) {
    newMax[i] = Math.max(u.a.x[i], t.x[i] || u.a.x[i]);
  }

  for (let i = 0; i <= 4; i++) {
    const pid = path[i];
    if (!ha[pid]) ha[pid] = {};

    const c = ha[pid];
    const cid = path[i + 1];
    if (!c[cid]) c[cid] = { s: [], x: [] };
    const p = c[cid];

    for (let j = 0; j < u.a.s.length; j++) {
      p.s[j] = (p.s[j] || 0) + deltaSum[j];
    }
    for (let j = 0; j < u.a.x.length; j++) {
      p.x[j] = Math.max(p.x[j] || newMax[j], newMax[j]);
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
          parentIds.unshift(0);
          parentIds.push(kelurahanId);
          return parentIds;
        })
    )
  );
}

async function getHierarchyAggregates(paths: number[][]) {
  const ha: HierarchyAggregates = {};
  const promises = [];
  paths.forEach(path => {
    if (path.length !== 6) throw new Error(`Invalid path: ${path}`);
    for (let i = 0; i <= 4; i++) {
      const pid = path[i];
      if (!ha[pid]) ha[pid] = {};

      const cid = path[i + 1];
      const c = ha[pid];
      if (!c[cid]) {
        c[cid] = {} as Aggregate;
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

async function getUpserts(rootId: number, imageIds: string[]) {
  return Promise.all(
    imageIds.map(imageId =>
      rtdb
        .ref(DbPath.upsertsArchiveImage(rootId, imageId))
        .once('value')
        .then(s => s.val() as Upsert)
    )
  );
}

async function processAggregate(rootId: number): Promise<AggregateResponse> {
  if (DbPath.rootIds.indexOf(rootId) === -1)
    throw new Error(`Invalid rootId: ${rootId}`);

  let batchTime = 5000;
  const t0 = Date.now();
  const { committed, snapshot } = await rtdb
    .ref(DbPath.upsertsLease(rootId))
    .transaction(t => (!t || t === t0 || t0 - t > MAX_LEASE ? t0 : undefined));

  let t1 = Date.now();
  const lockTime = t1 - t0;
  const res: AggregateResponse = {
    rootId,
    totalUpdates: 0,
    totalRuntime: 0,
    totalBatches: 0,
    lockTime,
    readPayload: 0,
    readParents: 0,
    readHieAggs: 0,
    updateInMem: 0,
    writeDbAggs: 0,
    largeBatchTime: 0,
    lease: snapshot.val()
  };
  if (!committed) return res;

  while (t1 - t0 < MAX_LEASE - batchTime) {
    const upsertKeys: { [key: string]: number } =
      (await rtdb
        .ref(DbPath.upsertsQueue(rootId))
        .limitToFirst(100)
        .once('value')).val() || {};

    const imageIds = Object.keys(upsertKeys);
    if (imageIds.length === 0) break;

    const upserts = await getUpserts(rootId, imageIds);
    const t2 = Date.now();

    // Read the parentIds of all tps.
    const kelurahanIds = upserts.map(u => u.k);
    const parentIds = await getParentIds(kelurahanIds);
    const t3 = Date.now();

    // Read the aggregate values of all intermediate nodes.
    const paths = [];
    for (let i = 0; i < imageIds.length; i++) {
      const path = parentIds[i].slice();
      path.push(upserts[i].n);
      paths.push(path);
    }
    const ha = await getHierarchyAggregates(paths);
    const t4 = Date.now();

    // Update the intermediate nodes (ha) in-memory.
    const updates = {};
    const promises = [];
    for (let i = 0; i < imageIds.length; i++) {
      const imageId = imageIds[i];
      promises.push(updateAggregates(paths[i], upserts[i], ha));
      updates[DbPath.upsertsQueueImage(rootId, imageId)] = null;
      updates[DbPath.upsertsArchiveImageDone(rootId, imageId)] = 1;
    }
    updates[DbPath.upsertsQueueCount(rootId)] = imageIds.length;

    await Promise.all(promises);
    const t5 = Date.now();

    // Atomically writes the in-memory aggregates to database.
    Object.keys(ha).map(pid => {
      const c = ha[pid];
      Object.keys(ha[pid]).map(cid => {
        updates[DbPath.hieAgg(+pid, +cid)] = c[cid];
      });
    });
    await rtdb.ref().update(updates);
    const t6 = Date.now();

    res.totalUpdates += imageIds.length;
    res.totalBatches++;
    res.readPayload += t2 - t1;
    res.readParents += t3 - t2;
    res.readHieAggs += t4 - t3;
    res.updateInMem += t5 - t4;
    res.writeDbAggs += t6 - t5;
    batchTime = Math.max(batchTime, t6 - t1);
    t1 = t6;
  }

  if (t1 - t0 < MAX_LEASE - 1000) {
    await rtdb.ref(DbPath.upsertsLease(rootId)).remove();
  }
  res.totalRuntime = Date.now() - t0;
  return res;
}

exports.upsertProcessor = functions.database
  .ref('u/{rootId}/p')
  .onCreate(async (snapshot, context) => {
    const rootId = parseInt(context.params.rootId, 10);
    const res = await processAggregate(rootId);
    await snapshot.ref.remove();
    if (res.totalUpdates === 0) {
      return;
    }
    const qps = Math.ceil((res.totalUpdates / res.totalRuntime) * 1e3);
    console.log(`qps=${qps},res=${JSON.stringify(res, null, 2)}`);
    await snapshot.ref.set(Date.now());
  });
