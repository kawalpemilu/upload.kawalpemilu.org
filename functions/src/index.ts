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
    t: `${rootId}-${ts}`,
    d: 0,
    m: extractImageMetadata(b.metadata)
  };
  await rtdb.ref().update({
    [DbPath.tpsPendingImage(kelId, tpsNo, imageId)]: ti,
    [DbPath.upsertsDataImage(imageId)]: upsert
  });

  return res.json({ ok: await processAggregate(rootId) });
});

type HierarchyAggregates = { [key: string]: { [key: string]: Aggregate } };

async function updateAggregates(
  path: number[],
  u: Upsert,
  ha: HierarchyAggregates
) {
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

app.get('/api/processUpserts/:key/:rootId', async (req, res) => {
  if (req.params.key !== 'l32kj09309823ll1kk1lasJKLDK83kjKJHD') {
    return res.json({ error: 'Invalid key' });
  }
  try {
    return res.json({
      ok: await (parseInt(req.params.rootId, 10)
        ? processAggregate(req.params.rootId)
        : Promise.all(DbPath.rootIds.map(rootId => processAggregate(rootId))))
    });
  } catch (e) {
    return res.json({ error: e.message });
  }
});

exports.api = functions.runWith({ memory: '512MB' }).https.onRequest(app);
