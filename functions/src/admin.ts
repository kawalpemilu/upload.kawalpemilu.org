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

function getAggregate(parentId, childId) {
  if (!h[parentId]) h[parentId] = {};
  const c = h[parentId];
  if (!c[childId]) c[childId] = { s: [], x: [] };
  return c[childId];
}

function getDelta(parentId, childId, u: Upsert) {
  const delta: Aggregate = { s: [], x: [] };
  const current = getAggregate(parentId, childId);
  for (let j = 0; j < u.a.s.length; j++) {
    delta.s[j] = u.a.s[j] - (current.s[j] || 0);
  }
  for (let j = 0; j < u.a.x.length; j++) {
    delta.x[j] = Math.max(u.a.s[j], current.s[j] || u.a.s[j]);
  }
  return delta;
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

  const delta = getDelta(path[4], path[5], u);
  for (let i = 0; i + 1 < path.length; i++) {
    mergeAggregates(getAggregate(path[i], path[i + 1]), delta);
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
  if (fs.existsSync('upserts.log')) {
    fs.renameSync('upserts.log', `data/upserts_${ts}.log`);
  } else {
    console.log('No upserts.log found');
  }
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

  process.on('SIGINT', function() {
    console.log('Ctrl-C... do backup');
    doBackup();
    process.exit(2);
  });

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
