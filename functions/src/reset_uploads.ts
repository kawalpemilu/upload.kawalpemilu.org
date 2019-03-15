import * as admin from 'firebase-admin';
import { FsPath, Upsert, UploadRequest } from 'shared';

const delay = (ms: number) => new Promise(_ => setTimeout(_, ms));

admin.initializeApp({
  credential: admin.credential.cert(require('../src/sa-key.json')),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const fsdb = admin.firestore();
fsdb.settings({ timestampsInSnapshots: true });

async function resetUploads() {
  const t0 = Date.now();

  const uRef = fsdb.collection(FsPath.upserts());
  let lastDoc = null;
  while (true) {
    const ref = lastDoc ? uRef.startAfter(lastDoc) : uRef;
    const snaps = await ref.limit(3).get();
    if (snaps.empty) {
      break;
    }
    for (const doc of snaps.docs) {
      const u = doc.data() as Upsert;
      console.log('u', doc.id, u.uploader.name);
      lastDoc = doc;
    }
    console.log('end batch');
  }

  /*

  const uploads: { [imageId: string]: Upsert } = {};
  (await fsdb.collection(FsPath.upserts()).get()).forEach(snap => {
    uploads[snap.id] = snap.data() as Upsert;
  });

  const t1 = Date.now();
  console.log('load all upserts', t1 - t0);

  for (const imageId of Object.keys(uploads)) {
    const u = uploads[imageId];
    if (u.request.ts) {
      console.log('ada ', imageId, u.request.ts);
      u.uploader.ts = u.request.ts;
      // @ts-ignore
      u.request.ts = admin.firestore.FieldValue.delete();
      await fsdb.doc(FsPath.upserts(imageId)).update(u);
    }
  }

  const t2 = Date.now();
  console.log('update upserts', t2 - t1);

  const relawans = {};
  (await fsdb.collection(FsPath.relawan()).get()).forEach(snap => {
    relawans[snap.id] = snap.data();
  });

  for (const uid of Object.keys(relawans)) {
    const relawan = relawans[uid];
    if (!relawan.profile.name) {
      console.error('ga ada name', uid);
    }
    if (relawan.imageIds) {
      const snippets: UploadRequest[] = [];
      for (const imageId of relawan.imageIds) {
        const u = uploads[imageId];
        if (!u) {
          console.error('unknown imageid', imageId);
          continue;
        }
        snippets.push(u.request);
      }
      await fsdb.doc(FsPath.relawan(uid)).update({
        lowerCaseName: relawan.profile.name.toLowerCase(),
        uploads: snippets,
        imageIds: admin.firestore.FieldValue.delete()
      });
    }
  }
 console.log('done all');
  */
}

resetUploads().catch(console.error);
