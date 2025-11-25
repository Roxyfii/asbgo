const express = require("express");
const router = express.Router();
const { db } = require("../firebaseConfig/firebase");
const { doc, getDoc, setDoc, updateDoc, query, where, getDocs, collection } = require("firebase/firestore");

// ==========================
// UPDATE STATUS ORDER (SERVER)
// ==========================
router.post("/updateStatus", async (req, res) => {
  try {
    const { orderId, status, userId } = req.body;
    if (!orderId || !status || !userId || namadriver) {
      return res.status(400).json({ error: "Data kurang." });
    }

    const db = admin.firestore();

    // Ambil data user
    const userRef = db.collection("UserData").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: "User tidak ditemukan." });
    }

    // Ambil order
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return res.status(404).json({ error: "Order tidak ditemukan." });
    }

    const order = orderSnap.data();

    // Ambil referral
    const q = await db
      .collection("UserData")
      .where("name", "==", userSnap.data().Referal)
      .get();

    // Ambil customer
    const customer = await db
      .collection("UserData")
      .where("email", "==", order.customer)
      .get();

    const payload = { status };

    if (status === "proses") {
      payload.driverId = userId;
      payload.namadriver = userSnap.data().name;
    }

    if (status === "pending") {
      payload.driverId = "";
      payload.namadriver = "";
    }

    await orderRef.set(payload, { merge: true });

    // -------------------------
    // UPDATE SALDO
    // -------------------------
    if (status === "selesai") {
      const harga = order.price;
      const potongan = harga * 0.2;

      await userRef.set(
        { Saldo: admin.firestore.FieldValue.increment(harga - potongan) },
        { merge: true }
      );

      // Fee PT
      const ptRef = db.collection("PT").doc("feePT");
      await ptRef.set(
        {
          totalFee: admin.firestore.FieldValue.increment(harga * 0.18),
          updatedAt: Date.now()
        },
        { merge: true }
      );

      // Fee referral
      if (!q.empty) {
        await q.docs[0].ref.set(
          { Saldo: admin.firestore.FieldValue.increment(harga * 0.01) },
          { merge: true }
        );
      }

      // Fee customer 1%
      if (!customer.empty) {
        await customer.docs[0].ref.set(
          { Saldo: admin.firestore.FieldValue.increment(harga * 0.01) },
          { merge: true }
        );
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;
