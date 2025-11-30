// verifyToken.js
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Token not found" });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split("Bearer ")[1]
      : authHeader;

    const decoded = await admin.auth().verifyIdToken(token);

    req.user = decoded;
    req.uid = decoded.uid;

    next();
  } catch (err) {
    console.error("verifyToken error:", err.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

module.exports = verifyToken;
