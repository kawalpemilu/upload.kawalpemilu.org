import * as admin from 'firebase-admin';
import * as express from 'express';
import * as fs from 'fs';

import { H } from './hierarchy';
import { FsPath, Upsert, Aggregate } from 'shared';

admin.initializeApp({
  credential: admin.credential.cert(require('./sa-key.json')),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const fsdb = admin.firestore();
fsdb.settings({ timestampsInSnapshots: true });

// In memory database containing the aggregates of all children.
let h: { [key: string]: { [key: string]: Aggregate } } = {};

function mergeAggregates(target: Aggregate, source: Aggregate) {
  for (let j = 0; j < source.s.length; j++) {
    target.s[j] = (target.s[j] || 0) + source.s[j];
  }
  for (let j = 0; j < source.x.length; j++) {
    target.x[j] = Math.max(target.x[j] || source.x[j], source.x[j]);
  }
}

function updateAggregates(u: Upsert) {
  if (u.d) {
    console.error(`Upsert is already done: ${JSON.stringify(u)}`);
    return;
  }

  const kelurahanId = u.k;
  const path = H[kelurahanId].parentIds.slice();
  path.push(kelurahanId);
  path.push(u.n);

  if (path.length !== 6) {
    console.error(`Path length != 5: ${JSON.stringify(path)}`);
    return;
  }

  for (let i = 0; i + 1 < path.length; i++) {
    const id = path[i];
    if (!h[id]) h[id] = {};

    const c = h[id];
    const cid = path[i + 1];
    if (!c[cid]) c[cid] = { s: [], x: [] };
    mergeAggregates(c[cid], u.a);
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
function doBackup() {
  const ts = Date.now();
  fs.renameSync('upserts.log', `data/upserts_${ts}.log`);
  fs.writeFileSync('h.json', JSON.stringify(h));
  fs.copyFileSync('h.json', `data/h.json`);
  console.log('backed up', ts);
  lastBackupTs = ts;
}

function restoreFromBackup() {
  try {
    h = JSON.parse(fs.readFileSync('h.json', 'utf8'));
  } catch (e) {
    console.log('Unable to load h.json');
    throw e;
  }
}

async function processNewUpserts() {
  const upserts = await getUpsertBatch(5);
  if (!upserts) {
    console.warn('Empty upserts');
    setTimeout(processNewUpserts, 1);
    return;
  }

  console.log('processing ', Object.keys(upserts));
  fs.appendFileSync('upserts.log', JSON.stringify(upserts) + '\n');

  const batch = fsdb.batch();
  for (const imageId of Object.keys(upserts)) {
    updateAggregates(upserts[imageId]);
    batch.update(fsdb.doc(FsPath.upserts(imageId)), { d: 1 });
  }

  if (Date.now() - lastBackupTs > 60 * 60 * 1000) {
    doBackup();
  }

  await batch.commit().catch(console.error);
  setTimeout(processNewUpserts, 1);
}

function continuousAggregation() {
  restoreFromBackup();
  setTimeout(processNewUpserts, 1);

  const app = express();
  app.get('/api/c/:id', async (req, res) => {
    return res.json(h[req.params.id] || {});
  });
  const server = app.listen(8080, () => {
    const port = server.address().port;
    console.log(`App listening on port ${port}`);
  });
}

continuousAggregation();
