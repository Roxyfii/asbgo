const express = require("express");
const router = express.Router();
const { db } = require("../firebaseConfig/firebase");
const { doc, getDoc, setDoc, updateDoc, query, where, getDocs, collection } = require("firebase/firestore");

// ==========================
// UPDATE STATUS ORDER (SERVER)
// ==========================
router.post("/update-status", async (req, res) => {
  try {
    const { orderId, driverId, status, namadriver } = req.body;

    if (!orderId || !driverId || !status) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Ambil data driver
    const driverRef = doc(db, "UserData", driverId);
    const driverSnap = await getDoc(driverRef);

    if (!driverSnap.exists()) {
      return res.status(404).json({ error: "Driver not found" });
    }

    const driverData = driverSnap.data();
    const saldoDriver = Number(driverData.Saldo || 0);

    // ================================
    // FEE
    // ================================
    let driverFee = 0;
    let customerFee = 0;
    let ptFee = 0;

    const isProses = status === "proses";

    if (isProses) {
      driverFee = saldoDriver * 0.01;
      customerFee = saldoDriver * 0.01;
      ptFee = saldoDriver * 0.18;

      const totalPotong = driverFee + customerFee + ptFee;

      if (saldoDriver < totalPotong) {
        return res.json({ error: "Saldo Tidak Cukup" });
      }

      // Potong saldo driver
      await setDoc(
        driverRef,
        { Saldo: saldoDriver - totalPotong },
        { merge: true }
      );
    }

    // ====================================
    // UPDATE ORDER
    // ====================================
    const orderRef = doc(db, "orders", orderId);

    await updateDoc(orderRef, {
      status,
      ...(isProses && {
        driverId,
        namadriver,
      })
    });

    // ====================================
    // FEE MASUK REFERAL DRIVER
    // ====================================
    if (isProses && driverData.Referal) {
      const q = query(
        collection(db, "UserData"),
        where("name", "==", driverData.Referal)
      );

      const datas = await getDocs(q);

      if (!datas.empty) {
        const refDoc = datas.docs[0];
        const refSaldo = Number(refDoc.data().Saldo || 0);

        await setDoc(
          refDoc.ref,
          { Saldo: refSaldo + driverFee },
          { merge: true }
        );
      }
    }

    // ====================================
    // FEE MASUK CUSTOMER
    // ====================================
    const orderSnap = await getDoc(orderRef);
    const orderData = orderSnap.data();

    if (isProses && orderData.customerId) {
      const customerRef = doc(db, "UserData", orderData.customerId);
      const customerSnap = await getDoc(customerRef);

      if (customerSnap.exists()) {
        const csSaldo = Number(customerSnap.data().Saldo || 0);
        await setDoc(
          customerRef,
          { Saldo: csSaldo + customerFee },
          { merge: true }
        );
      }
    }

    // ====================================
    // PT FEE MASUK KE PERUSAHAAN
    // ====================================
    if (isProses) {
      const ptRef = doc(db, "TotalFeePerusahaan", "global");
      const ptSnap = await getDoc(ptRef);
      const totalPT = Number(ptSnap.data()?.totalPTFee || 0);

      await setDoc(
        ptRef,
        { totalPTFee: totalPT + ptFee, lastUpdate: new Date() },
        { merge: true }
      );
    }

    return res.json({ success: true });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
