const express = require("express");
require("dotenv").config();
const { db, admin } = require("./firebaseConfig/firebase.js");
const {
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
} = require("firebase/auth");
const bcrypt = require("bcrypt");
const midtransClient = require("midtrans-client");

const app = express();
app.use(express.json());
const PORT = process.env.PORT;
const bodyParser = require("body-parser");
app.use(bodyParser.json());
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Token not found" });
    }

    // pastikan format header: "Bearer <token>"
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split("Bearer ")[1]
      : authHeader;

    const decoded = await admin.auth().verifyIdToken(token);

    // simpan data user di req
    req.user = decoded;
    req.uid = decoded.uid; // inilah yang dipakai di backend kamu

    next();
  } catch (err) {
    console.error("verifyToken error:", err.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

app.post("/verifyToken", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token tidak ada" });

  try {
    // Verifikasi JWT Firebase pakai admin SDK
    const decoded = await admin.auth().verifyIdToken(token);

    return res.status(200).json({
      message: "Token valid, selamat datang " + decoded.email,
      uid: decoded.uid,
    });
  } catch (err) {
    console.error("Token tidak valid:", err);
    return res
      .status(401)
      .json({ error: "Token tidak valid atau kedaluwarsa" });
  }
});

app.post("/register2", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email dan password harus diisi." });
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    const hashedPas = await bcrypt.hash(password, 10);

    // Simpan data ke Firestore, dokumennya pakai uid user
    await db.collection("UserData").doc(userRecord.uid).set({
      email,
      password: hashedPas,
      createdAt: new Date(),
    });

    return res.status(200).json({
      message: "Pendaftaran berhasil!",
      uid: userRecord.uid,
    });
  } catch (err) {
    console.error("Gagal membuat user:", err.errorInfo || err);

    const errorCode = err.errorInfo?.code;
    const errorMessage = err.errorInfo?.message;

    if (errorCode === "auth/email-already-exists") {
      return res
        .status(400)
        .json({ error: "Email sudah terdaftar. Silakan gunakan email lain." });
    }

    if (errorCode === "auth/invalid-password") {
      return res
        .status(400)
        .json({ error: "Password harus lebih dari 6 karakter." });
    }

    if (errorCode === "auth/invalid-email") {
      return res.status(400).json({ error: "Format email tidak valid." });
    }

    return res.status(500).json({
      error: errorMessage || "Terjadi kesalahan server yang tidak terduga.",
    });
  }
});

app.post("/biodata", verifyToken, async (req, res) => {
  try {
    const {
      name,
      alamat,
      Nomor_KTP,
      Referal,
      Nomor_Rekening,
      Bank,
      Jenis_Kendaraan,
      Nomor_Plat,
      whatsapp,
      Role,
    } = req.body;

    if (!req.uid) {
      return res.status(401).json({ error: "UID tidak ditemukan dari token" });
    }

    // Siapkan objek data dasar (yang pasti disimpan untuk semua role)
    const baseData = {
      name,
      alamat,
      Referal,
      whatsapp,
      Nomor_Rekening,
      Bank,
      Role,
    };

    // Kalau Role bukan "customer" (misalnya "driver"), tambahkan data kendaraan & bank
    if (Role && Role !== "Customer") {
      Object.assign(baseData, {
        Nomor_KTP,
        Nomor_Rekening,
        Bank,
        Jenis_Kendaraan,
        Nomor_Plat,
      });
    }

    // Simpan atau update data ke Firestore
    await db.collection("UserData").doc(req.uid).set(baseData, { merge: true });

    return res
      .status(200)
      .json({ success: "✅ Data biodata berhasil disimpan" });
  } catch (err) {
    console.error("Error backend biodata:", err);
    return res.status(500).json({
      error: "Terjadi kesalahan di server",
      detail: err.message,
    });
  }
});

app.post("Saldo", verifyToken, async (req, res) => {
  try {
    const { Saldo } = req.body;
  } catch {}
});

// app.get("/userdata", verifyToken, async (req, res) => {
//   try {
//     const docRef = db.collection("UserData").doc(req.uid);
//     const docSnap = await docRef.get();

//     if (!docSnap.exists) {
//       return res.status(404).json({ error: "User data not found" });
//     }

//     return res.json(docSnap.data());
//   } catch (err) {
//     return res.status(500).json({ error: "Failed to fetch user data" });
//   }
// });

let snap = new midtransClient.Snap({
  isProduction: true,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

app.post("/create-transaction", async (req, res) => {
  try {
    const orderId = "order-id-" + Date.now();
    const grossAmount = req.body.amount;

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: req.body.name,
        email: req.body.email,
      },
    };

    const transaction = await snap.createTransaction(parameter);

    // Simpan pending
    await db.collection("Topup").doc(orderId).set({
      userId: req.body.userId,
      name: req.body.name,
      amount: grossAmount,
      bank: "Midtrans",
      status: "pending",
      trxId: orderId,
      createdAt: new Date(),
    });

    res.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/midtrans-callback", async (req, res) => {
  try {
    const notification = req.body;
    const status = await snap.transaction.notification(notification);

    const orderId = status.order_id;
    const transactionStatus = status.transaction_status;
    const grossAmount = status.gross_amount;

    // Simpan settlement
    if (transactionStatus === "settlement") {
      await db.collection("Topup").doc(orderId).set(
        {
          amount: grossAmount,
          status: "sukses",
          trxId: orderId,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }

    return res.status(200).json({ message: "OK" });
  } catch (err) {
    console.error("Callback error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/finish", async (req, res) => {
  res.send("payment berhasil");
});
// app.post('/Callback', async(req,res) => {
//   const notifikasi = req.body
//   if(notifikasi.transaction.status === "settlement") {
//      await db.collection("UserData").doc(req.uid).set(baseData, { merge: true });
//   }
// })

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
