import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as request from "request-promise";

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://kawal-c1.firebaseio.com"
});

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
    if (!object.contentType.startsWith("image/")) {
      console.warn(`Not an image: ${object.name}`);
      return null;
    }

    const i = object.name.lastIndexOf("/");
    if (i <= 0 || "uploads" !== object.name.substring(0, i)) {
      console.error(`Invalid name: ${object.name}`);
      return null;
    }

    const imageId = object.name.substring(i + 1);
    if (!imageId.match(/[A-Za-z0-9]{20}/)) {
      console.error(`Invalid image id length: ${object.name}: ${imageId}`);
      return null;
    }

    const domain = "kawal-c1.appspot.com";
    const path = encodeURIComponent(`${domain}/${object.name}`);
    const url = await request(`https://${domain}/gsu?path=${path}`);
    await admin
      .database()
      .ref(`/uploads/${imageId}`)
      .set(url);
  });
