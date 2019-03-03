import * as admin from 'firebase-admin';
import * as express from 'express';
import * as fs from 'fs';
import * as util from 'util';

import { H } from './hierarchy';
import { FsPath, Upsert, UpsertData, SUM_KEY } from 'shared';

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
fsdb.settings({ timestampsInSnapshots: true });

// In memory database containing the aggregates of all children.
let h: { [key: string]: { [key: string]: UpsertData } } = {};

function mergeAggregates(target: UpsertData, source: UpsertData) {
  for (const key in SUM_KEY) {
    target.sum[key] = (target.sum[key] || 0) + source.sum[key];
  }
  target.updateTs = Math.max(
    target.updateTs || source.updateTs,
    source.updateTs
  );
}

function getUpsertData(parentId, childId): UpsertData {
  if (!h[parentId]) h[parentId] = {};
  const c = h[parentId];
  if (!c[childId])
    c[childId] = {
      sum: {} as { [key in SUM_KEY]: number },
      updateTs: 0,
      imageId: null,
      url: null
    };
  return c[childId];
}

function getDelta(parentId, childId, u: Upsert): UpsertData {
  const delta: UpsertData = {
    sum: {} as { [key in SUM_KEY]: number },
    updateTs: 0,
    imageId: null,
    url: null
  };
  const current = getUpsertData(parentId, childId);
  for (const key in SUM_KEY) {
    delta.sum[key] =
      (u.delta[key] || 0) * (u.data.sum[key] - (current.sum[key] || 0));
  }
  delta.updateTs = Math.max(
    u.data.updateTs,
    current.updateTs || u.data.updateTs
  );
  return delta;
}

function updateAggregates(u: Upsert) {
  if (u.done) {
    console.error(`Upsert is already done: ${JSON.stringify(u)}`);
    return;
  }

  const kelurahanId = u.kelId;
  const path = H[kelurahanId].parentIds.slice();
  path.push(kelurahanId);
  path.push(u.tpsNo);

  if (path.length !== 6) {
    console.error(`Path length != 5: ${JSON.stringify(path)}`);
    return;
  }

  const delta = getDelta(path[4], path[5], u);
  for (let i = 0; i + 1 < path.length; i++) {
    mergeAggregates(getUpsertData(path[i], path[i + 1]), delta);
  }

  if (u.delta.pending) {
    // The pending flag is set to true, update the TPS serving url.
    const data = getUpsertData(path[4], path[5]);

    // Set the proof URL if no longer pending, else nullify it.
    if (!u.data.sum.pending) {
      data.url = u.data.url;
      data.imageId = u.data.imageId;
    } else {
      data.url = null;
      data.imageId = null;
    }
  }
}

async function getUpsertBatch(limit: number) {
  return new Promise<{ [key: string]: Upsert }>((resolve, reject) => {
    const unsub = fsdb
      .collection(FsPath.upserts())
      .where('d', '==', 0)
      .limit(limit)
      .onSnapshot(
        s => {
          if (!s.empty) {
            unsub();
            const upserts: { [key: string]: Upsert } = {};
            s.forEach(doc => (upserts[doc.id] = doc.data() as Upsert));
            resolve(upserts);
          }
        },
        e => {
          unsub();
          reject(e);
        }
      );
  }).catch(console.error);
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

async function restoreFromBackup() {
  try {
    h = JSON.parse(await readFileAsync('h.json', 'utf8'));
  } catch (e) {
    console.log('Unable to load h.json');
    throw e;
  }
}

async function processNewUpserts() {
  const upserts = await getUpsertBatch(100);
  if (!upserts) {
    console.warn('Empty upserts');
    setTimeout(processNewUpserts, 1);
    return;
  }

  await appendFileAsync('upserts.log', JSON.stringify(upserts) + '\n');

  const t0 = Date.now();
  const batch = fsdb.batch();
  const imageIds = Object.keys(upserts);
  for (const imageId of imageIds) {
    updateAggregates(upserts[imageId]);
    batch.update(fsdb.doc(FsPath.upserts(imageId)), { d: 1 });
  }
  const t1 = Date.now();
  if (t1 - t0 > 100) {
    console.warn('Expensive update aggregates', t1 - t0, imageIds.length);
  }

  if (t1 - lastBackupTs > 60 * 60 * 1000) {
    await doBackup();
  }

  await batch.commit().catch(console.error);
  setTimeout(processNewUpserts, 1);
}

async function continuousAggregation() {
  await restoreFromBackup();
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
    H[cid].aggregate = h[cid] || {};
    return res.json(H[cid]);
  });
  const server = app.listen(8080, () => {
    const port = server.address().port;
    console.log(`App listening on port ${port}`);
  });
}

continuousAggregation().catch(console.error);
