import * as admin from 'firebase-admin';
import * as fs from 'fs';

import { FsPath, HierarchyNode, ChildData, toChildren, toChild } from 'shared';

admin.initializeApp({
  credential: admin.credential.cert(require('../src/sa-key.json')),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const fsdb = admin.firestore();

const str = fs.readFileSync(`src/hierarchy.js`, 'utf8');
const h = JSON.parse(str.substring(12, str.length - 1));

async function copyFromH() {
  const ids = Object.keys(h);
  console.log('ids count', ids.length);

  let batch = fsdb.batch();
  for (let i = 72800 - 1; i < ids.length; i++) {
    if (i && i % 100 === 0) {
      await batch.commit();
      batch = fsdb.batch();
      console.log('copy ', i);
    }
    const id = +ids[i];
    const node = h[id];
    const hh = {
      id: node.id,
      name: node.name.toUpperCase(),
      parentIds: node.parentIds,
      parentNames: node.parentNames.map(name => name.toUpperCase()),
      child: toChild(node),
      depth: node.depth
    } as HierarchyNode;

    batch.set(fsdb.doc(FsPath.hie(id)), hh);
  }
  await batch.commit();
}

// Iterator
export async function fsdbForEach(colRef, batch: number, lambda) {
  let lastDoc = null;
  while (true) {
    const ref = lastDoc ? colRef.startAfter(lastDoc) : colRef;
    const snaps = await ref.limit(batch).get();
    if (snaps.empty) {
      break;
    }
    for (const doc of snaps.docs) {
      lambda(doc.id, doc.data());
      lastDoc = doc;
    }
  }
}

async function verifyWithH() {
  const hRef = fsdb.collection(FsPath.hie());
  let i = 0;
  await fsdbForEach(hRef, 1000, (sid, node: HierarchyNode) => {
    if (i && i % 100 === 0) {
      console.log('verify ', i);
    }
    i++;

    const id = +sid;
    
    const a = JSON.stringify({
      id: node.id,
      name: node.name,
      depth: node.depth,
      parentIds: node.parentIds,
      parentNames: node.parentNames,
      children : toChildren(node),
      data: {}
    });

    h[id].name = h[id].name.toUpperCase();
    h[id].parentNames = h[id].parentNames.map(name => name.toUpperCase());
    h[id].children = h[id].children.map(c => {
      if (typeof c[1] === 'string') c[1] = c[1].toUpperCase();
      return c;
    });

    const b = JSON.stringify(h[id]);
    if (a !== b) {
      console.log(a);
      console.log(b);
      throw new Error('differ');
    }
  });
}

// (async () => copyFromH())().catch(console.error);
(async () => verifyWithH())().catch(console.error);
