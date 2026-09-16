import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { fileURLToPath } from "node:url"
import { createId as id, now } from "./server/lib/ids.js"
import { createResponseSender } from "./server/lib/http.js"
import {
  createFieldEncryption,
  hashPassword,
  normalizeIndianMobile,
} from "./server/lib/security.js"
import { createAuthMiddleware } from "./server/middleware/auth.js"
import { handleAuthRoutes } from "./server/routes/auth.js"
import { handleCatalogRoutes } from "./server/routes/catalog.js"
import { handleKycRoutes } from "./server/routes/kyc.js"
import { handleInsightRoutes } from "./server/routes/insights.js"
import { handleSupportRoutes } from "./server/routes/support.js"
import { handleAdminRoutes } from "./server/routes/admin.js"
import { handleApplicationRoutes } from "./server/routes/applications.js"
import { handleWalletRoutes } from "./server/routes/wallet.js"
import { handleRechargeRoutes } from "./server/routes/recharge.js"
import { handlePanMitraRoutes } from "./server/routes/panmitra.js"
import { createStateRepository } from "./server/repositories/state.js"
import { SERVICE_SEED } from "./server/data/serviceCatalog.js"
import { createRazorpayClient } from "./server/services/razorpay.js"
import { sheetSync } from "./server/services/sheetSync.js"
import { createSupabaseService } from "./server/services/supabase.js"
import { createPanMitraClient } from "./server/services/panmitraProvider.js"
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Load the local .env BEFORE importing provider modules. ESM imports are evaluated first,
// so loading .env after a static provider import makes process.env appear empty to that module.
const envFile = path.join(path.dirname(fileURLToPath(import.meta.url)), ".env")
if (process.env.LD_SKIP_ENV !== "true" && fs.existsSync(envFile)) {
  const envText = fs.readFileSync(envFile, "utf8")
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i)
    if (!match || process.env[match[1]]) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1)
    process.env[match[1]] = value
  }
}
const {
  getProviders,
  getPlans,
  initiateRecharge,
  checkRechargeStatus,
  detectOperatorCircle,
  configured: pay2allConfigured,
} = await import("./server/services/rechargeProvider.js")
const isVercel = Boolean(process.env.VERCEL)
const dataDir = process.env.LD_DATA_DIR
  ? path.resolve(process.env.LD_DATA_DIR)
  : isVercel
    ? path.join("/tmp", "ld-data")
    : path.join(__dirname, "data")
const uploadDir = path.join(dataDir, "uploads")
const kycDir = path.join(dataDir, "kyc")
fs.mkdirSync(dataDir, { recursive: true })
fs.mkdirSync(uploadDir, { recursive: true })
fs.mkdirSync(kycDir, { recursive: true })
const PORT = Number(
  process.env.LD_API_PORT ||
    (process.env.API_PORT && process.env.API_PORT !== process.env.PORT
      ? process.env.API_PORT
      : 8787),
)
const SESSION_DAYS = 7
const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "")
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ""
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const DATA_STORE = String(process.env.DATA_STORE || "supabase")
  .trim()
  .toLowerCase()
const SUPABASE_STATE_TABLE = String(
  process.env.SUPABASE_STATE_TABLE || "platform_state",
).trim()
const SUPABASE_STORAGE_BUCKET = String(
  process.env.SUPABASE_STORAGE_BUCKET || "private-documents",
).trim()
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || ""
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || ""
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || ""
const PAY2ALL_API_KEY = process.env.PAY2ALL_API_KEY || ""
const PANMITRA_API_KEY = process.env.PANMITRA_API_KEY || ""
const PANMITRA_BASE_URL = process.env.PANMITRA_BASE_URL || "https://panmitra.com/apiekyc"
let dataEncryptionKey = process.env.DATA_ENCRYPTION_KEY
if (!dataEncryptionKey) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "NOTICE: DATA_ENCRYPTION_KEY not explicitly set. Deriving stable encryption key from Supabase credentials.",
    )
    dataEncryptionKey = crypto
      .createHash("sha256")
      .update(
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
      )
      .digest("hex")
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("DATA_ENCRYPTION_KEY is required in production")
  } else {
    const keyFile = path.join(dataDir, ".encryption-key")
    if (!fs.existsSync(keyFile))
      fs.writeFileSync(keyFile, crypto.randomBytes(32).toString("hex"), {
        mode: 0o600,
      })
    dataEncryptionKey = fs.readFileSync(keyFile, "utf8").trim()
  }
}
const DATA_KEY = crypto.createHash("sha256").update(dataEncryptionKey).digest()
const { encrypt, decrypt } = createFieldEncryption(DATA_KEY)
const rawPublicUrl = String(process.env.PUBLIC_APP_URL || "")
  .trim()
  .replace(/\/$/, "")
