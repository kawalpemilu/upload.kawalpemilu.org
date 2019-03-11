import * as admin from 'firebase-admin';
import { FsPath, Upsert, UploadSnippet } from 'shared';

const delay = (ms: number) => new Promise(_ => setTimeout(_, ms));

admin.initializeApp({
  credential: admin.credential.cert(require('../src/sa-key.json')),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const fsdb = admin.firestore();
fsdb.settings({ timestampsInSnapshots: true });

async function resetUploads() {
  const t0 = Date.now();

  const uploads = {};
  (await fsdb.collection(FsPath.upserts()).get()).forEach(snap => {
    uploads[snap.id] = snap.data();
  });

  const t1 = Date.now();
  console.log('load all upserts', t1 - t0);

  for (const imageId of Object.keys(uploads)) {
    const u = uploads[imageId];
    if (u.uploadTs) {
      console.log('ada ', imageId, u.uploadTs);
      (u as Upsert).uploader.ts = u.uploadTs;
      u.uploadTs = admin.firestore.FieldValue.delete();
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
      const snippets = [];
      for (const imageId of relawan.imageIds) {
        const u = uploads[imageId];
        if (!u) {
          console.error('unknown imageid', imageId);
          continue;
        }

        const s: UploadSnippet = {
          kelId: u.kelId,
          tpsNo: u.tpsNo,
          data: u.data,
          meta: u.meta
        };
        snippets.push(s);
      }
      await fsdb.doc(FsPath.relawan(uid)).update({
        lowerCaseName: relawan.profile.name.toLowerCase(),
        uploads: snippets,
        imageIds: admin.firestore.FieldValue.delete()
      });
    }
  }

  console.log('done all');
}

resetUploads().catch(console.error);
