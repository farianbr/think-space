import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET;

export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const payload = jwt.verify(token, JWT_SECRET); // throws on invalid/expired
    req.user = { id: payload.sub };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
