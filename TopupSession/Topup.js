const express = require("express");
const router = express.Router();
const verifyToken = require("../Verifytoken/VerifyToken");
const { db } = require("../firebaseConfig/firebase"); // Pastikan ini admin.firestore()

router.post("/", verifyToken, async (req, res) => {
  try {
    const { amount, email, uid } = req.body;

    if (!amount || !email || !uid) {
      return res.status(400).json({ error: "Data kurang." });
    }

    // Contoh push data
    await db
      .collection("Topup")
      .add({
        amount,
        email,
        uid,
        createdAt: new Date(),
      });

    return res.json({ success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
