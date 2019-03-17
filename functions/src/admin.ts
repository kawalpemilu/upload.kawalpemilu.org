import * as admin from 'firebase-admin';
import * as express from 'express';
import * as fs from 'fs';
import * as util from 'util';

import { H } from './hierarchy';
import { FsPath, Upsert, SumMap, Aggregate, TpsAggregate } from 'shared';

admin.initializeApp({
  credential: admin.credential.cert(require('./sa-key.json')),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const writeFileAsync = util.promisify(fs.writeFile);
const existsAsync = util.promisify(fs.exists);
const renameAsync = util.promisify(fs.rename);
const copyFileAsync = util.promisify(fs.copyFile);
const readFileAsync = util.promisify(fs.readFile);
const appendFileAsync = util.promisify(fs.appendFile);

const fsdb = admin.firestore();

// In memory database containing the aggregates of all children.
let h: { [key: string]: { [key: string]: Aggregate } } = {};

function getUpsertData(parentId, childId): Aggregate {
  if (!h[parentId]) h[parentId] = {};
  const c = h[parentId];
  if (!c[childId]) c[childId] = { sum: {} as SumMap, ts: 0, c1: null };
  return c[childId];
}

function getDelta(cur: Aggregate, a: Aggregate): Aggregate {
  const delta: Aggregate = { sum: {} as SumMap, ts: 0, c1: null };
  for (const key in a.sum) {
    delta.sum[key] = a.sum[key] - (cur.sum[key] || 0);
  }
  a.ts = a.ts || 0;
  delta.ts = Math.max(a.ts, cur.ts || a.ts);
  return delta;
}

async function updateAggregates(
  kelId: number,
  tpsNo: number,
  agg: TpsAggregate
) {
  const path = H[kelId].parentIds.slice();
  path.push(kelId);
  path.push(tpsNo);

  if (path.length !== 6) {
    console.error(`Path length != 5: ${JSON.stringify(path)}`);
    return;
  }

  const tpsData = getUpsertData(path[4], path[5]) as TpsAggregate;
  tpsData.photos = tpsData.photos || {};
  for (const url of Object.keys(agg.photos || {})) {
    if (agg.photos[url]) {
      tpsData.photos[url] = agg.photos[url];
    } else {
      delete tpsData.photos[url];
    }
  }

  const delta = getDelta(tpsData, agg);
  for (let i = 0; i + 1 < path.length; i++) {
    const target = getUpsertData(path[i], path[i + 1]);
    for (const key in delta.sum) {
      target.sum[key] = (target.sum[key] || 0) + delta.sum[key];
    }
    target.ts = Math.max(target.ts || delta.ts, delta.ts);
  }
}

type Upserts = { [key: string]: Upsert };
async function getUpsertBatch(limit: number): Promise<Upserts> {
  return new Promise<Upserts>(resolve => {
    const unsub = fsdb
      .collection(FsPath.upserts())
      .where('done', '==', 0)
      .limit(limit)
      .onSnapshot(
        s => {
          if (!s.empty) {
            unsub();
            const upserts: Upserts = {};
            s.forEach(doc => (upserts[doc.id] = doc.data() as Upsert));
            resolve(upserts);
          }
        },
        e => {
          console.error(e);
          unsub();
          resolve({});
        }
      );
  });
}

let lastBackupTs = Date.now();
async function doBackup() {
  const ts = Date.now();
  if (await existsAsync('upserts.log')) {
    await renameAsync('upserts.log', `data/upserts_${ts}.log`);
  } else {
    console.log('No upserts.log found');
  }
  await writeFileAsync('h.json', JSON.stringify(h));
  await copyFileAsync('h.json', `data/h.json`);
  console.log('backed up', ts);
  lastBackupTs = ts;
}

async function processNewUpserts() {
  const upserts = await getUpsertBatch(100);
  const imageIds = Object.keys(upserts);
  if (imageIds.length > 0) {
    await appendFileAsync('upserts.log', JSON.stringify(upserts) + '\n');

    const t0 = Date.now();
    const batch = fsdb.batch();
    for (const imageId of imageIds) {
      const u = upserts[imageId];
      await updateAggregates(u.request.kelId, u.request.tpsNo, u.action);
      batch.update(fsdb.doc(FsPath.upserts(imageId)), { done: 1 });
    }
    const t1 = Date.now();
    if (t1 - t0 > 100) {
      console.warn('Expensive update aggregates', t1 - t0, imageIds.length);
    }
    if (t1 - lastBackupTs > 60 * 60 * 1000) {
      await doBackup();
    }
    await batch.commit();
  }
  setTimeout(processNewUpserts, 1);
}

(async () => {
  h = JSON.parse(await readFileAsync('h.json', 'utf8'));
  setTimeout(processNewUpserts, 1);

  process.on('SIGINT', async function() {
    console.log('Ctrl-C... do backup');
    await doBackup();
    console.log('Exiting...');
    process.exit(2);
  });

  const app = express();
  app.get('/api/c/:id', async (req, res) => {
    const cid = req.params.id;
    if (!H[cid]) return res.json({});
    H[cid].data = h[cid] || {};
    return res.json(H[cid]);
  });
  const server = app.listen(8080, () => {
    const port = server.address().port;
    console.log(`App listening on port ${port}`);
  });
})().catch(console.error);
