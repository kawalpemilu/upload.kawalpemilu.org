import * as admin from 'firebase-admin';
import { FsPath, CodeReferral, Relawan } from 'shared';

admin.initializeApp({
  credential: admin.credential.cert(require('../src/sa-key.json')),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const delay = (ms: number) => new Promise(_ => setTimeout(_, ms));

const fsdb = admin.firestore();
const root = '5F1DwscbfSUFVoEmZACJKXZFHgk2'; // Ainun's uid.
const FROM_AGG = 0;
const TO_AGG = 3;

const cached_parent = {};
async function getParent(uid) {
  if (cached_parent[uid]) {
    return cached_parent[uid];
  }
  const snaps = await fsdb
    .collection(FsPath.codeReferral())
    .where('claimer.uid', '==', uid)
    .get();
  if (snaps.empty) throw new Error(`no parent for ${uid}`);
  let parent = null;
  snaps.forEach(snap => {
    if (parent) throw new Error(`duplicate`);
    parent = snap.data().issuer.uid;
  });
  if (!parent) throw new Error(`null parent`);
  return (cached_parent[uid] = parent);
}

async function populateParent(parent: { [uid: string]: string }, n = 100) {
  const codeReferrals: string[] = [];
  const snaps = await fsdb
    .collection(FsPath.codeReferral())
    .where('agg', '==', FROM_AGG)
    .where('claimedTs', '>', 0)
    .orderBy('claimedTs')
    .limit(n)
    .get();

  snaps.forEach(snap => {
    const c = snap.data() as CodeReferral;
    if (c.claimer) {
      console.log(
        'c',
        snap.id,
        c.issuer.name,
        'refers',
        c.claimer.name,
        c.claimedTs
      );
      parent[c.claimer.uid] = c.issuer.uid;
      codeReferrals.push(snap.id);
    }
  });

  for (const k of Object.keys(parent)) {
    let uid = k;
    while (uid !== root) {
      if (parent[uid]) {
        uid = parent[uid];
      } else {
        uid = parent[uid] = await getParent(uid);
      }
    }
  }

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
  codeReferrals: string[],
  delta: { [uid: string]: number }
) {
  return fsdb.runTransaction(async t => {
    const docRefs: FirebaseFirestore.DocumentReference[] = [];
    for (const uid of Object.keys(delta)) {
      docRefs.push(fsdb.doc(FsPath.relawan(uid)));
    }
    const relPromises = docRefs.map(ref => t.get(ref));
    const snapshots = await Promise.all(relPromises);
    const impact = {};
    for (const snap of snapshots) {
      const rel = snap.data() as Relawan;
      rel.profile.impact = (rel.profile.impact || 0) + delta[rel.profile.uid];
      impact[rel.profile.uid] = rel.profile.impact;
      if (!(rel.profile.impact > 0)) {
        throw new Error('kabuumm');
      }
    }

    for (let i = 0; i < snapshots.length; i++) {
      const rel = snapshots[i].data() as Relawan;
      rel.profile.impact = impact[rel.profile.uid];
      for (const code of Object.keys(rel.code || {})) {
        const c = rel.code[code].claimer;
        if (c && impact.hasOwnProperty(c.uid)) {
          c.impact = impact[c.uid];
        }
      }
      t.update(docRefs[i], rel);
    }

    for (const code of codeReferrals) {
      t.update(fsdb.doc(FsPath.codeReferral(code)), { agg: TO_AGG });
    }
  });
}

async function processCodeReferralAgg() {
  const t0 = Date.now();
  const parent: { [uid: string]: string } = {};
  const codeReferrals = await populateParent(parent, 10);
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
  console.log('process batch', t1 - t0, new Date());
  return pending;
}

(async () => {
  while (true) {
    await processCodeReferralAgg();
    await delay(1000 * 60 * 60);
  }
})().catch(console.error);
