import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as request from 'request-promise';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://kawal-c1.firebaseio.com'
});

const auth = admin.auth();
const rtdb = admin.database();

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

// Creates a serving url for the uploaded images.
export const handlePhotoUpload = functions.storage
  .object()
  .onFinalize(async object => {
    // Exit if this is triggered on a file that is not an image.
    if (!object.contentType.startsWith('image/')) {
      console.warn(`Not an image: ${object.name}`);
      return null;
    }

    const domain = 'kawal-c1.appspot.com';
    const path = encodeURIComponent(`${domain}/${object.name}`);
    const url = await request(`https://${domain}/gsu?path=${path}`);

    // object.name = uploads/{kelurahanId}/{tpsNo}/{userId}/{imageId}
    const paths = object.name.split('/');
    const [, kelurahanId, tpsNo, userId, imageId] = paths;
    await rtdb.ref(`/uploads/${imageId}`).set({
      kelurahanId,
      tpsNo,
      userId,
      url
    });
  });

import * as express from 'express';

const app = express();
app.use(require('cors')({ origin: true }));

/**
 * Validates Firebase ID Tokens passed in the authorization HTTP header.
 * Returns the decoded ID Token content.
 */
function validateToken(
  req: any,
  res: any
): Promise<admin.auth.DecodedIdToken | null> {
  const a = req.headers.authorization;
  if (!a || !a.startsWith('Bearer ')) {
    res.status(403).json({ error: 'Unauthorized' });
    return Promise.resolve(null);
  }
  return auth.verifyIdToken(a.substring(7)).catch(() => {
    res.status(403).json({ error: 'Unauthorized, invalid token' });
    return null;
  });
}

app.post('/api/upload', async (req, res) => {
  const user = await validateToken(req, res);
  if (!user) return null;

  console.log('body', req.body);
  const imageId = req.body.imageId;
  if (!imageId.match(/^[A-Za-z0-9]{20}$/)) {
    return res.json({ error: 'Invalid imageId' });
  }
  // TODO: centralize check.
  const kelurahanId = parseInt(req.body.kelurahanId, 10);
  if (isNaN(kelurahanId) || kelurahanId < 0 || kelurahanId > 100000) {
    return res.json({ error: 'Invalid kelurahanId' });
  }
  const tpsNo = parseInt(req.body.tpsNo, 10);
  if (isNaN(tpsNo) || tpsNo < 0 || tpsNo > 1000) {
    return res.json({ error: 'Invalid tpsNo' });
  }
  const jokowi = parseInt(req.body.jokowi, 10);
  if (isNaN(jokowi) || jokowi < 0 || jokowi > 1000) {
    return res.json({ error: 'Invalid jokowi' });
  }
  const prabowo = parseInt(req.body.prabowo, 10);
  if (isNaN(prabowo) || prabowo < 0 || prabowo > 1000) {
    return res.json({ error: 'Invalid prabowo' });
  }
  const sah = parseInt(req.body.sah, 10);
  if (isNaN(sah) || sah < 0 || sah > 1000) {
    return res.json({ error: 'Invalid sah' });
  }
  const tidakSah = parseInt(req.body.tidakSah, 10);
  if (isNaN(tidakSah) || tidakSah < 0 || tidakSah > 1000) {
    return res.json({ error: 'Invalid tidakSah' });
  }
  const url = (await rtdb.ref(`uploads/${imageId}/url`).once('value')).val();
  if (!url) {
    return res.json({ error: 'Invalid url' });
  }

  await rtdb.ref(`kelurahan/${kelurahanId}/tps/${tpsNo}/${imageId}`).set({
    url,
    jokowi,
    prabowo,
    sah,
    tidakSah
  });

  return res.json({ url });
});

exports.api = functions.https.onRequest(app);
