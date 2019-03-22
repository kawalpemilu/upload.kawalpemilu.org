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
const TO_AGG = 7;

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

function computeDR(
  rel: Relawan,
  children: { [uid: string]: string[] },
  relByUid: { [uid: string]: Relawan }
) {
  if (!rel) throw new Error(`no uid root`);

  let cnt = 1;
  rel.profile.dr4 = 1;
  for (const cuid of children[rel.profile.uid] || []) {
    const crel = relByUid[cuid];
    cnt += computeDR(crel, children, relByUid);
  }
  for (const code of Object.keys(rel.code || {})) {
    const c = rel.code[code].claimer;
    if (c) {
      if (relByUid.hasOwnProperty(c.uid)) {
        c.dr4 = relByUid[c.uid].profile.dr4;
      }
      if (typeof c.dr4 === 'number') rel.profile.dr4 += c.dr4;
    }
  }
  return cnt;
}

function getUids(uid: string, children: { [uid: string]: string[] }) {
  let uids: string[] = [uid];
  for (const cuid of children[uid] || []) {
    uids = uids.concat(getUids(cuid, children));
  }
  return uids;
}

async function updateDownstreamReferrals(
  codeReferrals: string[],
  parent: { [uid: string]: string }
) {
  const numPersons = Object.keys(parent).length + 1;
  const children = toChildren(parent);
  const uids = getUids(root, children);
  if (numPersons !== uids.length)
    throw new Error(`${numPersons} != ${uids.length}`);

  return fsdb.runTransaction(async t => {
    const docRefs: FirebaseFirestore.DocumentReference[] = [];
    for (const uid of uids) {
      docRefs.push(fsdb.doc(FsPath.relawan(uid)));
    }
    console.log('Transaction', codeReferrals.length, uids.length);
    const P = docRefs.map(ref => t.get(ref));
    const relawans = (await Promise.all(P)).map(s => s.data() as Relawan);
    const relByUid: { [uid: string]: Relawan } = {};
    for (let i = 0; i < relawans.length; i++) {
      const rel = relawans[i];
      if (rel.profile.uid !== uids[i])
        throw new Error(`${rel.profile.uid} !== ${uids[i]}`);
      relByUid[uids[i]] = JSON.parse(JSON.stringify(rel));
    }

    const m = computeDR(relByUid[root], children, relByUid);
    if (m !== numPersons) throw new Error(`compute ${numPersons} !== ${m}`);

    for (let i = 0; i < uids.length; i++) {
      t.update(docRefs[i], relByUid[uids[i]]);
    }

    for (const code of codeReferrals) {
      t.update(fsdb.doc(FsPath.codeReferral(code)), { agg: TO_AGG });
    }
  });
}

async function processCodeReferralAgg(batchSize: number) {
  const t0 = Date.now();
  const parent: { [uid: string]: string } = {};
  const codeReferrals = await populateParent(parent, batchSize);
  if (Object.keys(codeReferrals).length > 0) {
    await updateDownstreamReferrals(codeReferrals, parent);
  }
  const t1 = Date.now();
  console.log('process batch', t1 - t0, new Date());
}

(async () => {
  while (true) {
    await processCodeReferralAgg(100).catch(e =>
      console.error(`process failed: ${e.message}`)
    );
    await delay(1000 * 60 * 5);
  }
})().catch(console.error);
