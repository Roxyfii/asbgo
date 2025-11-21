import admin from "firebase-admin";

// ambil json dari env
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountString) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT tidak ditemukan di environment!");
}

let serviceAccount;

try {
  serviceAccount = JSON.parse(serviceAccountString);
} catch (err) {
  console.error("❌ JSON FIREBASE_SERVICE_ACCOUNT tidak valid:", err);
}

// perbaiki newline pada private key
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
