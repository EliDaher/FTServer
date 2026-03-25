const { ref, get } = require("firebase/database");
const { database } = require("../firebaseConfig.js");

const extractUserId = (req) => {
  const raw = req.headers["x-user-id"] || req.headers["x-user"] || req.headers["x-username"];
  return typeof raw === "string" ? raw.trim() : "";
};

const attachRequestUser = async (req, res, next) => {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Missing x-user-id header" });
    }

    const userSnapshot = await get(ref(database, `users/${userId}`));
    if (!userSnapshot.exists()) {
      return res.status(401).json({ message: "Invalid user" });
    }

    req.userId = userId;
    req.user = userSnapshot.val();
    return next();
  } catch (error) {
    console.error("attachRequestUser failed:", error);
    return res.status(500).json({ message: "Failed to resolve user" });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.type === "admin") return next();
  return res.status(403).json({ message: "Admin access required" });
};

const requireSelfOrAdmin = (paramName = "userId") => {
  return (req, res, next) => {
    if (req.user?.type === "admin") return next();

    const requestedUserId = req.params?.[paramName];
    if (!requestedUserId || requestedUserId !== req.userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    return next();
  };
};

module.exports = {
  attachRequestUser,
  requireAdmin,
  requireSelfOrAdmin,
};