const PUBLIC_APP_URL =
  isVercel && (!rawPublicUrl || rawPublicUrl.includes("localhost"))
    ? "https://ldservicezone.vercel.app"
    : rawPublicUrl || `http://localhost:${process.env.VITE_PORT || 8443}`
const send = createResponseSender({ publicAppUrl: PUBLIC_APP_URL, isVercel })
const { requireAuth } = createAuthMiddleware(send)
const supabase = createSupabaseService({
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  storageBucket: SUPABASE_STORAGE_BUCKET,
  dataStore: DATA_STORE,
  uploadDir,
  publicAppUrl: PUBLIC_APP_URL,
})
const razorpayRequest = createRazorpayClient({
  keyId: RAZORPAY_KEY_ID,
  keySecret: RAZORPAY_KEY_SECRET,
})
const panmitra = createPanMitraClient({
  apiKey: PANMITRA_API_KEY,
  baseUrl: PANMITRA_BASE_URL,
})
const {
  request: supabaseRequest,
  storePrivateFile,
  readPrivateFile,
  createUser: supabaseAdminCreateUser,
  getUser: supabaseAdminGetUser,
  findUserByEmail: supabaseAdminFindUserByEmail,
  passwordLogin: supabasePasswordLogin,
  persistUser: persistRelationalUser,
} = supabase
const testMode = String(process.env.LD_SKIP_ENV || "").toLowerCase() === "true"
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  const missing = []
  if (!SUPABASE_URL) missing.push("SUPABASE_URL")
  if (!SUPABASE_ANON_KEY) missing.push("SUPABASE_ANON_KEY")
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY")
  if (!testMode)
    throw new Error(
      `Supabase is required in every environment. Missing env variables: ${missing.join(", ")}`,
    )
}
if (!testMode && DATA_STORE !== "supabase") {
  throw new Error(
    "Startup blocked: DATA_STORE=supabase is required; local JSON storage is disabled",
  )
}
const stateRepository = createStateRepository({
  dataStore: DATA_STORE,
  dataDir,
  supabaseUrl: SUPABASE_URL,
  supabaseServiceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  supabaseStateTable: SUPABASE_STATE_TABLE,
})
const loadDb = stateRepository.load
const saveDb = stateRepository.save
function audit(db, actor, action, entity, entityId, meta = {}) {
  const log = {
    id: id("AUD"),
    actorId: actor?.id || "system",
    actorName: actor?.name || "System",
    action,
    entity,
    entityId,
    meta,
    createdAt: now(),
  }
  db.auditLogs.unshift(log)
  sheetSync.audit(log)
}
function seedAdmin(db) {
  const envEmail = process.env.ADMIN_EMAIL
    ? process.env.ADMIN_EMAIL.trim().toLowerCase()
    : ""
  const envPassword = process.env.ADMIN_PASSWORD
    ? process.env.ADMIN_PASSWORD.trim()
    : ""

  const adminUser = db.users.find(
    (u) =>
      u.email === "admin@ldservicezone.in" ||
      u.id === "USR-C1D58AF9D2" ||
      (u.role === "admin" && (!u.adminRole || u.adminRole === "super_admin")),
  )
  if (adminUser) {
    adminUser.id = "USR-C1D58AF9D2"
    adminUser.username = "admin"
    adminUser.role = "admin"
    adminUser.adminRole = "super_admin"
    adminUser.email = envEmail || "admin@ldservicezone.in"
    adminUser.passwordHash = hashPassword(envPassword || "Bilson@123")
  } else {
    db.users.push({
      id: "USR-C1D58AF9D2",
      username: "admin",
      supabaseUserId: "",
      name: "Super Admin",
      businessName: "LD SERVICE ZONE",
      email: envEmail || "admin@ldservicezone.in",
      mobile: "",
      role: "admin",
      adminRole: "super_admin",
      status: "active",
      kycStatus: "verified",
      passwordHash: hashPassword(envPassword || "Bilson@123"),
      createdAt: now(),
    })
    audit(db, null, "ADMIN_SEEDED", "user", "USR-C1D58AF9D2")
  }

  // Seed demo Verification Agent
  const existingVerifier = db.users.find(
    (u) =>
      u.email === "verifier@ldservicezone.in" ||
      u.id === "USR-AE3C7873E1" ||
      u.username === "verifier",
  )
  if (existingVerifier) {
    existingVerifier.id = "USR-AE3C7873E1"
    existingVerifier.name = "Verification Agent"
    existingVerifier.username = "verifier"
    existingVerifier.email = "verifier@ldservicezone.in"
    existingVerifier.role = "admin"
    existingVerifier.adminRole = "verification_agent"
    existingVerifier.passwordHash = hashPassword("Verifier@123")
  } else {
    db.users.push({
      id: "USR-AE3C7873E1",
      username: "verifier",
      supabaseUserId: "",
      name: "Verification Agent",
      businessName: "LD Operations",
      email: "verifier@ldservicezone.in",
      mobile: "9876543210",
      role: "admin",
      adminRole: "verification_agent",
      status: "active",
      kycStatus: "verified",
      passwordHash: hashPassword("Verifier@123"),
      createdAt: now(),
    })
  }

  // Seed demo Support Staff
  const existingSupport = db.users.find(
    (u) =>
      u.email === "support@ldservicezone.in" ||
      u.id === "USR-AB88442A5C" ||
      u.username === "support",
  )
  if (existingSupport) {
    existingSupport.id = "USR-AB88442A5C"
    existingSupport.name = "Support Staff"
    existingSupport.username = "support"
    existingSupport.email = "support@ldservicezone.in"
    existingSupport.role = "admin"
    existingSupport.adminRole = "support_staff"
    existingSupport.passwordHash = hashPassword("Support@123")
  } else {
    db.users.push({
      id: "USR-AB88442A5C",
      username: "support",
      supabaseUserId: "",
      name: "Support Staff",
      businessName: "LD Customer Care",
      email: "support@ldservicezone.in",
      mobile: "9876543211",
      role: "admin",
      adminRole: "support_staff",
      status: "active",
      kycStatus: "verified",
      passwordHash: hashPassword("Support@123"),
      createdAt: now(),
    })
  }
}
function seedServices(db) {
  if (!Array.isArray(db.services)) db.services = []
  const existingIds = new Set(db.services.map((s) => s.id))
  for (const service of SERVICE_SEED) {
    if (!existingIds.has(service.id)) {
      db.services.push({
        ...service,
        documents: [...service.documents],
        createdAt: now(),
        updatedAt: now(),
      })
      existingIds.add(service.id)
    }
  }
}
function applicationHelpSnapshot(app) {
  if (!app) return null
  const applicant = {}
  for (const [key, value] of Object.entries(app.applicant || {})) {
    if (/aadhaar/i.test(key)) {
      applicant.aadhaar = "[protected]"
      continue
    }
    applicant[key] = /pan|bank|account|license|licence/i.test(key)
      ? "[protected]"
      : value
  }
  return {
    applicationId: app.applicationId,
    serviceId: app.serviceId,
    serviceName: app.serviceName,
    category: app.category,
    status: app.status,
    customerPrice: Number(app.customerPrice || 0),
    commission: Number(app.commission || 0),
    documents: (app.documents || []).map((d) => ({
      name: d.name,
      fileName: d.fileName || null,
      mimeType: d.mimeType || null,
      size: d.size || null,
      uploadedAt: d.uploadedAt || null,
    })),
    applicant,
    paymentId: app.paymentId ? "[reference]" : null,
    orderId: app.orderId ? "[reference]" : null,
  }
}
function creditApplicationCommission(db, app) {
  if (!app || app.commissionCredited) return false
  const providerCommission = Number(app.commission || 0)
  const userCommission = Number((providerCommission / 2).toFixed(2))
  const adminCommission = Number(
    (providerCommission - userCommission).toFixed(2),
  )
  app.providerCommission = providerCommission
  app.userCommission = userCommission
  app.adminCommission = adminCommission
  if (userCommission > 0) {
    const wallet = ensureWallet(app.userId)
    wallet.balance = Number((wallet.balance + userCommission).toFixed(2))
    wallet.updatedAt = now()
    db.walletLedger.unshift({
      id: id("WL"),
      userId: app.userId,
      type: "credit",
      amount: userCommission,
      reference: app.applicationId,
      description: `50% service commission - ${app.serviceName}`,
      status: "success",
      createdAt: now(),
      balanceAfter: wallet.balance,
    })
  }
  db.commissionLedger.unshift({
    id: id("CM"),
    applicationId: app.applicationId,
    userId: app.userId,
    providerCommission,
    userCommission,
    adminCommission,
    createdAt: now(),
  })
  app.commissionCredited = true
  return true
}
function updateApplicationByAdmin(db, app, input, actor) {
  const allowed = [
    "submitted",
    "processing",
    "accepted",
    "rejected",
    "completed",
    "payment_pending",
  ]
  if (input.status && !allowed.includes(input.status))
    throw new Error("Invalid status")
  if (
    input.status &&
    ["submitted", "processing", "accepted", "completed"].includes(
      input.status,
    ) &&
    Number(app.customerPrice) > 0 &&
    !app.paymentId
  )
    throw new Error(
      "Payment must be verified before processing this application",
    )
  const previousStatus = app.status
  if (input.status) app.status = input.status
  if (typeof input.adminNote === "string") app.adminNote = input.adminNote
  let commissionCredited = false
  let commissionReversed = false
  if (input.status === "completed" && !app.commissionCredited) {
    commissionCredited = creditApplicationCommission(db, app)
  } else if (input.status === "rejected" && app.commissionCredited) {
    // Automatically reverse credited commission upon application rejection
    if (app.userCommission > 0) {
      const wallet = ensureWallet(app.userId)
      wallet.balance = Number((wallet.balance - app.userCommission).toFixed(2))
      wallet.updatedAt = now()
      db.walletLedger.unshift({
        id: id("WL"),
        userId: app.userId,
        type: "debit",
        amount: app.userCommission,
        reference: `REV-${app.applicationId}`,
        description: `Commission reversal - ${app.serviceName} rejected`,
        status: "success",
        createdAt: now(),
        balanceAfter: wallet.balance,
      })
      db.commissionLedger.unshift({
        id: id("CM"),
        applicationId: app.applicationId,
        userId: app.userId,
        providerCommission: -Number(app.providerCommission || 0),
        userCommission: -Number(app.userCommission || 0),
        adminCommission: -Number(app.adminCommission || 0),
        createdAt: now(),
      })
    }
    app.commissionCredited = false
    commissionReversed = true
  }
  app.updatedAt = now()
  const meta = {
    adminNote: app.adminNote,
    previousStatus,
    commissionCredited,
    commissionReversed,
  }
  audit(
    db,
    actor,
    `APPLICATION_${String(input.status || "UPDATED").toUpperCase()}`,
    "application",
    app.applicationId,
    meta,
  )
  return { previousStatus, commissionCredited, commissionReversed }
}
let db = await loadDb()
function ensureWallet(userId) {
  if (!db.wallets[userId])
    db.wallets[userId] = {
      userId,
      balance: 0,
      creditLimit: 0,
      pendingSettlement: 0,
      createdAt: now(),
      updatedAt: now(),
    }
  return db.wallets[userId]
}
function normalizeDb(db) {
  seedAdmin(db)
  for (const user of db.users) {
    if (user.role === "admin") {
      if (
        user.email === "admin@ldservicezone.in" ||
        user.name === "Super Admin" ||
        user.id === "USR-C1D58AF9D2"
      ) {
        user.username = "admin"
        user.adminRole = "super_admin"
      } else if (
        user.email === "verifier@ldservicezone.in" ||
        user.adminRole === "verification_agent"
      ) {
        user.username = "verifier"
        user.adminRole = "verification_agent"
      } else if (
        user.email === "support@ldservicezone.in" ||
        user.adminRole === "support_staff"
      ) {
        user.username = "support"
        user.adminRole = "support_staff"
      } else if (!user.username) {
        user.username = user.name
          ? user.name.toLowerCase().replace(/\s+/g, "")
          : `admin${String(user.id).slice(-4)}`
        user.adminRole = user.adminRole || "super_admin"
      }
    } else {
      if (!user.username) {
        if (user.email === "dibyakanta.co@gmail.com") {
          user.username = "LD45666"
        } else {
          const digits = String(user.mobile || user.id || "").replace(/\D/g, "")
          user.username =
            digits.length >= 5 ? `LD${digits.slice(-5)}` : "LD10001"
        }
      }
    }
    ensureWallet(user.id)
  }
  seedServices(db)
}
normalizeDb(db)
if (DATA_STORE === "supabase") {
  for (const user of db.users) {
    try {
      await persistRelationalUser(user)
    } catch {
      // Non-fatal if relational user sync encounters constraint duplicates
    }
  }
}
await saveDb(db)
async function promotePendingSignup(db, pending, authUser) {
  if (!pending || !authUser?.id) return null
  if (
    !authUser.email_confirmed_at ||
    authUser.id !== pending.supabaseUserId ||
    String(authUser.email || "").toLowerCase() !== pending.email.toLowerCase()
  )
    return null
  if (
    db.users.some(
      (u) =>
        normalizeIndianMobile(u.mobile) ===
          normalizeIndianMobile(pending.mobile) &&
        String(u.email).toLowerCase() !== pending.email.toLowerCase(),
    )
  )
    return null
  const existing = db.users.find(
    (u) =>
      u.supabaseUserId === authUser.id ||
      String(u.email || "").toLowerCase() === pending.email.toLowerCase(),
  )
  if (existing) {
    if (!existing.username) {
      existing.username = pending.username || `LD${Math.floor(10000 + Math.random() * 90000)}`
    }
    existing.supabaseUserId = authUser.id
    existing.emailVerifiedAt = existing.emailVerifiedAt || now()
    existing.mobile = normalizeIndianMobile(existing.mobile || pending.mobile)
    existing.name = existing.name || pending.name
    existing.businessName = existing.businessName || pending.businessName
    db.pendingSignups = db.pendingSignups.filter((x) => x.id !== pending.id)
    await persistRelationalUser(existing)
    return existing
  }
  const user = {
    id: id("USR"),
    username: pending.username || `LD${Math.floor(10000 + Math.random() * 90000)}`,
    supabaseUserId: authUser.id,
    name: pending.name,
    businessName: pending.businessName,
    email: pending.email,
    mobile: normalizeIndianMobile(pending.mobile),
    role: "retailer",
    status: "active",
    kycStatus: "pending",
    passwordHash: pending.passwordHash,
    createdAt: now(),
    emailVerifiedAt: now(),
  }
  db.users.push(user)
  ensureWallet(user.id)
  db.pendingSignups = db.pendingSignups.filter((x) => x.id !== pending.id)
  audit(db, user, "SIGNUP_EMAIL_VERIFIED", "user", user.id)
  sheetSync.user(user)
  await persistRelationalUser(user)
  return user
}
export async function handleRequest(req, res) {
  res._req = req
  if (req.method === "OPTIONS") return send(res, 204, {})
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`)
  const pathName = url.pathname
  try {
    // Refresh the shared snapshot on every request so warm serverless instances
    // cannot validate sessions against stale Supabase state.
    if (DATA_STORE === "supabase") {
      db = await loadDb()
      normalizeDb(db)
    }
    if (pathName === "/api/health" && req.method === "GET") {
      return send(res, 200, {
        ok: true,
        service: "LD SERVICE ZONE API",
        paymentMode:
          RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET ? "razorpay" : "unavailable",
        integrations: {
          pay2all: Boolean(PAY2ALL_API_KEY),
          panmitra: panmitra.configured(),
          supabaseAuth: Boolean(
            SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY,
          ),
          googleSheets: false,
          razorpay: Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET),
        },
      })
    }
    const authHandled = await handleAuthRoutes({
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
      config: {
        dataStore: DATA_STORE,
        publicAppUrl: PUBLIC_APP_URL,
        sessionDays: SESSION_DAYS,
        supabaseUrl: SUPABASE_URL,
        supabaseAnonKey: SUPABASE_ANON_KEY,
        supabaseServiceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
      },
    })
    if (authHandled) return
    const catalogHandled = await handleCatalogRoutes({
      req,
      res,
      pathName,
      db,
      send,
      saveDb,
      requireAuth,
      audit,
    })
    if (catalogHandled) return
    const kycHandled = await handleKycRoutes({
      req,
      res,
      pathName,
      db,
      send,
      saveDb,
      requireAuth,
      audit,
      encrypt,
      decrypt,
      storePrivateFile,
      readPrivateFile,
      syncUser: (user) => sheetSync.user(user),
    })
    if (kycHandled) return
    const insightHandled = await handleInsightRoutes({
      req,
      res,
      pathName,
      url,
      db,
      send,
      requireAuth,
    })
    if (insightHandled) return
    const supportHandled = await handleSupportRoutes({
      req,
      res,
      pathName,
      url,
      db,
      send,
      saveDb,
      requireAuth,
      audit,
      applicationHelpSnapshot,
      updateApplicationByAdmin,
      syncApplication: (application) => sheetSync.application(application),
    })
    if (supportHandled) return
    const adminHandled = await handleAdminRoutes({
      req,
      res,
      pathName,
      db,
      send,
      saveDb,
      audit,
      requireAuth,
      ensureWallet,
    })
    if (adminHandled) return
    const panmitraHandled = await handlePanMitraRoutes({
      req,
      res,
      pathName,
      url,
      db,
      send,
      requireAuth,
      provider: panmitra,
    })
    if (panmitraHandled) return
    const applicationHandled = await handleApplicationRoutes({
      req,
      res,
      pathName,
      db,
      send,
      saveDb,
      requireAuth,
      audit,
      encrypt,
      decrypt,
      storePrivateFile,
      readPrivateFile,
      updateApplicationByAdmin,
      ensureWallet,
      razorpayRequest,
      syncApplication: (application) => sheetSync.application(application),
      syncPayment: (payment) => sheetSync.payment(payment),
      config: {
        razorpayKeyId: RAZORPAY_KEY_ID,
        razorpayKeySecret: RAZORPAY_KEY_SECRET,
        razorpayWebhookSecret: RAZORPAY_WEBHOOK_SECRET,
      },
    })
    if (applicationHandled) return
    const walletHandled = await handleWalletRoutes({
      req,
      res,
      pathName,
      url,
      db,
      send,
      saveDb,
      requireAuth,
      audit,
      ensureWallet,
      razorpayRequest,
      syncPayment: (payment) => sheetSync.payment(payment),
      config: {
        razorpayKeyId: RAZORPAY_KEY_ID,
        razorpayKeySecret: RAZORPAY_KEY_SECRET,
      },
    })
    if (walletHandled) return
    const rechargeHandled = await handleRechargeRoutes({
      req,
      res,
      pathName,
      url,
      db,
      send,
      saveDb,
      requireAuth,
      audit,
      ensureWallet,
      provider: {
        configured: pay2allConfigured,
        getProviders,
        getPlans,
        initiateRecharge,
        checkRechargeStatus,
        detectOperatorCircle,
      },
    })
    if (rechargeHandled) return
    return send(res, 404, { error: "Not found" })
  } catch (error) {
    console.error(error)
    return send(res, error?.status || 500, {
      error: error?.status
        ? error.message
        : "The request could not be completed. Please try again or contact support.",
    })
  }
}
const server = http.createServer(handleRequest)
if (!process.env.VERCEL && process.env.LD_NO_LISTEN !== "true") {
  server.on("error", (error) => {
    console.error(
      `LD SERVICE ZONE API could not start on port ${PORT}: ${error.message}`,
    )
    process.exit(1)
  })
  server.listen(PORT, "0.0.0.0", () =>
    console.log(
      `LD SERVICE ZONE API running on http://localhost:${PORT} | payment: ${
        RAZORPAY_KEY_ID ? "Razorpay" : "Demo"
      }`,
    ),
  )
}
export default server
