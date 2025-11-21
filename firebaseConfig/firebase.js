const admin = require("firebase-admin")
const serviceAccount = require("../google-services (1).json")


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
module.exports = {db, admin}