const express = require("express");
const router = express.Router();
const { db } = require("../firebaseConfig/firebase");

// POST /topup/manual
router.post("/manual", async (req, res) => {
  try {
    const { amount, email, uid } = req.body;

    // Validasi standar
    if (!amount || !email || !uid) {
      return res.status(400).json({ error: "Data kurang." });
    }

    if (isNaN(amount)) {
      return res.status(400).json({ error: "Amount harus angka." });
    }

    // Simpan data
    await db.collection("Topup").add({
      amount: Number(amount),
      email,
      uid,
      status: "pending",
      method: "manual",
      createdAt: new Date(),
    });

    return res.json({ success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
