import * as admin from 'firebase-admin';
import { FsPath, CodeReferral, Relawan } from 'shared';

admin.initializeApp({
  credential: admin.credential.cert(require('../src/sa-key.json')),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const fsdb = admin.firestore();
const root = '5F1DwscbfSUFVoEmZACJKXZFHgk2'; // Ainun's uid.

async function populateParent(parent: { [uid: string]: string }, n = 100) {
  const codeReferrals: { [code: string]: CodeReferral } = {};
  const snaps = await fsdb
    .collection(FsPath.codeReferral())
    .where('agg', '==', 0)
    .orderBy('claimedTs')
    .limit(n)
    .get();
  for (const doc of snaps.docs) {
    const c = doc.data() as CodeReferral;
    if (c.claimer) {
      console.log(
        'c',
        doc.id,
        c.issuer.name,
        'refers',
        c.claimer.name,
        c.claimedTs
      );
      parent[c.claimer.uid] = c.issuer.uid;
      codeReferrals[doc.id] = c;
    }
  }
  console.log('end batch');
  return codeReferrals;
}

function toChildren(parent: { [uid: string]: string }) {
  const children: { [uid: string]: string[] } = {};
  for (const uid of Object.keys(parent)) {
    const puid = parent[uid];
    if (!children[puid]) children[puid] = [];
    children[puid].push(uid);
  }
  return children;
}

function rec(
  uid,
  children: { [uid: string]: string[] },
  delta: { [uid: string]: number }
) {
  let impact = 1;
  for (const cuid of children[uid] || []) {
    impact += rec(cuid, children, delta);
  }
  return (delta[uid] = impact);
}

async function updateImpact(
  codeReferrals: { [code: string]: CodeReferral },
  delta: { [uid: string]: number }
) {
  return fsdb.runTransaction(async t => {
    const docRefs: FirebaseFirestore.DocumentReference[] = [];
    for (const uid of Object.keys(delta)) {
      docRefs.push(fsdb.doc(FsPath.relawan(uid)));
    }
    const relPromises = docRefs.map(ref => t.get(ref));
    const snapshots = await Promise.all(relPromises);
    for (let i = 0; i < snapshots.length; i++) {
      const rel = snapshots[i].data() as Relawan;
      rel.impact = (rel.impact || 0) + delta[rel.profile.uid];
      if (!(rel.impact > 0)) {
        throw new Error('kabuumm');
      }
      t.update(docRefs[i], { impact: rel.impact });
    }

    for (const code of Object.keys(codeReferrals)) {
      t.update(fsdb.doc(FsPath.codeReferral(code)), { agg: 1 });
    }
  });
}

(async () => {
  const t0 = Date.now();

  const parent: { [uid: string]: string } = {};
  const codeReferrals = await populateParent(parent);
  const pending = Object.keys(codeReferrals).length;
  if (pending > 0) {
    const children = toChildren(parent);
    const n = Object.keys(parent).length;
    const delta: { [uid: string]: number } = {};
    rec(root, children, delta);
    const m = Object.keys(delta).length;
    if (n + 1 !== m) throw new Error(`${n + 1} != ${m}`);
    await updateImpact(codeReferrals, delta);
  }

  const t1 = Date.now();
  console.log('all done', t1 - t0);
})().catch(console.error);
