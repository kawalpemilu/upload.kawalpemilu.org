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
const TO_AGG = 4;

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

async function populateParent(parent: { [uid: string]: string }, n) {
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
  let dr = 0;
  for (const cuid of children[uid] || []) {
    dr += rec(cuid, children, delta) + 1;
  }
  return (delta[uid] = dr);
}

async function updateDownstreamReferrals(
  codeReferrals: string[],
  delta: { [uid: string]: number }
) {
  return fsdb.runTransaction(async t => {
    const docRefs: FirebaseFirestore.DocumentReference[] = [];
    for (const uid of Object.keys(delta)) {
      docRefs.push(fsdb.doc(FsPath.relawan(uid)));
    }
    const P = docRefs.map(ref => t.get(ref));
    const relawans = (await Promise.all(P)).map(s => s.data() as Relawan);
    const dr = {};
    for (const rel of relawans) {
      if (delta[rel.profile.uid] === undefined) {
        throw new Error('kabuumm');
      }
      rel.profile.dr = (rel.profile.dr || 0) + delta[rel.profile.uid];
      dr[rel.profile.uid] = rel.profile.dr;
    }

    for (let i = 0; i < relawans.length; i++) {
      const rel = relawans[i];
      for (const code of Object.keys(rel.code || {})) {
        const c = rel.code[code].claimer;
        if (c && dr.hasOwnProperty(c.uid)) {
          c.dr = dr[c.uid];
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
  const codeReferrals = await populateParent(parent, 100);
  const pending = Object.keys(codeReferrals).length;
  if (pending > 0) {
    const children = toChildren(parent);
    const n = Object.keys(parent).length;
    const delta: { [uid: string]: number } = {};
    rec(root, children, delta);
    const m = Object.keys(delta).length;
    if (n + 1 !== m) throw new Error(`${n + 1} != ${m}`);
    await updateDownstreamReferrals(codeReferrals, delta);
  }
  const t1 = Date.now();
  console.log('process batch', t1 - t0, new Date());
  return pending;
}

(async () => {
  while (true) {
    await processCodeReferralAgg();
    await delay(1000 * 60 * 5);
  }
})().catch(console.error);
