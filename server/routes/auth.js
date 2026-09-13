import crypto from "node:crypto"
import { bearerToken, parseJson } from "../lib/http.js"
import { createId as id, now } from "../lib/ids.js"
import { checkRateLimit, getClientIp } from "../lib/rateLimit.js"
import {
  hashPassword,
  isEmail,
  normalizeIndianMobile,
  sanitizeUser,
  verifyPassword,
} from "../lib/security.js"

const AUTH_PREFIX = "/api/auth/"
const RATE_LIMIT_WINDOW = 15 * 60_000

export async function handleAuthRoutes(context) {
  const {
    req,
    res,
    pathName,
    db,
    send,
    saveDb,
    loadDb,
    requireAuth,
    audit,
    ensureWallet,
    promotePendingSignup,
    supabaseRequest,
    supabaseAdminCreateUser,
    supabaseAdminGetUser,
    supabaseAdminFindUserByEmail,
    supabasePasswordLogin,
    config,
  } = context

  if (!pathName.startsWith(AUTH_PREFIX)) return false

  const respond = (status, payload, headers) => {
    send(res, status, payload, headers)
    return true
  }

  if (pathName === "/api/auth/signup" && req.method === "POST") {
    const limit = checkRateLimit(
      `signup:${getClientIp(req)}`,
      5,
      RATE_LIMIT_WINDOW,
    )
    if (limit.limited) {
      return respond(429, {
        error: `Too many registration attempts. Please try again in ${limit.retryAfter} seconds.`,
      })
    }

    const input = await parseJson(req)
    const name = String(input.name || "").trim()
    const email = String(input.email || "")
      .trim()
      .toLowerCase()
    const mobile = normalizeIndianMobile(input.mobile)
    const password = String(input.password || "")
    const businessName = String(input.businessName || "").trim()
    if (!name || !businessName || !email || !mobile || password.length < 8) {
      return respond(400, {
        error:
          "Full name, business name, email, Indian mobile number and an 8+ character password are required",
      })
    }
    if (!isEmail(email)) {
      return respond(400, { error: "Enter a valid Gmail/email address" })
    }

    const localUser = db.users.find(
      (user) =>
        String(user.email || "")
          .trim()
          .toLowerCase() === email,
    )
    if (localUser) {
      let authExisting
      try {
        authExisting = await supabaseAdminFindUserByEmail(email)
      } catch {
        return respond(503, {
          error: "Unable to check Supabase Auth. Please try again.",
        })
      }
      if (authExisting) {
        return respond(409, {
          error:
            "This email is already registered. Use Sign in or Forgot password.",
        })
      }
      db.users = db.users.filter((user) => user.id !== localUser.id)
      db.sessions = db.sessions.filter(
        (session) => session.userId !== localUser.id,
      )
      await saveDb(db)
    }

    if (
      db.users.some((user) => normalizeIndianMobile(user.mobile) === mobile)
    ) {
      return respond(409, {
        error:
          "This mobile number is already registered. Use a different number.",
      })
    }

    const pending = db.pendingSignups.find(
      (signup) =>
        signup.email === email ||
        normalizeIndianMobile(signup.mobile) === mobile,
    )
    if (pending) {
      let authPending
      try {
        authPending = await supabaseAdminFindUserByEmail(email)
      } catch {
        return respond(503, {
          error: "Unable to check Supabase Auth. Please try again.",
        })
      }
      if (authPending) {
        return respond(409, {
          error:
            "A signup is already pending for this email. Check your inbox for the confirmation link.",
        })
      }
      db.pendingSignups = db.pendingSignups.filter(
        (signup) => signup.id !== pending.id,
      )
      await saveDb(db)
    }

    try {
      const supabaseUser = await supabaseAdminCreateUser({
        email,
        password,
        name,
        businessName,
        mobile,
      })
      if (!supabaseUser?.id) {
        throw new Error(
          "Supabase did not return a user id after account creation",
        )
      }

      db.pendingSignups.push({
        id: id("PSU"),
        supabaseUserId: supabaseUser.id,
        name,
        businessName,
        email,
        mobile,
        passwordHash: hashPassword(password),
        createdAt: now(),
        emailVerified: false,
      })
      await saveDb(db)
      return respond(201, {
        pending: true,
        supabaseUserId: supabaseUser.id,
        email,
        message:
          "Account created. Check your email for the Supabase confirmation link, then return here to sign in.",
      })
    } catch (error) {
      const message = String(error?.message || error)
      if (
        /already registered|already exists|user already exists|email.*taken/i.test(
          message,
        )
      ) {
        try {
          const existing = await supabaseAdminFindUserByEmail(email)
          if (existing?.id && !existing.email_confirmed_at) {
            db.pendingSignups.push({
              id: id("PSU"),
              supabaseUserId: existing.id,
              name,
              businessName,
              email,
              mobile,
              passwordHash: hashPassword(password),
              createdAt: now(),
              emailVerified: false,
            })
            await saveDb(db)
            try {
              await supabaseRequest("/auth/v1/resend", "POST", {
                type: "signup",
                email,
              })
            } catch (resendError) {
              console.error(
                "Supabase confirmation resend:",
                String(resendError?.message || resendError),
              )
            }
            return respond(201, {
              pending: true,
              supabaseUserId: existing.id,
              email,
              message:
                "Your signup was restored. Check your email for a new confirmation link.",
            })
          }
        } catch (lookupError) {
          console.error(
            "Supabase existing-user recovery:",
            String(lookupError?.message || lookupError),
          )
        }
        return respond(409, {
          error:
            "This email is already registered. Use Sign in or Forgot password.",
        })
      }
      return respond(400, { error: message })
    }
  }

  if (pathName === "/api/auth/signup/verify-email" && req.method === "POST") {
    const limit = checkRateLimit(
      `verify:${getClientIp(req)}`,
      10,
      RATE_LIMIT_WINDOW,
    )
    if (limit.limited) {
      return respond(429, {
        error: `Too many verification attempts. Please try again in ${limit.retryAfter} seconds.`,
      })
    }
    const input = await parseJson(req)
    const email = String(input.email || "")
      .trim()
      .toLowerCase()
    const code = String(input.code || input.otp || "").trim()
    if (!email || !/^\d{6}$/.test(code)) {
      return respond(400, {
        error: "Enter the 6-digit email verification code",
      })
    }
    const pending = db.pendingSignups.find((signup) => signup.email === email)
    if (!pending) {
      return respond(404, {
        error: "No pending signup found for this email",
      })
    }
    let authData
    try {
      authData = await supabaseRequest("/auth/v1/verify", "POST", {
        type: "email",
        email,
        token: code,
      })
    } catch (error) {
      return respond(400, { error: String(error?.message || error) })
    }
    const authUser =
      authData?.user ||
      (pending.supabaseUserId
        ? await supabaseAdminGetUser(pending.supabaseUserId)
        : null)
    const user = await promotePendingSignup(db, pending, authUser)
    if (!user) {
      return respond(400, {
        error:
          "Supabase email verification succeeded, but the account could not be linked locally. Contact admin.",
      })
    }
    await saveDb(db)
    return respond(201, {
      user: sanitizeUser(user),
      message:
        "Email verified successfully. Your Supabase account is ready. You can now sign in.",
    })
  }

  if (pathName === "/api/auth/signup/resend-email" && req.method === "POST") {
    const limit = checkRateLimit(
      `resend:${getClientIp(req)}`,
      3,
      RATE_LIMIT_WINDOW,
    )
    if (limit.limited) {
      return respond(429, {
        error: `Too many resend requests. Please wait ${limit.retryAfter} seconds before trying again.`,
      })
    }
    const input = await parseJson(req)
    const email = String(input.email || "")
      .trim()
      .toLowerCase()
    if (!isEmail(email)) {
      return respond(400, { error: "Enter a valid email address" })
    }
    const pending = db.pendingSignups.find((signup) => signup.email === email)
    if (!pending) {
      return respond(404, {
        error: "No pending signup found for this email",
      })
    }
    try {
      await supabaseRequest("/auth/v1/resend", "POST", {
        type: "signup",
        email,
      })
      return respond(200, {
        ok: true,
        message:
          "A new confirmation link was sent to your email. Check Gmail and spam.",
      })
    } catch (error) {
      return respond(400, { error: String(error?.message || error) })
    }
  }

  if (pathName === "/api/auth/signup/confirm-link" && req.method === "POST") {
    const input = await parseJson(req)
    const accessToken = String(input.accessToken || "").trim()
    if (!accessToken || accessToken.length < 20) {
      return respond(400, {
        error:
          "The confirmation link is missing or expired. Request a new link.",
      })
    }
    let authData
    try {
      const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
        headers: {
          apikey: config.supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
        },
      })
      authData = await response.json().catch(() => ({}))
      if (!response.ok || !authData?.id) {
        throw new Error("The confirmation link is invalid or expired")
      }
    } catch (error) {
      return respond(400, { error: String(error?.message || error) })
    }
    const authUser = await supabaseAdminGetUser(authData.id)
    const pending = db.pendingSignups.find(
      (signup) =>
        signup.supabaseUserId === authData.id ||
        signup.email ===
          String(authUser?.email || authData.email || "").toLowerCase(),
    )
    const user = await promotePendingSignup(db, pending, authUser)
    if (!user) {
      return respond(400, {
        error:
          "Email confirmed, but the pending signup could not be linked. Contact admin.",
      })
    }
    await saveDb(db)
    return respond(200, {
      user: sanitizeUser(user),
      message: "Email verified successfully. You can now sign in.",
    })
  }

  if (pathName === "/api/auth/magic-link" && req.method === "POST") {
    const input = await parseJson(req)
    const email = String(input.email || "")
      .trim()
      .toLowerCase()
    if (!isEmail(email)) {
      return respond(400, { error: "Enter a valid email address" })
    }
    const user = db.users.find(
      (candidate) =>
        String(candidate.email || "").toLowerCase() === email &&
        candidate.role === "retailer",
    )
    if (!user) {
      return respond(404, {
        error: "No verified account was found for this email",
      })
    }
    if (!user.emailVerifiedAt) {
      return respond(403, {
        error: "Verify your email from the signup confirmation link first",
      })
    }
    try {
      const authExisting = await supabaseAdminFindUserByEmail(email)
      if (!authExisting) {
        db.users = db.users.filter((candidate) => candidate.id !== user.id)
        db.sessions = db.sessions.filter(
          (session) => session.userId !== user.id,
        )
        await saveDb(db)
        return respond(404, {
          error: "Your Auth account no longer exists. Please register again.",
        })
      }
      await supabaseRequest("/auth/v1/magiclink", "POST", {
        email,
        redirect_to: `${config.publicAppUrl}/login`,
      })
      return respond(200, {
        ok: true,
        message: "A magic sign-in link was sent to your email.",
      })
    } catch (error) {
      return respond(400, { error: String(error?.message || error) })
    }
  }

  if (pathName === "/api/auth/magic-link/consume" && req.method === "POST") {
    const input = await parseJson(req)
    const accessToken = String(input.accessToken || "").trim()
    if (!accessToken || accessToken.length < 20) {
      return respond(400, {
        error: "The magic link is missing or expired. Request a new link.",
      })
    }
    let authData
    try {
      const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
        headers: {
          apikey: config.supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
        },
      })
      authData = await response.json().catch(() => ({}))
      if (!response.ok || !authData?.id) {
        throw new Error("The magic link is invalid or expired")
      }
    } catch (error) {
      return respond(400, { error: String(error?.message || error) })
    }
    const authUser = await supabaseAdminGetUser(authData.id)
    const user = db.users.find(
      (candidate) =>
        candidate.supabaseUserId === authData.id ||
        String(candidate.email || "").toLowerCase() ===
          String(authUser?.email || authData.email || "").toLowerCase(),
    )
    if (!user) {
      return respond(404, {
        error: "This magic link is not linked to an application account",
      })
    }
    if (
      user.role !== "retailer" ||
      !user.emailVerifiedAt ||
      !authUser?.email_confirmed_at
    ) {
      return respond(403, {
        error: "Verify your signup email before using a magic link",
      })
    }
    if (user.status !== "active") {
      return respond(403, { error: `Account is ${user.status}` })
    }
    const token = crypto.randomBytes(32).toString("hex")
    db.sessions = db.sessions.filter(
      (session) => new Date(session.expiresAt) > new Date(),
    )
    db.sessions.push({
      id: id("SES"),
      userId: user.id,
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      createdAt: now(),
      expiresAt: new Date(
        Date.now() + config.sessionDays * 86_400_000,
      ).toISOString(),
    })
    audit(db, user, "LOGIN_MAGIC_LINK", "user", user.id)
    await saveDb(db)
    return respond(200, {
      token,
      user: sanitizeUser(user),
      authProvider: "supabase-magic-link",
    })
  }

  if (pathName === "/api/auth/demo-login" && req.method === "POST") {
    if (String(process.env.DEMO_MODE || "false").toLowerCase() !== "true") {
      return respond(403, {
        error:
          "Demo sign-in is disabled. Please use registered retailer credentials or set DEMO_MODE=true in .env for local testing.",
      })
    }
    let user = db.users.find(
      (candidate) =>
        candidate.email === "demo@ldservicezone.in" &&
        candidate.role === "retailer",
    )
    if (!user) {
      user = {
        id: id("USR"),
        supabaseUserId: "",
        name: "Demo Retailer",
        businessName: "LD SERVICE ZONE Demo",
        email: "demo@ldservicezone.in",
        mobile: "6370892501",
        role: "retailer",
        status: "active",
        kycStatus: "verified",
        emailVerifiedAt: now(),
        passwordHash: hashPassword(crypto.randomBytes(24).toString("hex")),
        createdAt: now(),
      }
      db.users.push(user)
      ensureWallet(user.id)
    }
    const token = crypto.randomBytes(32).toString("hex")
    db.sessions = db.sessions.filter(
      (session) => new Date(session.expiresAt) > new Date(),
    )
    db.sessions.push({
      id: id("SES"),
      userId: user.id,
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      createdAt: now(),
      expiresAt: new Date(
        Date.now() + config.sessionDays * 86_400_000,
      ).toISOString(),
    })
    audit(db, user, "DEMO_LOGIN", "user", user.id)
    await saveDb(db)
    return respond(200, {
      token,
      user: sanitizeUser(user),
      authProvider: "demo",
    })
  }

  if (pathName === "/api/auth/login" && req.method === "POST") {
    const limit = checkRateLimit(
      `login:${getClientIp(req)}`,
      10,
      RATE_LIMIT_WINDOW,
    )
    if (limit.limited) {
      return respond(429, {
        error: `Too many login attempts. Please try again in ${limit.retryAfter} seconds.`,
      })
    }
    const input = await parseJson(req)
    const credential = String(
      input.email || input.credential || input.mobile || "",
    ).trim()
    const password = String(input.password || "")
    if (!credential || !password) {
      return respond(400, {
        error: "Email/mobile number and password are required",
      })
    }
    const credentialEmail = isEmail(credential) ? credential.toLowerCase() : ""
    const credentialMobile = credentialEmail
      ? ""
      : normalizeIndianMobile(credential)
    if (!credentialEmail && !credentialMobile) {
      return respond(400, {
        error: "Enter a valid email or 10-digit Indian mobile number",
      })
    }
    let user = db.users.find((candidate) =>
      credentialEmail
        ? String(candidate.email || "")
            .trim()
            .toLowerCase() === credentialEmail
        : normalizeIndianMobile(candidate.mobile) === credentialMobile,
    )

    const pending = !user
      ? db.pendingSignups.find((signup) =>
          credentialEmail
            ? String(signup.email || "").toLowerCase() === credentialEmail
            : normalizeIndianMobile(signup.mobile) === credentialMobile,
        )
      : null
    if (
      !user &&
      pending?.supabaseUserId &&
      config.supabaseUrl &&
      config.supabaseServiceRoleKey
    ) {
      try {
        const confirmedUser = await supabaseAdminGetUser(pending.supabaseUserId)
        if (confirmedUser?.email_confirmed_at) {
          user = await promotePendingSignup(db, pending, confirmedUser)
          if (user) await saveDb(db)
        }
      } catch (error) {
        console.warn(
          "Could not sync confirmed Supabase signup:",
          String(error?.message || error),
        )
      }
    }

    let authenticatedWithSupabase = false
    if (user?.role === "retailer" && user.supabaseUserId) {
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        return respond(503, {
          error: "Authentication service is not configured",
        })
      }
      try {
        const authData = await supabasePasswordLogin(user.email, password)
        if (authData?.user?.id !== user.supabaseUserId) {
          return respond(401, { error: "Invalid email or password" })
        }
        if (!authData.user.email_confirmed_at) {
          return respond(403, {
            error: "Please verify your email before signing in",
          })
        }
        authenticatedWithSupabase = true
      } catch {
        return respond(401, {
          error: "Unable to sign in. Check your credentials and try again.",
        })
      }
    }

    if (
      !authenticatedWithSupabase &&
      (!user ||
        !user.passwordHash ||
        !verifyPassword(password, user.passwordHash))
    ) {
      return respond(401, { error: "Invalid email or password" })
    }
    if (!user) return respond(401, { error: "Invalid email or password" })
    if (user.role === "retailer" && !user.emailVerifiedAt) {
      return respond(403, {
        error:
          "Please verify your email from the confirmation link sent to your inbox before signing in",
      })
    }
    if (user.role === "retailer" && authenticatedWithSupabase) {
      try {
        const authCheck = await supabaseRequest(
          `/auth/v1/admin/users/${user.supabaseUserId}`,
          "GET",
          undefined,
          { admin: true },
        )
        if (!authCheck?.email_confirmed_at) {
          return respond(403, {
            error:
              "Please verify your email from the confirmation link sent to your Gmail before signing in",
          })
        }
      } catch (error) {
        console.warn(
          "Could not verify Supabase email status:",
          String(error?.message || error),
        )
      }
    }
    if (user.status !== "active") {
      return respond(403, { error: `Account is ${user.status}` })
    }

    const token = crypto.randomBytes(32).toString("hex")
    db.sessions = db.sessions.filter(
      (session) => new Date(session.expiresAt) > new Date(),
    )
    db.sessions.push({
      id: id("SES"),
      userId: user.id,
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      createdAt: now(),
      expiresAt: new Date(
        Date.now() + config.sessionDays * 86_400_000,
      ).toISOString(),
    })
    audit(
      db,
      user,
      authenticatedWithSupabase ? "LOGIN_SUPABASE" : "LOGIN_LEGACY",
      "user",
      user.id,
    )
    await saveDb(db)
    return respond(200, {
      token,
      user: sanitizeUser(user),
      authProvider: authenticatedWithSupabase ? "supabase" : "legacy",
    })
  }

  if (pathName === "/api/auth/forgot-password" && req.method === "POST") {
    const limit = checkRateLimit(
      `recover:${getClientIp(req)}`,
      3,
      RATE_LIMIT_WINDOW,
    )
    if (limit.limited) {
      return respond(429, {
        error: "Too many reset requests. Please try again later.",
      })
    }
    const input = await parseJson(req)
    const email = String(input.email || "")
      .trim()
      .toLowerCase()
    if (!isEmail(email)) {
      return respond(400, { error: "Enter a valid email address" })
    }
    try {
      await supabaseRequest("/auth/v1/recover", "POST", {
        email,
        redirect_to: `${config.publicAppUrl}/reset-password`,
      })
    } catch (error) {
      console.error(
        "Password recovery request:",
        String(error?.message || error),
      )
    }
    return respond(200, {
      ok: true,
      message:
        "If an account exists for this email, a password reset link has been sent.",
    })
  }

  if (pathName === "/api/auth/reset-password" && req.method === "POST") {
    const limit = checkRateLimit(
      `reset:${getClientIp(req)}`,
      10,
      RATE_LIMIT_WINDOW,
    )
    if (limit.limited) {
      return respond(429, {
        error: "Too many reset attempts. Please try again later.",
      })
    }
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      return respond(503, { error: "Password recovery is not configured" })
    }
    const input = await parseJson(req)
    const accessToken = String(input.accessToken || "")
    const password = String(input.password || "")
    if (!accessToken || password.length < 8) {
      return respond(400, {
        error:
          "A valid reset session and an 8+ character password are required",
      })
    }
    const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
      method: "PUT",
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return respond(400, {
        error:
          data?.msg ||
          data?.message ||
          data?.error_description ||
          "Unable to reset password",
      })
    }
    const resetUser = db.users.find(
      (candidate) => candidate.supabaseUserId === data.id,
    )
    if (resetUser) {
      delete resetUser.passwordHash
      db.sessions = db.sessions.filter(
        (session) => session.userId !== resetUser.id,
      )
      await saveDb(db)
    }
    return respond(200, {
      ok: true,
      message: "Password updated successfully. You can now sign in.",
    })
  }

  if (pathName === "/api/auth/me" && req.method === "GET") {
    const authDb = config.dataStore === "supabase" ? await loadDb() : db
    const auth = requireAuth(req, res, authDb)
    if (!auth) return true
    return respond(200, { user: sanitizeUser(auth.user) })
  }

  if (pathName === "/api/auth/logout" && req.method === "POST") {
    const authDb = config.dataStore === "supabase" ? await loadDb() : db
    const tokenHash = crypto
      .createHash("sha256")
      .update(bearerToken(req))
      .digest("hex")
    authDb.sessions = authDb.sessions.filter(
      (session) => session.tokenHash !== tokenHash,
    )
    await saveDb(authDb)
    return respond(200, { ok: true })
  }

  if (pathName === "/api/auth/activity" && req.method === "GET") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    return respond(200, {
      logs: db.auditLogs
        .filter((entry) => entry.actorId === auth.user.id)
        .slice(0, 50),
    })
  }

  return false
}
