import crypto from "node:crypto"
import { bearerToken } from "../lib/http.js"

export function createAuthMiddleware(send) {
  function getAuth(req, db) {
    const token = bearerToken(req)
    if (!token) return null
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    const session = db.sessions.find(
      (candidate) =>
        candidate.tokenHash === tokenHash &&
        new Date(candidate.expiresAt) > new Date(),
    )
    if (!session) return null
    const user = db.users.find((candidate) => candidate.id === session.userId)
    return user?.status === "active" ? { user, session } : null
  }

  function requireAuth(req, res, db, role) {
    const auth = getAuth(req, db)
    if (!auth) {
      send(res, 401, { error: "Authentication required" })
      return null
    }
    if (role && auth.user.role !== role) {
      send(res, 403, { error: "Admin access required" })
      return null
    }
    return auth
  }

  return { getAuth, requireAuth }
}
