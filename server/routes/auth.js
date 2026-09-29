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
    supabaseVerifyOtp,
    supabaseSendMagicLink,
    supabaseSendRecovery,
    supabaseUpdatePasswordWithToken,
    supabaseGetUserByToken,
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

      const generatedUsername = `LD${Math.floor(10000 + Math.random() * 90000)}`
      db.pendingSignups.push({
        id: id("PSU"),
        username: generatedUsername,
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
        username: generatedUsername,
        message:
          `Account created with Member ID ${generatedUsername}. Check your email for the 6-digit verification code or confirmation link.`,
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
            const restoredUsername = `LD${Math.floor(10000 + Math.random() * 90000)}`
            db.pendingSignups.push({
              id: id("PSU"),
              username: restoredUsername,
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
              username: restoredUsername,
              message:
                `Your signup was restored with Member ID ${restoredUsername}. Check your email for a new 6-digit verification code or confirmation link.`,
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

    let pending = db.pendingSignups.find((signup) => signup.email === email)
    if (!pending) {
      try {
        const authExisting = await supabaseAdminFindUserByEmail(email)
        if (authExisting && !authExisting.email_confirmed_at) {
          pending = {
            id: id("PSU"),
            username: `LD${Math.floor(10000 + Math.random() * 90000)}`,
            supabaseUserId: authExisting.id,
            name: authExisting.user_metadata?.name || "Retailer",
            businessName:
              authExisting.user_metadata?.businessName || "Retailer Business",
            email,
            mobile: authExisting.user_metadata?.mobile || "",
            passwordHash: null,
            createdAt: now(),
            emailVerified: false,
          }
          db.pendingSignups.push(pending)
          await saveDb(db)
        }
      } catch (err) {
        console.warn("Could not check Supabase user for pending signup:", err)
      }
    }

    if (!pending) {
      return respond(404, {
        error:
          "No pending signup found for this email. If already verified, please sign in.",
      })
    }

    let authData
    try {
      authData = await supabaseVerifyOtp({
        type: "signup",
        email,
        token: code,
      })
    } catch (signupError) {
      try {
        authData = await supabaseVerifyOtp({
          type: "email",
          email,
          token: code,
        })
      } catch (emailError) {
        let alreadyConfirmed = null
        try {
          const checkUser = await supabaseAdminFindUserByEmail(email)
          if (checkUser?.email_confirmed_at) {
            alreadyConfirmed = checkUser
          }
        } catch (_) {}
        if (!alreadyConfirmed) {
          return respond(400, {
            error:
              String(
                emailError?.message ||
                  signupError?.message ||
                  "Verification code is invalid or expired",
              ),
          })
        }
        authData = { user: alreadyConfirmed }
      }
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
    audit(db, user, "SIGNUP_EMAIL_VERIFIED_OTP", "user", user.id)
    await saveDb(db)
    return respond(200, {
      token,
      user: sanitizeUser(user),
      message:
        "Email verified successfully! Welcome to LD SERVICE ZONE.",
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
    let pending = db.pendingSignups.find((signup) => signup.email === email)
    if (!pending) {
      try {
        const authExisting = await supabaseAdminFindUserByEmail(email)
        if (authExisting && !authExisting.email_confirmed_at) {
          pending = {
            id: id("PSU"),
            username: `LD${Math.floor(10000 + Math.random() * 90000)}`,
            supabaseUserId: authExisting.id,
            name: authExisting.user_metadata?.name || "Retailer",
            businessName:
              authExisting.user_metadata?.businessName || "Retailer Business",
            email,
            mobile: authExisting.user_metadata?.mobile || "",
            passwordHash: null,
            createdAt: now(),
            emailVerified: false,
          }
          db.pendingSignups.push(pending)
          await saveDb(db)
        }
      } catch (err) {
        console.warn("Could not check Supabase user for resend:", err)
      }
    }
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
          "A new 6-digit verification code and confirmation link were sent to your email.",
      })
    } catch (error) {
      return respond(400, { error: String(error?.message || error) })
    }
  }

  if (pathName === "/api/auth/signup/confirm-link" && req.method === "POST") {
    const input = await parseJson(req)
    const accessToken = String(input.accessToken || "").trim()
    const tokenHash = String(input.tokenHash || input.token_hash || "").trim()
    const code = String(input.code || "").trim()
    const type = String(input.type || "signup").trim()

    let authData
    if (tokenHash) {
      try {
        authData = await supabaseVerifyOtp({
          type: type || "signup",
          tokenHash,
        })
      } catch (signupErr) {
        try {
          authData = await supabaseVerifyOtp({
            type: "email",
            tokenHash,
          })
        } catch (emailErr) {
          return respond(400, {
            error: String(
              emailErr?.message ||
                signupErr?.message ||
                "The confirmation link is invalid or expired",
            ),
          })
        }
      }
    } else if (code) {
      try {
        const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=pkce`, {
          method: "POST",
          headers: {
            apikey: config.supabaseAnonKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ auth_code: code }),
        })
        authData = await response.json().catch(() => ({}))
        if (!response.ok || !authData?.user?.id) {
          throw new Error("Unable to exchange confirmation code")
        }
      } catch (codeErr) {
        return respond(400, { error: String(codeErr?.message || codeErr) })
      }
    } else if (accessToken && accessToken.length >= 20) {
      try {
        const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
          headers: {
            apikey: config.supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
          },
        })
        const userData = await response.json().catch(() => ({}))
        if (!response.ok || !userData?.id) {
          throw new Error("The confirmation link is invalid or expired")
        }
        authData = { user: userData }
      } catch (error) {
        return respond(400, { error: String(error?.message || error) })
      }
    } else {
      return respond(400, {
        error:
          "The confirmation link is missing or expired. Request a new link.",
      })
    }

    const userId = authData?.user?.id
    const userEmail = String(authData?.user?.email || "").toLowerCase()
    const authUser = userId ? await supabaseAdminGetUser(userId) : null
    const pending = db.pendingSignups.find(
      (signup) =>
        (userId && signup.supabaseUserId === userId) ||
        (userEmail && signup.email === userEmail),
    )
    const user = await promotePendingSignup(db, pending, authUser || authData?.user)
    if (!user) {
      return respond(400, {
        error:
          "Email confirmed, but the pending signup could not be linked. Contact admin.",
      })
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
    audit(db, user, "SIGNUP_EMAIL_CONFIRMED_LINK", "user", user.id)
    await saveDb(db)
    return respond(200, {
      token,
      user: sanitizeUser(user),
      message: "Email verified successfully! Welcome to LD SERVICE ZONE.",
    })
  }

  if (pathName === "/api/auth/magic-link" && req.method === "POST") {
    const input = await parseJson(req)
    let email = String(input.email || input.credential || "")
      .trim()
      .toLowerCase()

    if (!isEmail(email)) {
      const mob = normalizeIndianMobile(email)
      const u = db.users.find(
        (candidate) =>
          normalizeIndianMobile(candidate.mobile) === mob ||
          String(candidate.username || "").toLowerCase() === email ||
          String(candidate.id || "").toLowerCase() === email,
      )
      if (u?.email) email = u.email.toLowerCase()
    }

    if (!isEmail(email)) {
      return respond(400, { error: "Enter a valid email address or registered mobile number" })
    }

    const user = db.users.find(
      (candidate) =>
        String(candidate.email || "").toLowerCase() === email &&
        candidate.role === "retailer",
    )
    if (!user) {
      return respond(404, {
        error: "No retailer account was found for this email or mobile",
      })
    }
    if (!user.emailVerifiedAt) {
      return respond(403, {
        error: "Verify your email from the signup confirmation code or link first",
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
      await supabaseSendMagicLink(email, `${config.publicAppUrl}/login`)
      return respond(200, {
        ok: true,
        email,
        message: "A 6-digit sign-in code and magic link have been sent to your email.",
      })
    } catch (error) {
      return respond(400, { error: String(error?.message || error) })
    }
  }

  if (pathName === "/api/auth/magic-link/consume" && req.method === "POST") {
    const input = await parseJson(req)
    const accessToken = String(input.accessToken || "").trim()
    const tokenHash = String(input.tokenHash || input.token_hash || "").trim()
    const email = String(input.email || "").trim().toLowerCase()
    const code = String(input.code || input.otp || "").trim()

    let authData
    if (code && email) {
      try {
        authData = await supabaseVerifyOtp({
          type: "magiclink",
          email,
          token: code,
        })
      } catch (magicErr) {
        try {
          authData = await supabaseVerifyOtp({
            type: "email",
            email,
            token: code,
          })
        } catch (emailErr) {
          return respond(400, {
            error: String(
              emailErr?.message ||
                magicErr?.message ||
                "Invalid or expired sign-in OTP code",
            ),
          })
        }
      }
    } else if (tokenHash) {
      try {
        authData = await supabaseVerifyOtp({
          type: "magiclink",
          tokenHash,
        })
      } catch (magicErr) {
        try {
          authData = await supabaseVerifyOtp({
            type: "email",
            tokenHash,
          })
        } catch (emailErr) {
          return respond(400, {
            error: String(
              emailErr?.message ||
                magicErr?.message ||
                "The sign-in link is invalid or expired",
            ),
          })
        }
      }
    } else if (accessToken && accessToken.length >= 20) {
      try {
        const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
          headers: {
            apikey: config.supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
          },
        })
        const userData = await response.json().catch(() => ({}))
        if (!response.ok || !userData?.id) {
          throw new Error("The magic link is invalid or expired")
        }
        authData = { user: userData }
      } catch (error) {
        return respond(400, { error: String(error?.message || error) })
      }
    } else {
      return respond(400, {
        error: "Enter the 6-digit sign-in code sent to your email",
      })
    }

    const authUser = authData?.user?.id
      ? await supabaseAdminGetUser(authData.user.id)
      : null
    const user = db.users.find(
      (candidate) =>
        (authData?.user?.id && candidate.supabaseUserId === authData.user.id) ||
        String(candidate.email || "").toLowerCase() ===
          String(authUser?.email || authData?.user?.email || "").toLowerCase(),
    )
    if (!user) {
      return respond(404, {
        error: "This sign-in session is not linked to an application account",
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
    audit(db, user, "LOGIN_OTP", "user", user.id)
    await saveDb(db)
    return respond(200, {
      token,
      user: sanitizeUser(user),
      authProvider: "supabase-otp",
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
        mobile: "8280123459",
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
        error: "Username/email/mobile and password are required",
      })
    }
    const credentialEmail = isEmail(credential) ? credential.toLowerCase() : ""
    const credentialMobile = credentialEmail
      ? ""
      : normalizeIndianMobile(credential)
    const credentialUsername =
      !credentialEmail && !credentialMobile ? credential.toLowerCase().trim() : ""

    let user = db.users.find((candidate) => {
      if (credentialEmail) {
        return (
          String(candidate.email || "")
            .trim()
            .toLowerCase() === credentialEmail
        )
      }
      if (credentialMobile) {
        return normalizeIndianMobile(candidate.mobile) === credentialMobile
      }
      return (
        String(candidate.username || "").toLowerCase() === credentialUsername ||
        String(candidate.id || "").toLowerCase() === credentialUsername ||
        String(candidate.name || "").toLowerCase() === credentialUsername ||
        (candidate.role === "admin" && credentialUsername === "admin")
      )
    })

    const pending = !user
      ? db.pendingSignups.find((signup) => {
          if (credentialEmail) {
            return String(signup.email || "").toLowerCase() === credentialEmail
          }
          if (credentialMobile) {
            return normalizeIndianMobile(signup.mobile) === credentialMobile
          }
          return (
            String(signup.username || "").toLowerCase() === credentialUsername
          )
        })
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
    } else if (
      !user &&
      !pending &&
      credentialEmail &&
      config.supabaseUrl &&
      config.supabaseServiceRoleKey
    ) {
      try {
        const authExisting = await supabaseAdminFindUserByEmail(credentialEmail)
        if (authExisting?.id) {
          if (!authExisting.email_confirmed_at) {
            return respond(403, {
              error:
                "Please verify your email before signing in. Check your inbox for the 6-digit code or link.",
              unconfirmed: true,
              email: credentialEmail,
            })
          }
          const restoredPending = {
            id: id("PSU"),
            username: `LD${Math.floor(10000 + Math.random() * 90000)}`,
            supabaseUserId: authExisting.id,
            name: authExisting.user_metadata?.name || "Retailer",
            businessName:
              authExisting.user_metadata?.businessName || "Retailer Business",
            email: credentialEmail,
            mobile: authExisting.user_metadata?.mobile || "",
            passwordHash: null,
            createdAt: now(),
            emailVerified: true,
          }
          user = await promotePendingSignup(db, restoredPending, authExisting)
          if (user) await saveDb(db)
        }
      } catch (err) {
        console.warn("Could not check/restore Supabase user on login:", err)
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
            error: "Please verify your email before signing in. Check your inbox for the 6-digit code or link.",
            unconfirmed: true,
            email: user.email,
          })
        }
        authenticatedWithSupabase = true
      } catch (authErr) {
        const errMsg = String(authErr?.message || "")
        if (/email not confirmed|confirm your email/i.test(errMsg)) {
          return respond(403, {
            error: "Please verify your email before signing in. Check your inbox for the 6-digit code or link.",
            unconfirmed: true,
            email: user.email,
          })
        }
        return respond(401, {
          error: "Invalid email or password",
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
          "Please verify your email from the confirmation code or link sent to your inbox before signing in",
        unconfirmed: true,
        email: user.email,
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
              "Please verify your email from the confirmation code or link sent to your Gmail before signing in",
            unconfirmed: true,
            email: user.email,
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
    const sessionDays = input.remember ? 30 : config.sessionDays
    db.sessions.push({
      id: id("SES"),
      userId: user.id,
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      createdAt: now(),
      expiresAt: new Date(
        Date.now() + sessionDays * 86_400_000,
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
    let email = String(input.email || input.credential || "")
      .trim()
      .toLowerCase()
    if (!isEmail(email)) {
      const mob = normalizeIndianMobile(email)
      const u = db.users.find(
        (candidate) =>
          normalizeIndianMobile(candidate.mobile) === mob ||
          String(candidate.username || "").toLowerCase() === email ||
          String(candidate.id || "").toLowerCase() === email,
      )
      if (u?.email) email = u.email.toLowerCase()
    }
    if (!isEmail(email)) {
      return respond(400, { error: "Enter a valid email address or registered mobile number" })
    }
    try {
      await supabaseSendRecovery(email, `${config.publicAppUrl}/reset-password`)
    } catch (error) {
      console.error(
        "Password recovery request:",
        String(error?.message || error),
      )
    }
    return respond(200, {
      ok: true,
      email,
      message:
        "If an account exists, a 6-digit recovery code and reset link have been sent to your email.",
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
    let accessToken = String(input.accessToken || "").trim()
    const tokenHash = String(input.tokenHash || input.token_hash || "").trim()
    const email = String(input.email || "").trim().toLowerCase()
    const otp = String(input.otp || input.code || "").trim()
    const password = String(input.password || "")

    if (password.length < 8) {
      return respond(400, {
        error: "Password must be at least 8 characters",
      })
    }

    if (!accessToken && tokenHash) {
      try {
        const authData = await supabaseVerifyOtp({
          type: "recovery",
          tokenHash,
        })
        accessToken = authData?.access_token || ""
      } catch (err) {
        return respond(400, {
          error: String(err?.message || "Invalid or expired password reset link"),
        })
      }
    }

    if (!accessToken && email && otp) {
      try {
        const authData = await supabaseVerifyOtp({
          type: "recovery",
          email,
          token: otp,
        })
        accessToken = authData?.access_token || ""
      } catch (err) {
        return respond(400, {
          error: String(err?.message || "Invalid or expired recovery code"),
        })
      }
    }

    if (!accessToken) {
      return respond(400, {
        error:
          "A valid reset session, token or 6-digit recovery code is required",
      })
    }

    let data
    try {
      data = await supabaseUpdatePasswordWithToken(accessToken, password)
    } catch (err) {
      return respond(400, {
        error: String(err?.message || "Unable to reset password"),
      })
    }

    const resetUser = db.users.find(
      (candidate) =>
        (data?.id && candidate.supabaseUserId === data.id) ||
        (email && String(candidate.email || "").toLowerCase() === email),
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
