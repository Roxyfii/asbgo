import admin from "firebase-admin";

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountString) {
  console.error("FIREBASE_SERVICE_ACCOUNT tidak ditemukan di environment!");
}

const serviceAccount = JSON.parse(serviceAccountString);

// perbaiki newline
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
