import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

// Load the local .env BEFORE importing provider modules. ESM imports are evaluated first,
// so loading .env after a static provider import makes process.env appear empty to that module.
const envFile = path.join(path.dirname(fileURLToPath(import.meta.url)), ".env");
if (fs.existsSync(envFile)) {
  const envText = fs.readFileSync(envFile, "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

const { getProviders, getPlans, initiateRecharge, checkRechargeStatus, detectOperatorCircle, configured: pay2allConfigured } = await import("./server/services/rechargeProvider.js");

const isVercel = Boolean(process.env.VERCEL);
const dataDir = isVercel ? path.join("/tmp", "ld-data") : path.join(__dirname, "data");
const uploadDir = path.join(dataDir, "uploads");
const kycDir = path.join(dataDir, "kyc");
const dbFile = path.join(dataDir, "db.json");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(kycDir, { recursive: true });

const PORT = Number(process.env.LD_API_PORT || (process.env.API_PORT && process.env.API_PORT !== process.env.PORT ? process.env.API_PORT : 8787));
const SESSION_DAYS = 7;
const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";
const PAY2ALL_API_KEY = process.env.PAY2ALL_API_KEY || "";
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || "";
const GOOGLE_SHEET_TAB_USERS = process.env.GOOGLE_SHEET_TAB_USERS || "Users";
const GOOGLE_SHEET_TAB_APPLICATIONS = process.env.GOOGLE_SHEET_TAB_APPLICATIONS || "Applications";
const GOOGLE_SHEET_TAB_PAYMENTS = process.env.GOOGLE_SHEET_TAB_PAYMENTS || "Payments";
const GOOGLE_SHEET_TAB_AUDIT = process.env.GOOGLE_SHEET_TAB_AUDIT || "AuditLogs";
const GOOGLE_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";

let dataEncryptionKey = process.env.DATA_ENCRYPTION_KEY;
if (!dataEncryptionKey) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY) {
    console.warn("NOTICE: DATA_ENCRYPTION_KEY not explicitly set. Deriving stable encryption key from Supabase credentials.");
    dataEncryptionKey = crypto.createHash("sha256").update(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY).digest("hex");
  } else if (process.env.NODE_ENV === "production") {
    console.warn("NOTICE: Generating deterministic fallback encryption key for production.");
    dataEncryptionKey = crypto.createHash("sha256").update("ld-service-zone-production-fallback-key-2026").digest("hex");
  } else {
    console.warn("SECURITY WARNING: DATA_ENCRYPTION_KEY is not set. Generating temporary key.");
    dataEncryptionKey = crypto.randomBytes(32).toString("hex");
  }
}
const DATA_KEY = crypto.createHash("sha256").update(dataEncryptionKey).digest();
const rawPublicUrl = String(process.env.PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
const PUBLIC_APP_URL = (isVercel && (!rawPublicUrl || rawPublicUrl.includes("localhost")))
  ? "https://ldservicezone.vercel.app"
  : (rawPublicUrl || `http://localhost:${process.env.VITE_PORT || 8443}`);

const rateLimits = new Map();
function checkRateLimit(key, maxRequests = 10, windowMs = 60_000) {
  const nowTime = Date.now();
  const entry = rateLimits.get(key) || { count: 0, resetAt: nowTime + windowMs };
  if (nowTime > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = nowTime + windowMs;
  } else {
    entry.count += 1;
  }
  rateLimits.set(key, entry);
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - nowTime) / 1000);
    return { limited: true, retryAfter };
  }
  return { limited: false, retryAfter: 0 };
}
function getClientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1").split(",")[0].trim();
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  const missing = [];
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_ANON_KEY) missing.push("SUPABASE_ANON_KEY");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  console.warn(`AUTH WARNING: Supabase Auth is not fully configured. Missing env variables in Vercel: ${missing.join(", ")}`);
}

const initialDb = {
  users: [],
  sessions: [],
  applications: [],
  payments: [],
  auditLogs: [],
  otpVerifications: [],
  wallets: {},
  walletLedger: [],
  rechargeTransactions: [],
  commissionLedger: [],
  supportTickets: [],
  helpRequests: [],
  services: [],
  pendingSignups: [],
};

function loadDb() {
  if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify(initialDb, null, 2));
  try {
    const db = JSON.parse(fs.readFileSync(dbFile, "utf8"));
    return { ...initialDb, ...db };
  } catch {
    return structuredClone(initialDb);
  }
}
function saveDb(db) {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error("saveDb write error:", err.message);
  }
}
function id(prefix) { return `${prefix}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`; }
function now() { return new Date().toISOString(); }
function normalizeIndianMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const ten = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(ten)) return "";
  return `+91${ten}`;
}
function isEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "")); }
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || "").split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}
function encrypt(value) {
  if (!value) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", DATA_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return `enc:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
}
function decrypt(value) {
  if (!value || !String(value).startsWith("enc:")) return value;
  try {
    const [, ivB64, tagB64, dataB64] = String(value).split(":");
    const decipher = crypto.createDecipheriv("aes-256-gcm", DATA_KEY, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch { return "[protected]"; }
}
function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}
function publicApplication(app) {
  return {
    ...app,
    applicant: Object.fromEntries(Object.entries(app.applicant || {}).map(([k, v]) => [k, decrypt(v)])),
  };
}
function readRawBody(req, max = 8_000_000) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => { body += chunk; if (body.length > max) { req.destroy(); reject(new Error("Payload too large")); } });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}
function parseJson(req) {
  return readRawBody(req).then(body => {
    if (!body) return {};
    try { return JSON.parse(body); } catch { throw new Error("Invalid JSON"); }
  });
}
function getCorsOrigin(res) {
  const req = res._req;
  const origin = req?.headers?.origin;
  if (origin) {
    if (origin.endsWith(".vercel.app") || origin.startsWith("http://localhost:") || origin === "https://ldservicezone.vercel.app") {
      return origin;
    }
  }
  const configured = String(process.env.CORS_ORIGIN || "").trim().replace(/\/$/, "");
  if (configured && !configured.includes("localhost")) return configured;
  return origin || (isVercel ? "https://ldservicezone.vercel.app" : "*");
}
function send(res, status, payload, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": getCorsOrigin(res),
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    ...headers,
  });
  res.end(JSON.stringify(payload));
}
function bearer(req) {
  const value = req.headers.authorization || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}
function getAuth(req, db) {
  const token = bearer(req);
  if (!token) return null;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const session = db.sessions.find(s => s.tokenHash === tokenHash && new Date(s.expiresAt) > new Date());
  if (!session) return null;
  const user = db.users.find(u => u.id === session.userId);
  return user ? { user, session } : null;
}
function requireAuth(req, res, db, role) {
  const auth = getAuth(req, db);
  if (!auth) { send(res, 401, { error: "Authentication required" }); return null; }
  if (role && auth.user.role !== role) { send(res, 403, { error: "Admin access required" }); return null; }
  return auth;
}
function audit(db, actor, action, entity, entityId, meta = {}) {
  const log = { id: id("AUD"), actorId: actor?.id || "system", actorName: actor?.name || "System", action, entity, entityId, meta, createdAt: now() };
  db.auditLogs.unshift(log);
  syncSheet(GOOGLE_SHEET_TAB_AUDIT, sheetAudit(log));
}
function seedAdmin(db) {
  const adminUser = db.users.find(u => u.role === "admin");
  const envEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : "";
  const envPassword = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.trim() : "";

  if (adminUser) {
    if (envEmail && adminUser.email !== envEmail) {
      adminUser.email = envEmail;
    }
    if (envPassword) {
      adminUser.passwordHash = hashPassword(envPassword);
    }
    return;
  }

  const email = envEmail || "admin@ldservicezone.in";
  let password = envPassword;
  if (!password) {
    password = `Admin@${crypto.createHash("sha256").update(dataEncryptionKey || "default-admin-salt").digest("hex").slice(0, 8)}!A1`;
    console.warn(`NOTICE: ADMIN_PASSWORD not configured. Initialized default admin account: ${email}`);
  }

  db.users.push({ id: id("USR"), supabaseUserId: "", name: "Super Admin", businessName: "LD SERVICE ZONE", email, mobile: "", role: "admin", status: "active", kycStatus: "verified", passwordHash: hashPassword(password), createdAt: now() });
  audit(db, null, "ADMIN_SEEDED", "user", db.users.at(-1).id);
}
const SERVICE_SEED = [
  // Government Identity & Transport
  { id: "S001", category: "Government", name: "Voter ID Card", processingTime: "7-15 days", customerPrice: 100, commission: 40, documents: ["Aadhaar", "DOB Proof"], color: "#4F46E5" },
  { id: "VOTER-NEW", category: "Government", name: "New Voter ID", processingTime: "7-15 days", customerPrice: 100, commission: 40, documents: ["Aadhaar", "DOB Proof", "Photograph"], color: "#4F46E5" },
  { id: "VOTER-CORRECTION", category: "Government", name: "Voter ID Correction", processingTime: "7-15 days", customerPrice: 100, commission: 35, documents: ["Voter ID", "Aadhaar", "Supporting Proof"], color: "#F59E0B" },
  { id: "VOTER-ADDRESS", category: "Government", name: "Voter ID Address Change", processingTime: "7-15 days", customerPrice: 100, commission: 35, documents: ["Voter ID", "Address Proof"], color: "#06B6D4" },
  { id: "VOTER-DOWNLOAD", category: "Government", name: "Voter ID Download", processingTime: "Instant", customerPrice: 30, commission: 10, documents: ["EPIC Number", "Mobile Number"], color: "#10B981" },

  { id: "S002", category: "Government", name: "Driving Licence", processingTime: "15-30 days", customerPrice: 500, commission: 100, documents: ["Aadhaar", "Medical Cert", "Age Proof"], color: "#1D56D8" },
  { id: "DL-NEW", category: "Government", name: "New Driving Licence", processingTime: "15-30 days", customerPrice: 500, commission: 100, documents: ["Aadhaar", "Medical Cert", "Age Proof"], color: "#1D56D8" },
  { id: "DL-LEARNER", category: "Government", name: "Learner Licence", processingTime: "7-15 days", customerPrice: 300, commission: 70, documents: ["Aadhaar", "Age Proof"], color: "#4F46E5" },
  { id: "DL-RENEWAL", category: "Government", name: "Driving Licence Renewal", processingTime: "7-15 days", customerPrice: 400, commission: 80, documents: ["Driving Licence", "Aadhaar"], color: "#10B981" },
  { id: "DL-CORRECTION", category: "Government", name: "Driving Licence Correction", processingTime: "7-15 days", customerPrice: 400, commission: 75, documents: ["Driving Licence", "Supporting Proof"], color: "#F59E0B" },
  { id: "DL-DUPLICATE", category: "Government", name: "Duplicate Driving Licence", processingTime: "7-15 days", customerPrice: 450, commission: 90, documents: ["Driving Licence", "Aadhaar"], color: "#7C3AED" },

  { id: "S003", category: "Government", name: "RC Smart Card", processingTime: "10-20 days", customerPrice: 400, commission: 80, documents: ["RC Book", "Insurance", "PUC"], color: "#06B6D4" },
  { id: "RC-NEW", category: "Government", name: "New RC Smart Card", processingTime: "10-20 days", customerPrice: 400, commission: 80, documents: ["RC Book", "Insurance", "PUC"], color: "#06B6D4" },
  { id: "RC-TRANSFER", category: "Government", name: "RC Transfer", processingTime: "10-20 days", customerPrice: 500, commission: 100, documents: ["RC Book", "Sale Agreement", "Insurance"], color: "#4F46E5" },
  { id: "RC-CORRECTION", category: "Government", name: "RC Correction", processingTime: "10-20 days", customerPrice: 350, commission: 70, documents: ["RC Book", "Supporting Proof"], color: "#F59E0B" },
  { id: "RC-DUPLICATE", category: "Government", name: "Duplicate RC", processingTime: "10-20 days", customerPrice: 400, commission: 80, documents: ["Vehicle Details", "Insurance", "PUC"], color: "#7C3AED" },

  // Tax & Business
  { id: "S004", category: "Tax", name: "ITR-1 Filing", processingTime: "Same day", customerPrice: 299, commission: 120, documents: ["PAN", "Form 16", "Bank Statement"], color: "#10B981" },
  { id: "ITR-1-REVISED", category: "Tax", name: "Revised ITR-1", processingTime: "Same day", customerPrice: 399, commission: 150, documents: ["PAN", "Form 16", "Original ITR"], color: "#F59E0B" },
  { id: "S005", category: "Tax", name: "GST Registration", processingTime: "3-7 days", customerPrice: 999, commission: 300, documents: ["PAN", "Aadhaar", "Business Proof"], color: "#F59E0B" },
  { id: "GST-REG", category: "Tax", name: "New GST Registration", processingTime: "3-7 days", customerPrice: 999, commission: 300, documents: ["PAN", "Aadhaar", "Business Proof"], color: "#F59E0B" },
  { id: "GST-CORRECTION", category: "Tax", name: "GST Amendment", processingTime: "3-7 days", customerPrice: 699, commission: 200, documents: ["GSTIN", "Supporting Proof"], color: "#4F46E5" },

  // Certificates
  { id: "INCOME-NEW", category: "Certificate", name: "New Income Certificate", processingTime: "7-10 days", customerPrice: 150, commission: 50, documents: ["Aadhaar", "Ration Card"], color: "#7C3AED" },
  { id: "INCOME-RENEW", category: "Certificate", name: "Income Certificate Renewal", processingTime: "7-10 days", customerPrice: 150, commission: 45, documents: ["Old Certificate", "Aadhaar"], color: "#10B981" },
  { id: "CASTE-NEW", category: "Certificate", name: "New Caste Certificate", processingTime: "10-15 days", customerPrice: 100, commission: 40, documents: ["Aadhaar", "Old Caste Cert"], color: "#06B6D4" },
  { id: "CASTE-CORRECTION", category: "Certificate", name: "Caste Certificate Correction", processingTime: "10-15 days", customerPrice: 100, commission: 35, documents: ["Certificate", "Supporting Proof"], color: "#F59E0B" },

  // PAN Services
  { id: "S007", category: "PAN", name: "New PAN Card", processingTime: "7-15 days", customerPrice: 107, commission: 32, documents: ["Aadhaar", "DOB Proof", "Photograph"], color: "#F87171" },
  { id: "PAN-NEW", category: "PAN", name: "New PAN", processingTime: "7-15 days", customerPrice: 107, commission: 32, documents: ["Aadhaar", "DOB Proof", "Photograph"], color: "#F87171" },
  { id: "PAN-CORRECTION", category: "PAN", name: "PAN Correction", processingTime: "7-15 days", customerPrice: 107, commission: 28, documents: ["PAN Card", "Aadhaar", "Supporting Proof"], color: "#F59E0B" },
  { id: "PAN-REPRINT", category: "PAN", name: "PAN Reprint", processingTime: "7-15 days", customerPrice: 50, commission: 20, documents: ["PAN Number", "Aadhaar"], color: "#06B6D4" },
  { id: "PAN-FIND", category: "PAN", name: "PAN Find", processingTime: "Instant", customerPrice: 20, commission: 10, documents: ["Aadhaar"], color: "#4F46E5" },
  { id: "PAN-STATUS", category: "PAN", name: "PAN Status", processingTime: "Instant", customerPrice: 0, commission: 0, documents: ["Acknowledgement Number"], color: "#10B981" },
  { id: "PAN-UTI", category: "PAN", name: "UTI Services", processingTime: "7-15 days", customerPrice: 120, commission: 40, documents: ["Aadhaar", "PAN"], color: "#7C3AED" },
  { id: "PAN-NSDL", category: "PAN", name: "NSDL Services", processingTime: "7-15 days", customerPrice: 120, commission: 35, documents: ["Aadhaar", "PAN"], color: "#1D56D8" },
];
function seedServices(db) {
  if (!Array.isArray(db.services)) db.services = [];
  const existingIds = new Set(db.services.map(s => s.id));
  for (const service of SERVICE_SEED) {
    if (!existingIds.has(service.id)) {
      db.services.push({ ...service, documents: [...service.documents], createdAt: now(), updatedAt: now() });
      existingIds.add(service.id);
    }
  }
}
function applicationHelpSnapshot(app) {
  if (!app) return null;
  const applicant = {};
  for (const [key, value] of Object.entries(app.applicant || {})) {
    if (/aadhaar/i.test(key)) { applicant.aadhaar = "[protected]"; continue; }
    applicant[key] = /pan|bank|account|license|licence/i.test(key) ? "[protected]" : value;
  }
  return {
    applicationId: app.applicationId,
    serviceId: app.serviceId,
    serviceName: app.serviceName,
    category: app.category,
    status: app.status,
    customerPrice: Number(app.customerPrice || 0),
    commission: Number(app.commission || 0),
    documents: (app.documents || []).map(d => ({ name: d.name, fileName: d.fileName || null, mimeType: d.mimeType || null, size: d.size || null, uploadedAt: d.uploadedAt || null })),
    applicant,
    paymentId: app.paymentId ? "[reference]" : null,
    orderId: app.orderId ? "[reference]" : null,
  };
}
function creditApplicationCommission(db, app) {
  if (!app || app.commissionCredited) return false;
  const providerCommission = Number(app.commission || 0);
  const userCommission = Number((providerCommission / 2).toFixed(2));
  const adminCommission = Number((providerCommission - userCommission).toFixed(2));
  app.providerCommission = providerCommission;
  app.userCommission = userCommission;
  app.adminCommission = adminCommission;
  if (userCommission > 0) {
    const wallet = ensureWallet(app.userId);
    wallet.balance = Number((wallet.balance + userCommission).toFixed(2));
    wallet.updatedAt = now();
    db.walletLedger.unshift({ id: id("WL"), userId: app.userId, type: "credit", amount: userCommission, reference: app.applicationId, description: `50% service commission - ${app.serviceName}`, status: "success", createdAt: now(), balanceAfter: wallet.balance });
  }
  db.commissionLedger.unshift({ id: id("CM"), applicationId: app.applicationId, userId: app.userId, providerCommission, userCommission, adminCommission, createdAt: now() });
  app.commissionCredited = true;
  return true;
}
function updateApplicationByAdmin(db, app, input, actor) {
  const allowed = ["submitted", "processing", "accepted", "rejected", "completed", "payment_pending"];
  if (input.status && !allowed.includes(input.status)) throw new Error("Invalid status");
  const previousStatus = app.status;
  if (input.status) app.status = input.status;
  if (typeof input.adminNote === "string") app.adminNote = input.adminNote;
  let commissionCredited = false;
  let commissionReversed = false;

  if (input.status === "completed" && !app.commissionCredited) {
    commissionCredited = creditApplicationCommission(db, app);
  } else if (previousStatus === "completed" && input.status === "rejected" && app.commissionCredited) {
    // Automatically reverse credited commission upon application rejection
    if (app.userCommission > 0) {
      const wallet = ensureWallet(app.userId);
      wallet.balance = Math.max(0, Number((wallet.balance - app.userCommission).toFixed(2)));
      wallet.updatedAt = now();
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
      });
      db.commissionLedger.unshift({
        id: id("CM"),
        applicationId: app.applicationId,
        userId: app.userId,
        providerCommission: -Number(app.providerCommission || 0),
        userCommission: -Number(app.userCommission || 0),
        adminCommission: -Number(app.adminCommission || 0),
        createdAt: now(),
      });
    }
    app.commissionCredited = false;
    commissionReversed = true;
  }

  app.updatedAt = now();
  const meta = { adminNote: app.adminNote, previousStatus, commissionCredited, commissionReversed };
  audit(db, actor, `APPLICATION_${String(input.status || "UPDATED").toUpperCase()}`, "application", app.applicationId, meta);
  return { previousStatus, commissionCredited, commissionReversed };
}
const db = loadDb();
function ensureWallet(userId) {
  if (!db.wallets[userId]) db.wallets[userId] = { userId, balance: 0, creditLimit: 0, pendingSettlement: 0, createdAt: now(), updatedAt: now() };
  return db.wallets[userId];
}
for (const user of db.users) ensureWallet(user.id);
seedAdmin(db);
seedServices(db);
saveDb(db);


let googleAccessToken = null;
let googleAccessTokenExpiresAt = 0;
let googleTabsReady = false;

function googleServiceAccount() {
  if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_JSON) return null;
  try { return JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON); } catch { throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON"); }
}

async function googleToken() {
  const account = googleServiceAccount();
  if (!account?.client_email || !account?.private_key) throw new Error("Google service account credentials are incomplete");
  if (googleAccessToken && Date.now() < googleAccessTokenExpiresAt - 60_000) return googleAccessToken;
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claim = Buffer.from(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString("base64url");
  const unsigned = `${header}.${claim}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(account.private_key, "base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error(data.error_description || "Google authentication failed");
  googleAccessToken = data.access_token;
  googleAccessTokenExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return googleAccessToken;
}

async function googleSheetsApi(pathName, method = "GET", body) {
  const token = await googleToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}${pathName}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || "Google Sheets request failed");
  return data;
}

async function ensureGoogleTabs() {
  if (googleTabsReady || !GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_JSON) return;
  const info = await googleSheetsApi("");
  const existing = new Set((info.sheets || []).map(x => x.properties?.title));
  const wanted = [GOOGLE_SHEET_TAB_USERS, GOOGLE_SHEET_TAB_APPLICATIONS, GOOGLE_SHEET_TAB_PAYMENTS, GOOGLE_SHEET_TAB_AUDIT];
  const newTabs = wanted.filter(t => !existing.has(t));
  const requests = newTabs.map(title => ({ addSheet: { properties: { title } } }));
  if (requests.length) await googleSheetsApi(":batchUpdate", "POST", { requests });
  const headers = {
    [GOOGLE_SHEET_TAB_USERS]: ["id","name","businessName","email","mobile","role","status","kycStatus","createdAt"],
    [GOOGLE_SHEET_TAB_APPLICATIONS]: ["applicationId","userId","retailerName","serviceId","serviceName","category","customerPrice","commission","status","paymentId","orderId","createdAt","updatedAt"],
    [GOOGLE_SHEET_TAB_PAYMENTS]: ["paymentId","applicationId","userId","amount","mode","status","orderId","gatewayPaymentId","createdAt","paidAt"],
    [GOOGLE_SHEET_TAB_AUDIT]: ["id","actorId","actorName","action","entity","entityId","meta","createdAt"],
  };
  for (const tab of newTabs) {
    const row = headers[tab];
    await googleSheetsApi(`/values/${encodeURIComponent(tab)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, "POST", { values: [row] });
  }
  googleTabsReady = true;
}

async function syncSheet(tab, row) {
  if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_JSON) return;
  try {
    await ensureGoogleTabs();
    await googleSheetsApi(`/values/${encodeURIComponent(tab)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, "POST", { values: [row] });
  } catch (error) {
    console.error(`Google Sheets sync failed (${tab}):`, error.message);
  }
}

function sheetUser(user) {
  return [user.id,user.name,user.businessName,user.email,user.mobile,user.role,user.status,user.kycStatus,user.createdAt];
}
function sheetApplication(app) {
  return [app.applicationId,app.userId,app.retailerName,app.serviceId,app.serviceName,app.category,app.customerPrice,app.commission,app.status,app.paymentId || "",app.orderId || "",app.createdAt,app.updatedAt];
}
function sheetPayment(payment) {
  return [payment.paymentId,payment.applicationId,payment.userId,payment.amount,payment.mode,payment.status,payment.orderId || "",payment.gatewayPaymentId || "",payment.createdAt,payment.paidAt || ""];
}
function sheetAudit(log) {
  return [log.id,log.actorId,log.actorName,log.action,log.entity,log.entityId,JSON.stringify(log.meta || {}),log.createdAt];
}

async function supabaseRequest(pathName, method = "GET", body, { admin = false } = {}) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase is not configured");
  const key = admin ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  if (admin && !key) throw new Error("Supabase service role key is not configured");
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const response = await fetch(`${SUPABASE_URL}${pathName}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || data?.error || "Supabase request failed");
  return data;
}

async function supabaseAdminCreateUser({ email, password, name, businessName, mobile }) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase service role key is not configured");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email, password, email_confirm: false,
      user_metadata: { name, businessName: businessName || name, mobile, role: "retailer" },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || data?.error || "Supabase could not create the account");
  return data;
}

async function supabaseAdminGetUser(userId) {
  return supabaseRequest(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, "GET", undefined, { admin: true });
}

async function supabaseAdminFindUserByEmail(email) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase service role key is not configured");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || data?.error || "Supabase user lookup failed");
  const users = Array.isArray(data?.users) ? data.users : [];
  return users.find(u => String(u.email || "").trim().toLowerCase() === email.toLowerCase()) || null;
}

function promotePendingSignup(db, pending, authUser) {
  if (!pending || !authUser?.id) return null;
  const existing = db.users.find(u => u.supabaseUserId === authUser.id || String(u.email || "").toLowerCase() === pending.email.toLowerCase());
  if (existing) {
    existing.supabaseUserId = authUser.id;
    existing.emailVerifiedAt = existing.emailVerifiedAt || now();
    existing.mobile = normalizeIndianMobile(existing.mobile || pending.mobile);
    existing.name = existing.name || pending.name;
    existing.businessName = existing.businessName || pending.businessName;
    db.pendingSignups = db.pendingSignups.filter(x => x.id !== pending.id);
    return existing;
  }
  const user = { id: id("USR"), supabaseUserId: authUser.id, name: pending.name, businessName: pending.businessName, email: pending.email, mobile: normalizeIndianMobile(pending.mobile), role: "retailer", status: "active", kycStatus: "pending", passwordHash: pending.passwordHash, createdAt: now(), emailVerifiedAt: now() };
  db.users.push(user);
  ensureWallet(user.id);
  db.pendingSignups = db.pendingSignups.filter(x => x.id !== pending.id);
  audit(db, user, "SIGNUP_EMAIL_VERIFIED", "user", user.id);
  syncSheet(GOOGLE_SHEET_TAB_USERS, sheetUser(user));
  return user;
}

async function supabasePasswordLogin(email, password) {
  return supabaseRequest(`/auth/v1/token?grant_type=password`, "POST", { email, password });
}

async function razorpayRequest(endpoint, method, body) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) throw new Error("Razorpay keys are not configured");
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1/${endpoint}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.description || "Razorpay request failed");
  return data;
}

export async function handleRequest(req, res) {
  res._req = req;
  if (req.method === "OPTIONS") return send(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathName = url.pathname;

  try {
    if (pathName === "/api/health" && req.method === "GET") {
      return send(res, 200, {
        ok: true, service: "LD SERVICE ZONE API",
        paymentMode: RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET ? "razorpay" : "demo",
        integrations: { pay2all: Boolean(PAY2ALL_API_KEY), supabaseAuth: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY), googleSheets: Boolean(GOOGLE_SHEET_ID && GOOGLE_SERVICE_ACCOUNT_JSON), razorpay: Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) }
      });
    }


    if (pathName === "/api/auth/signup" && req.method === "POST") {
      const clientIp = getClientIp(req);
      const signupLimit = checkRateLimit(`signup:${clientIp}`, 5, 15 * 60_000);
      if (signupLimit.limited) return send(res, 429, { error: `Too many registration attempts. Please try again in ${signupLimit.retryAfter} seconds.` });

      const input = await parseJson(req);
      const name = String(input.name || "").trim();
      const email = String(input.email || "").trim().toLowerCase();
      const mobile = normalizeIndianMobile(input.mobile);
      const password = String(input.password || "");
      const businessName = String(input.businessName || "").trim();
      if (!name || !businessName || !email || !mobile || password.length < 8) return send(res, 400, { error: "Full name, business name, email, Indian mobile number and an 8+ character password are required" });
      if (!isEmail(email)) return send(res, 400, { error: "Enter a valid Gmail/email address" });
      const localEmailExists = db.users.some(u => String(u.email || "").trim().toLowerCase() === email);
      if (localEmailExists) return send(res, 409, { error: "This email is already registered. Use a different email." });
      const localMobileExists = db.users.some(u => normalizeIndianMobile(u.mobile) === mobile);
      if (localMobileExists) return send(res, 409, { error: "This mobile number is already registered. Use a different number." });
      const pendingExists = db.pendingSignups.some(x => x.email === email || normalizeIndianMobile(x.mobile) === mobile);
      if (pendingExists) return send(res, 409, { error: "A signup is already pending for this email. Check your inbox and enter the verification code." });
      try {
        // Create the real Auth user first, using the server-only service-role key.
        // This avoids the previous failure mode where /auth/v1/signup created a Supabase
        // user but the follow-up OTP request failed, leaving no local pending record.
        let supabaseUser = await supabaseAdminCreateUser({ email, password, name, businessName, mobile });
        if (!supabaseUser?.id) throw new Error("Supabase did not return a user id after account creation");

        const pending = { id: id("PSU"), supabaseUserId: supabaseUser.id, name, businessName, email, mobile, passwordHash: hashPassword(password), createdAt: now(), emailVerified: false };
        db.pendingSignups.push(pending);
        saveDb(db);

        // Send the verification OTP after the Auth user and local pending record exist.
        try {
          await supabaseRequest("/auth/v1/otp", "POST", { email, create_user: false });
          return send(res, 201, { pending: true, supabaseUserId: supabaseUser.id, email, message: "Account created in Supabase. A verification code was sent to your email. Enter the code from your Gmail inbox below." });
        } catch (otpError) {
          console.error("Supabase verification email:", String(otpError?.message || otpError));
          return send(res, 201, { pending: true, supabaseUserId: supabaseUser.id, email, message: "Account created in Supabase, but the verification email could not be sent yet. Use Resend verification after checking your Supabase Email/SMTP settings." });
        }
      } catch (error) {
        const message = String(error?.message || error);
        if (/already registered|already exists|user already exists|email.*taken/i.test(message)) {
          // Recover an unconfirmed Supabase account created by an earlier failed attempt.
          try {
            const existing = await supabaseAdminFindUserByEmail(email);
            if (existing?.id && !existing.email_confirmed_at) {
              const pending = { id: id("PSU"), supabaseUserId: existing.id, name, businessName, email, mobile, passwordHash: hashPassword(password), createdAt: now(), emailVerified: false };
              db.pendingSignups.push(pending);
              saveDb(db);
              try { await supabaseRequest("/auth/v1/otp", "POST", { email, create_user: false }); } catch (otpError) { console.error("Supabase verification resend:", String(otpError?.message || otpError)); }
              return send(res, 201, { pending: true, supabaseUserId: existing.id, email, message: "Your Supabase account already existed but was not verified. We restored the signup and sent a new verification code." });
            }
          } catch (lookupError) {
            console.error("Supabase existing-user recovery:", String(lookupError?.message || lookupError));
          }
          return send(res, 409, { error: "This email is already registered. Use Sign in or Forgot password." });
        }
        return send(res, 400, { error: message });
      }
    }

    if (pathName === "/api/auth/signup/verify-email" && req.method === "POST") {
      const clientIp = getClientIp(req);
      const verifyLimit = checkRateLimit(`verify:${clientIp}`, 10, 15 * 60_000);
      if (verifyLimit.limited) return send(res, 429, { error: `Too many verification attempts. Please try again in ${verifyLimit.retryAfter} seconds.` });

      const input = await parseJson(req);
      const email = String(input.email || "").trim().toLowerCase();
      const code = String(input.code || input.otp || "").trim();
      if (!email || !/^\d{6}$/.test(code)) return send(res, 400, { error: "Enter the 6-digit email verification code" });
      const pending = db.pendingSignups.find(x => x.email === email);
      if (!pending) return send(res, 404, { error: "No pending signup found for this email" });
      let authData;
      try { authData = await supabaseRequest("/auth/v1/verify", "POST", { type: "email", email, token: code }); }
      catch (error) { return send(res, 400, { error: String(error?.message || error) }); }
      const authUser = authData?.user || (pending.supabaseUserId ? await supabaseAdminGetUser(pending.supabaseUserId) : null);
      const user = promotePendingSignup(db, pending, authUser);
      if (!user) return send(res, 400, { error: "Supabase email verification succeeded, but the account could not be linked locally. Contact admin." });
      saveDb(db);
      return send(res, 201, { user: sanitizeUser(user), message: "Email verified successfully. Your Supabase account is ready. You can now sign in." });
    }

    if (pathName === "/api/auth/signup/resend-email" && req.method === "POST") {
      const clientIp = getClientIp(req);
      const resendLimit = checkRateLimit(`resend:${clientIp}`, 3, 15 * 60_000);
      if (resendLimit.limited) return send(res, 429, { error: `Too many resend requests. Please wait ${resendLimit.retryAfter} seconds before trying again.` });

      const input = await parseJson(req);
      const email = String(input.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: "Enter a valid email address" });
      const pending = db.pendingSignups.find(x => x.email === email);
      if (!pending) return send(res, 404, { error: "No pending signup found for this email" });
      try { await supabaseRequest("/auth/v1/otp", "POST", { email, create_user: false }); return send(res, 200, { ok: true, message: "A new verification code was sent to your email. Check Gmail and spam." }); }
      catch (error) { return send(res, 400, { error: String(error?.message || error) }); }
    }

    if (pathName === "/api/auth/demo-login" && req.method === "POST") {
      // Demo access is disabled by default for production security.
      // Must be explicitly enabled with DEMO_MODE=true in .env for development/testing.
      if (String(process.env.DEMO_MODE || "false").toLowerCase() !== "true") {
        return send(res, 403, { error: "Demo sign-in is disabled. Please use registered retailer credentials or set DEMO_MODE=true in .env for local testing." });
      }
      let user = db.users.find(u => u.email === "demo@ldservicezone.in" && u.role === "retailer");
      if (!user) {
        user = {
          id: id("USR"), supabaseUserId: "", name: "Demo Retailer", businessName: "LD SERVICE ZONE Demo",
          email: "demo@ldservicezone.in", mobile: "6370892501", role: "retailer", status: "active",
          kycStatus: "verified", emailVerifiedAt: now(), passwordHash: hashPassword(crypto.randomBytes(24).toString("hex")), createdAt: now(),
        };
        db.users.push(user);
        ensureWallet(user.id);
      }
      const token = crypto.randomBytes(32).toString("hex");
      db.sessions = db.sessions.filter(s => new Date(s.expiresAt) > new Date());
      db.sessions.push({ id: id("SES"), userId: user.id, tokenHash: crypto.createHash("sha256").update(token).digest("hex"), createdAt: now(), expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000).toISOString() });
      audit(db, user, "DEMO_LOGIN", "user", user.id);
      saveDb(db);
      return send(res, 200, { token, user: sanitizeUser(user), authProvider: "demo" });
    }

    if (pathName === "/api/auth/login" && req.method === "POST") {
      const clientIp = getClientIp(req);
      const loginLimit = checkRateLimit(`login:${clientIp}`, 10, 15 * 60_000);
      if (loginLimit.limited) return send(res, 429, { error: `Too many login attempts. Please try again in ${loginLimit.retryAfter} seconds.` });

      const input = await parseJson(req);
      const credential = String(input.email || input.credential || input.mobile || "").trim();
      const password = String(input.password || "");
      if (!credential || !password) return send(res, 400, { error: "Email/mobile number and password are required" });
      const credentialEmail = isEmail(credential) ? credential.toLowerCase() : "";
      const credentialMobile = credentialEmail ? "" : normalizeIndianMobile(credential);
      if (!credentialEmail && !credentialMobile) return send(res, 400, { error: "Enter a valid email or 10-digit Indian mobile number" });
      let user = db.users.find(u => credentialEmail
        ? String(u.email || "").trim().toLowerCase() === credentialEmail
        : normalizeIndianMobile(u.mobile) === credentialMobile);

      // If the user clicked the Supabase confirmation link instead of entering the OTP,
      // promote the pending signup automatically once Supabase marks the email confirmed.
      const pending = !user && credentialEmail
        ? db.pendingSignups.find(x => String(x.email || "").toLowerCase() === credentialEmail)
        : !user && credentialMobile
          ? db.pendingSignups.find(x => normalizeIndianMobile(x.mobile) === credentialMobile)
          : null;
      if (!user && pending?.supabaseUserId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const confirmedUser = await supabaseAdminGetUser(pending.supabaseUserId);
          if (confirmedUser?.email_confirmed_at) {
            user = promotePendingSignup(db, pending, confirmedUser);
            if (user) saveDb(db);
          }
        } catch (error) {
          console.warn("Could not sync confirmed Supabase signup:", String(error?.message || error));
        }
      }

      let authenticatedWithSupabase = false;
      if (SUPABASE_URL && SUPABASE_ANON_KEY && user?.email) {
        try {
          const authData = await supabasePasswordLogin(user.email, password);
          if (authData?.user?.id && !user.supabaseUserId) { user.supabaseUserId = authData.user.id; saveDb(db); }
          authenticatedWithSupabase = true;
        } catch {
          authenticatedWithSupabase = false;
        }
      }

      if (!authenticatedWithSupabase) {
        if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) return send(res, 401, { error: "Invalid email or password" });
      }
      if (!user) return send(res, 401, { error: "Invalid email or password" });
      if (user.role === "retailer" && !user.emailVerifiedAt) return send(res, 403, { error: "Please verify your email from the verification code sent to your Gmail before signing in" });
      if (user.role === "retailer" && authenticatedWithSupabase) {
        try {
          const authCheck = await supabaseRequest(`/auth/v1/admin/users/${user.supabaseUserId}`, "GET", undefined, { admin: true });
          if (!authCheck?.email_confirmed_at) return send(res, 403, { error: "Please verify your email from the confirmation link sent to your Gmail before signing in" });
        } catch (error) { console.warn("Could not verify Supabase email status:", String(error?.message || error)); }
      }
      if (user.status !== "active") return send(res, 403, { error: `Account is ${user.status}` });

      const token = crypto.randomBytes(32).toString("hex");
      db.sessions = db.sessions.filter(s => new Date(s.expiresAt) > new Date());
      db.sessions.push({ id: id("SES"), userId: user.id, tokenHash: crypto.createHash("sha256").update(token).digest("hex"), createdAt: now(), expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000).toISOString() });
      audit(db, user, authenticatedWithSupabase ? "LOGIN_SUPABASE" : "LOGIN_LEGACY", "user", user.id); saveDb(db);
      return send(res, 200, { token, user: sanitizeUser(user), authProvider: authenticatedWithSupabase ? "supabase" : "legacy" });
    }

    if (pathName === "/api/auth/forgot-password" && req.method === "POST") {
      const input = await parseJson(req);
      const email = String(input.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: "Enter a valid email address" });
      try {
        await supabaseRequest("/auth/v1/recover", "POST", { email, redirect_to: `${PUBLIC_APP_URL}/reset-password` });
      } catch (error) {
        console.error("Password recovery request:", String(error?.message || error));
        // Avoid account enumeration. Return the same response whether or not the email exists.
      }
      return send(res, 200, { ok: true, message: "If an account exists for this email, a password reset link has been sent." });
    }

    if (pathName === "/api/auth/reset-password" && req.method === "POST") {
      const input = await parseJson(req);
      const accessToken = String(input.accessToken || "");
      const password = String(input.password || "");
      if (!accessToken || password.length < 8) return send(res, 400, { error: "A valid reset session and an 8+ character password are required" });
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { method: "PUT", headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return send(res, 400, { error: data?.msg || data?.message || data?.error_description || "Unable to reset password" });
      return send(res, 200, { ok: true, message: "Password updated successfully. You can now sign in." });
    }

    if (pathName === "/api/kyc" && req.method === "GET") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      const k = auth.user.kyc || {};
      return send(res, 200, { kyc: { ...k, aadhaar: decrypt(k.aadhaar), pan: decrypt(k.pan), bankAccount: decrypt(k.bankAccount) } });
    }

    if (pathName === "/api/kyc" && req.method === "POST") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      if (auth.user.kycStatus === "verified") return send(res, 409, { error: "KYC is already verified. Contact admin to request changes." });
      const input = await parseJson(req);
      const fullName=String(input.fullName||"").trim(), dob=String(input.dob||"").trim(), pan=String(input.pan||"").trim().toUpperCase();
      const aadhaar=String(input.aadhaar||"").replace(/\D/g, ""), address=String(input.address||"").trim(), city=String(input.city||"").trim(), state=String(input.state||"").trim(), pincode=String(input.pincode||"").trim();
      const bankAccount=String(input.bankAccount||"").replace(/\s/g, ""), ifsc=String(input.ifsc||"").trim().toUpperCase(), accountHolder=String(input.accountHolder||"").trim();
      if (!fullName || !dob || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan) || !/^\d{12}$/.test(aadhaar) || !address || !city || !state || !/^\d{6}$/.test(pincode) || !bankAccount || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc) || !accountHolder) return send(res,400,{error:"Please complete all required KYC fields with valid PAN, Aadhaar, PIN and IFSC details"});
      const docs=input.documents && typeof input.documents === "object" ? input.documents : {};
      const allowed=["application/pdf","image/jpeg","image/png","image/webp"];
      const requiredDocs=["panCard","aadhaarCard","selfie","bankProof"];
      for(const name of requiredDocs){ const d=docs[name]; if(!d?.data || !allowed.includes(d.mimeType)) return send(res,400,{error:`${name} document is required`}); const raw=String(d.data).replace(/^data:[^;]+;base64,/,''); const buf=Buffer.from(raw,'base64'); if(buf.length>5*1024*1024)return send(res,413,{error:"Each KYC document must be 5 MB or smaller"}); }
      const userDir=path.join(kycDir,auth.user.id); fs.mkdirSync(userDir,{recursive:true}); const storedDocs={};
      for(const name of requiredDocs){ const d=docs[name]; const clean=String(d.fileName||name).replace(/[^a-zA-Z0-9._-]/g,"_"); const stored=`${crypto.randomBytes(6).toString("hex")}-${clean}`; fs.writeFileSync(path.join(userDir,stored),Buffer.from(String(d.data).replace(/^data:[^;]+;base64,/,'') ,'base64')); storedDocs[name]={fileName:clean,storageName:stored,mimeType:d.mimeType,size:fs.statSync(path.join(userDir,stored)).size,uploadedAt:now()}; }
      auth.user.kyc={fullName,dob,aadhaar:encrypt(aadhaar),pan:encrypt(pan),address,city,state,pincode,bankAccount:encrypt(bankAccount),ifsc,accountHolder,documents:storedDocs,submittedAt:now(),reviewedAt:null,adminNote:""};
      auth.user.kycStatus="pending"; auth.user.updatedAt=now(); audit(db,auth.user,"KYC_SUBMITTED","user",auth.user.id); saveDb(db); syncSheet(GOOGLE_SHEET_TAB_USERS,sheetUser(auth.user));
      return send(res,201,{kyc:{...auth.user.kyc,aadhaar:aadhaar.replace(/\d(?=\d{4})/g,"*"),pan:"*****"+pan.slice(-1),bankAccount:"******"+bankAccount.slice(-4)},message:"KYC submitted successfully. Your documents are now under review."});
    }

    if (pathName === "/api/auth/me" && req.method === "GET") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      return send(res, 200, { user: sanitizeUser(auth.user) });
    }

    if (pathName === "/api/auth/logout" && req.method === "POST") {
      const token = bearer(req); db.sessions = db.sessions.filter(s => s.tokenHash !== crypto.createHash("sha256").update(token).digest("hex")); saveDb(db); return send(res, 200, { ok: true });
    }

    if (pathName === "/api/auth/activity" && req.method === "GET") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      return send(res, 200, { logs: db.auditLogs.filter(x => x.actorId === auth.user.id).slice(0, 50) });
    }

    if (pathName === "/api/services" && req.method === "GET") {
      return send(res, 200, { services: db.services || [] });
    }

    if (pathName === "/api/services" && req.method === "POST") {
      const auth = requireAuth(req, res, db, "admin"); if (!auth) return;
      const input = await parseJson(req);
      const name = String(input.name || "").trim();
      const category = String(input.category || "Other").trim();
      const processingTime = String(input.processingTime || "").trim();
      const documents = Array.isArray(input.documents) ? input.documents.map(x => String(x).trim()).filter(Boolean) : [];
      const customerPrice = Number(input.customerPrice);
      const commission = Number(input.commission);
      if (!name || !category || !processingTime || !Number.isFinite(customerPrice) || customerPrice < 0 || !Number.isFinite(commission) || commission < 0) return send(res, 400, { error: "Name, category, processing time, customer price and commission are required" });
      const service = { id: String(input.id || id("SVC")), name, category, processingTime, customerPrice, commission, documents, color: String(input.color || "#4F46E5"), createdAt: now(), updatedAt: now() };
      if (db.services.some(s => s.id === service.id)) return send(res, 409, { error: "Service ID already exists" });
      db.services.unshift(service);
      audit(db, auth.user, "SERVICE_CREATED", "service", service.id, { name: service.name, category: service.category });
      saveDb(db);
      return send(res, 201, { service });
    }

    if (pathName.match(/^\/api\/services\/[^/]+$/) && req.method === "PATCH") {
      const auth = requireAuth(req, res, db, "admin"); if (!auth) return;
      const serviceId = pathName.split("/").pop();
      const service = db.services.find(s => s.id === serviceId);
      if (!service) return send(res, 404, { error: "Service not found" });
      const input = await parseJson(req);
      for (const field of ["name", "category", "processingTime"]) if (input[field] !== undefined) service[field] = String(input[field]).trim();
      for (const field of ["customerPrice", "commission"]) if (input[field] !== undefined) { const n = Number(input[field]); if (!Number.isFinite(n) || n < 0) return send(res, 400, { error: `Invalid ${field}` }); service[field] = n; }
      if (input.documents !== undefined) { if (!Array.isArray(input.documents)) return send(res, 400, { error: "documents must be an array" }); service.documents = input.documents.map(x => String(x).trim()).filter(Boolean); }
      if (input.color !== undefined) service.color = String(input.color || "#4F46E5");
      if (!service.name || !service.category || !service.processingTime) return send(res, 400, { error: "Name, category and processing time are required" });
      service.updatedAt = now();
      audit(db, auth.user, "SERVICE_UPDATED", "service", service.id, { name: service.name, category: service.category });
      saveDb(db);
      return send(res, 200, { service });
    }

    if (pathName === "/api/applications" && req.method === "GET") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      let apps = db.applications;
      if (auth.user.role !== "admin") apps = apps.filter(a => a.userId === auth.user.id);
      return send(res, 200, { applications: apps.map(publicApplication) });
    }

    if (pathName === "/api/applications" && req.method === "POST") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      const input = await parseJson(req);
      if (!input.serviceId || !input.serviceName || !input.applicant) return send(res, 400, { error: "Service and applicant details are required" });
      const applicant = Object.fromEntries(Object.entries(input.applicant).map(([k, v]) => [k, typeof v === "string" && /aadhaar/i.test(k) ? encrypt(v) : v]));
      const application = {
        applicationId: id("APP"), userId: auth.user.id, retailerName: auth.user.name, serviceId: input.serviceId, serviceName: input.serviceName,
        category: input.category || "Government", customerPrice: Number(input.customerPrice || 0), commission: Number(input.commission || 0), applicant,
        documents: Array.isArray(input.documents) ? input.documents : [], status: "payment_pending", adminNote: "", createdAt: now(), updatedAt: now(), paymentId: null, orderId: null,
      };
      db.applications.unshift(application); audit(db, auth.user, "APPLICATION_CREATED", "application", application.applicationId); saveDb(db);
      syncSheet(GOOGLE_SHEET_TAB_APPLICATIONS, sheetApplication(application));
      return send(res, 201, { application: publicApplication(application) });
    }

    if (pathName.match(/^\/api\/applications\/[^/]+\/documents$/) && req.method === "POST") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      const applicationId = pathName.split("/")[3];
      const app = db.applications.find(a => a.applicationId === applicationId);
      if (!app || (auth.user.role !== "admin" && app.userId !== auth.user.id)) return send(res, 404, { error: "Application not found" });
      const input = await parseJson(req);
      const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
      if (!input.documentName || !input.fileName || !input.data || !allowed.includes(input.mimeType)) return send(res, 400, { error: "Document name, filename, supported MIME type and file data are required" });
      const cleanName = String(input.fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
      const raw = String(input.data).replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(raw, "base64");
      if (buffer.length > 5 * 1024 * 1024) return send(res, 413, { error: "Each document must be 5 MB or smaller" });
      const dir = path.join(uploadDir, app.applicationId); fs.mkdirSync(dir, { recursive: true });
      const stored = `${crypto.randomBytes(4).toString("hex")}-${cleanName}`; fs.writeFileSync(path.join(dir, stored), buffer);
      const doc = (app.documents || []).find(d => d.name === input.documentName);
      if (doc) { doc.fileName = cleanName; doc.storageName = stored; doc.mimeType = input.mimeType; doc.size = buffer.length; doc.uploadedAt = now(); }
      app.updatedAt = now(); audit(db, auth.user, "DOCUMENT_UPLOADED", "application", app.applicationId, { documentName: input.documentName }); saveDb(db);
      return send(res, 201, { document: { name: input.documentName, fileName: cleanName, size: buffer.length } });
    }

    if (pathName.match(/^\/api\/applications\/[^/]+\/documents\/[^/]+$/) && req.method === "GET") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      const parts = pathName.split("/"); const applicationId = parts[3]; const docName = decodeURIComponent(parts[5] || "");
      const app = db.applications.find(a => a.applicationId === applicationId);
      if (!app || (auth.user.role !== "admin" && app.userId !== auth.user.id)) return send(res, 404, { error: "Application not found" });
      const doc = (app.documents || []).find(d => d.name === docName && d.storageName);
      if (!doc) return send(res, 404, { error: "Document not found" });
      const file = path.join(uploadDir, app.applicationId, doc.storageName);
      if (!fs.existsSync(file)) return send(res, 404, { error: "Stored file not found" });
      res.writeHead(200, { "Content-Type": doc.mimeType || "application/octet-stream", "Content-Disposition": `inline; filename="${doc.fileName}"`, "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*" });
      return fs.createReadStream(file).pipe(res);
    }

    if (pathName.match(/^\/api\/applications\/[^/]+$/) && req.method === "PATCH") {
      const auth = requireAuth(req, res, db, "admin"); if (!auth) return;
      const applicationId = pathName.split("/").pop();
      const app = db.applications.find(a => a.applicationId === applicationId);
      if (!app) return send(res, 404, { error: "Application not found" });
      const input = await parseJson(req);
      try { updateApplicationByAdmin(db, app, input, auth.user); } catch (error) { return send(res, 400, { error: error.message }); }
      saveDb(db);
      syncSheet(GOOGLE_SHEET_TAB_APPLICATIONS, sheetApplication(app));
      return send(res, 200, { application: publicApplication(app) });
    }

    if (pathName === "/api/payments/create-order" && req.method === "POST") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      const input = await parseJson(req);
      const app = db.applications.find(a => a.applicationId === input.applicationId && a.userId === auth.user.id);
      if (!app) return send(res, 404, { error: "Application not found" });
      const amount = Math.round(Number(app.customerPrice) * 100);
      if (amount <= 0) {
        app.status = "submitted"; app.updatedAt = now(); saveDb(db);
        return send(res, 200, { mode: "free", application: publicApplication(app) });
      }
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return send(res, 503, { error: "Razorpay is not configured" });
      const order = await razorpayRequest("orders", "POST", { amount, currency: "INR", receipt: app.applicationId, notes: { applicationId: app.applicationId, userId: auth.user.id } });
      const paymentRecord = { paymentId: id("PAY"), applicationId: app.applicationId, userId: auth.user.id, amount: Number(app.customerPrice), mode: "razorpay", status: "created", orderId: order.id, createdAt: now() };
      db.payments.unshift(paymentRecord);
      syncSheet(GOOGLE_SHEET_TAB_PAYMENTS, sheetPayment(paymentRecord));
      app.orderId = order.id; saveDb(db);
      return send(res, 200, { mode: "razorpay", keyId: RAZORPAY_KEY_ID, orderId: order.id, amount: order.amount, currency: order.currency, application: publicApplication(app) });
    }


    if (pathName === "/api/payments/verify" && req.method === "POST") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      const input = await parseJson(req);
      const app = db.applications.find(a => a.applicationId === input.applicationId && a.userId === auth.user.id);
      if (!app || !input.razorpay_order_id || !input.razorpay_payment_id || !input.razorpay_signature) return send(res, 400, { error: "Payment verification data is incomplete" });
      const signature = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`).digest("hex");
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(input.razorpay_signature))) return send(res, 400, { error: "Invalid payment signature" });
      app.status = "submitted"; app.paymentId = input.razorpay_payment_id; app.orderId = input.razorpay_order_id; app.updatedAt = now();
      const payment = db.payments.find(p => p.orderId === input.razorpay_order_id); if (payment) { payment.status = "paid"; payment.gatewayPaymentId = input.razorpay_payment_id; payment.paidAt = now(); }
      audit(db, auth.user, "PAYMENT_SUCCESS", "application", app.applicationId); saveDb(db);
      syncSheet(GOOGLE_SHEET_TAB_PAYMENTS, sheetPayment(payment || { paymentId: app.paymentId, applicationId: app.applicationId, userId: auth.user.id, amount: app.customerPrice, mode: "razorpay", status: "paid", orderId: app.orderId, gatewayPaymentId: app.paymentId, createdAt: now(), paidAt: now() }));
      syncSheet(GOOGLE_SHEET_TAB_APPLICATIONS, sheetApplication(app));
      return send(res, 200, { application: publicApplication(app), message: "Payment verified successfully" });
    }

    if (pathName === "/api/payments/webhook" && req.method === "POST") {
      const rawBody = await readRawBody(req);
      const webhookSignature = req.headers["x-razorpay-signature"] || "";
      if (RAZORPAY_WEBHOOK_SECRET) {
        const expected = crypto.createHmac("sha256", RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
        if (!webhookSignature || expected !== webhookSignature) return send(res, 400, { error: "Invalid webhook signature" });
      }
      const raw = JSON.parse(rawBody || "{}");
      if (raw.event === "payment.captured" && raw.payload?.payment?.entity?.order_id) {
        const orderId = raw.payload.payment.entity.order_id;
        const gatewayPaymentId = raw.payload.payment.entity.id;
        const payment = db.payments.find(p => p.orderId === orderId);

        if (payment && payment.status !== "paid") {
          payment.status = "paid";
          payment.gatewayPaymentId = gatewayPaymentId;
          payment.paidAt = now();

          // Handle application fee payment
          if (payment.applicationId) {
            const app = db.applications.find(a => a.applicationId === payment.applicationId);
            if (app) {
              app.status = "submitted";
              app.paymentId = gatewayPaymentId;
              app.updatedAt = now();
              syncSheet(GOOGLE_SHEET_TAB_APPLICATIONS, sheetApplication(app));
            }
          }

          // Handle wallet top-up payment
          if (payment.mode === "razorpay_wallet" || raw.payload.payment.entity.notes?.type === "wallet_topup") {
            const wallet = ensureWallet(payment.userId);
            wallet.balance = Number((wallet.balance + Number(payment.amount)).toFixed(2));
            wallet.updatedAt = now();
            db.walletLedger.unshift({
              id: id("WL"),
              userId: payment.userId,
              type: "credit",
              amount: Number(payment.amount),
              reference: payment.paymentId,
              description: "Razorpay wallet top-up (webhook)",
              status: "success",
              createdAt: now(),
              balanceAfter: wallet.balance,
            });
            audit(db, { id: payment.userId, name: "Webhook" }, "WALLET_TOPUP_WEBHOOK", "wallet", payment.userId, { amount: payment.amount });
          }

          saveDb(db);
          syncSheet(GOOGLE_SHEET_TAB_PAYMENTS, sheetPayment(payment));
        }
      }
      return send(res, 200, { received: true });
    }

    if (pathName === "/api/wallet" && req.method === "GET") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      const wallet = ensureWallet(auth.user.id);
      const today = new Date(); today.setHours(0,0,0,0);
      const ledger = db.walletLedger.filter(x => x.userId === auth.user.id);
      const todayCredit = ledger.filter(x => x.type === "credit" && new Date(x.createdAt) >= today).reduce((n,x)=>n+Number(x.amount||0),0);
      const todayDebit = ledger.filter(x => x.type === "debit" && new Date(x.createdAt) >= today).reduce((n,x)=>n+Number(x.amount||0),0);
      return send(res, 200, { wallet: { ...wallet, todayInflow: todayCredit, todayOutflow: todayDebit } });
    }

    if (pathName === "/api/wallet/ledger" && req.method === "GET") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 25)));
      const rows = db.walletLedger.filter(x => x.userId === auth.user.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      const total = rows.length;
      return send(res, 200, { ledger: rows.slice((page-1)*limit, page*limit), page, limit, total });
    }

    if (pathName === "/api/wallet/create-order" && req.method === "POST") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return send(res, 503, { error: "Razorpay is not configured" });
      const input = await parseJson(req); const amount = Math.round(Number(input.amount || 0) * 100);
      if (amount < 100) return send(res, 400, { error: "Minimum wallet top-up is ₹1" });
      const receipt = `WALLET-${auth.user.id}-${Date.now()}`;
      const order = await razorpayRequest("orders", "POST", { amount, currency: "INR", receipt, notes: { userId: auth.user.id, type: "wallet_topup" } });
      const payment = { paymentId: id("PAY"), applicationId: null, userId: auth.user.id, amount: amount/100, mode: "razorpay_wallet", status: "created", orderId: order.id, createdAt: now() };
      db.payments.unshift(payment); saveDb(db); syncSheet(GOOGLE_SHEET_TAB_PAYMENTS, sheetPayment(payment));
      return send(res, 200, { mode: "razorpay", keyId: RAZORPAY_KEY_ID, orderId: order.id, amount: order.amount, currency: order.currency, paymentId: payment.paymentId });
    }

    if (pathName === "/api/wallet/verify" && req.method === "POST") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      const input = await parseJson(req);
      if (!input.razorpay_order_id || !input.razorpay_payment_id || !input.razorpay_signature) return send(res, 400, { error: "Payment verification data is incomplete" });
      const signature = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`).digest("hex");
      const a = Buffer.from(signature); const b = Buffer.from(String(input.razorpay_signature));
      if (a.length !== b.length || !crypto.timingSafeEqual(a,b)) return send(res, 400, { error: "Invalid payment signature" });
      const payment = db.payments.find(p => p.orderId === input.razorpay_order_id && p.userId === auth.user.id && p.mode === "razorpay_wallet");
      if (!payment) return send(res, 404, { error: "Wallet payment not found" });
      if (payment.status !== "paid") {
        payment.status = "paid"; payment.gatewayPaymentId = input.razorpay_payment_id; payment.paidAt = now();
        const wallet = ensureWallet(auth.user.id); wallet.balance += Number(payment.amount); wallet.updatedAt = now();
        db.walletLedger.unshift({ id:id("WL"), userId:auth.user.id, type:"credit", amount:Number(payment.amount), reference:payment.paymentId, description:"Razorpay wallet top-up", status:"success", createdAt:now(), balanceAfter:wallet.balance });
        audit(db, auth.user, "WALLET_TOPUP", "wallet", auth.user.id, { amount: payment.amount, paymentId: payment.paymentId }); saveDb(db);
        syncSheet(GOOGLE_SHEET_TAB_PAYMENTS, sheetPayment(payment));
      }
      return send(res, 200, { ok:true, wallet:ensureWallet(auth.user.id), payment });
    }

    if (pathName === "/api/recharge/providers" && req.method === "GET") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      if (!pay2allConfigured()) return send(res, 503, { error: "Pay2All recharge service is not configured" });
      const result = await getProviders(); return send(res, 200, result);
    }

    if (pathName === "/api/recharge/plans" && req.method === "GET") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      const result = await getPlans(url.searchParams.get("operator"), url.searchParams.get("circle")); return send(res, 200, result);
    }

    if (pathName === "/api/recharge/detect" && req.method === "POST") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      if (!pay2allConfigured()) return send(res, 503, { error: "Pay2All recharge service is not configured" });
      const input = await parseJson(req);
      try {
        const detected = await detectOperatorCircle(input.mobile);
        const providersResult = await getProviders();
        const allProviders = (providersResult.data?.services || []).flatMap(s => (s.providers || []).map(p => ({...p, service:s.service, code:p.code || s.code})));
        const wanted = String(detected.operator).toLowerCase().replace(/[^a-z0-9]/g, "");
        const rawWanted = String(detected.operator).toLowerCase().trim();
        const provider = allProviders.find(p => {
          const n = String(p.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const c = String(p.code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          return n === wanted || c === wanted;
        }) || allProviders.find(p => {
          const n = String(p.name || "").toLowerCase();
          return new RegExp(`\\b${rawWanted}\\b`, "i").test(n);
        });
        if (!provider) return send(res, 422, { error: `Detected operator "${detected.operator}" but it is not available in your Pay2All provider catalogue. Please select manually.`, detected });
        return send(res, 200, { detected, provider: { provider_id: provider.provider_id, name: provider.name, code: provider.code } });
      } catch (e) {
        return send(res, 422, { error: e?.message || "Could not auto-detect operator and circle" });
      }
    }

    if (pathName === "/api/recharge" && req.method === "POST") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      if (!pay2allConfigured()) return send(res, 503, { error: "Recharge service is not configured — contact admin" });
      const input = await parseJson(req);
      const mobile = String(input.mobile || "").replace(/\D/g, ""); const amount = Number(input.amount || 0); const providerId = Number(input.providerId || 0);
      if (!/^\d{10,18}$/.test(mobile)) return send(res,400,{error:"Enter a valid mobile or DTH subscriber number"});
      if (!providerId || amount <= 0) return send(res,400,{error:"Operator and a valid recharge amount are required"});
      const wallet = ensureWallet(auth.user.id);
      if (Number(wallet.balance) < amount) return send(res, 400, { error: "Insufficient wallet balance" });
      const providerResult = await initiateRecharge(mobile, input.operator, input.circle, amount, providerId, input.type, input.customerMobile);
      const statusId = Number(providerResult.status_id);
      const status = statusId === 1 ? "success" : statusId === 2 ? "failed" : "pending";
      const providerCommission = Number(providerResult.data?.commission || providerResult.commission || 0);
      const userCommission = status === "success" ? Number((providerCommission / 2).toFixed(2)) : 0;
      const adminCommission = status === "success" ? Number((providerCommission - userCommission).toFixed(2)) : 0;
      const tx = { id:id("RC"), clientId:providerResult.clientId, providerTxnId:providerResult.data?.txn_id || null, userId:auth.user.id, mobile, operator:String(input.operator||""), circle:String(input.circle||""), providerId, type:input.type === "DTH" ? "DTH" : "MOBILE", amount, providerCommission, userCommission, adminCommission, commission:providerCommission, commissionCredited:false, status, message:providerResult.message||"", createdAt:now(), updatedAt:now() };
      if (status === "success" || status === "pending") {
        wallet.balance -= amount; wallet.updatedAt = now();
        db.walletLedger.unshift({ id:id("WL"), userId:auth.user.id, type:"debit", amount, reference:tx.id, description:`${tx.type} recharge - ${tx.operator || "provider"}`, status, createdAt:now(), balanceAfter:wallet.balance });
      }
      if (status === "success" && providerCommission > 0) {
        wallet.balance += userCommission; wallet.updatedAt = now();
        db.walletLedger.unshift({ id:id("WL"), userId:auth.user.id, type:"credit", amount:userCommission, reference:tx.id, description:"50% recharge commission", status:"success", createdAt:now(), balanceAfter:wallet.balance });
        db.commissionLedger.unshift({ id:id("CM"), rechargeId:tx.id, userId:auth.user.id, providerCommission, userCommission, adminCommission, createdAt:now() });
        tx.commissionCredited = true;
      }
      if (status === "failed") tx.refunded = true;
      db.rechargeTransactions.unshift(tx); audit(db,auth.user,"RECHARGE_INITIATED","recharge",tx.id,{status,operator:tx.operator,amount}); saveDb(db);
      return send(res, 200, { transaction:tx, provider:providerResult, wallet });
    }

    if (pathName.match(/^\/api\/recharge\/status\/[^/]+$/) && req.method === "GET") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      const clientId = decodeURIComponent(pathName.split("/").pop());
      const tx = db.rechargeTransactions.find(x=>x.clientId===clientId && x.userId===auth.user.id);
      if (!tx) return send(res,404,{error:"Recharge transaction not found"});
      if (tx.status !== "pending") return send(res,200,{transaction:tx});
      try {
        const provider = await checkRechargeStatus(clientId);
        return send(res,200,{transaction:tx,provider});
      } catch (error) {
        return send(res,200,{transaction:tx,provider:{status_id:3,message:error.message || "Final status will arrive by webhook"}});
      }
    }

    if (pathName === "/api/recharge/webhook" && req.method === "POST") {
      const input = await parseJson(req); const clientId=String(input.client_id||"");
      if (!clientId) return send(res,400,{error:"client_id is required"});
      const tx=db.rechargeTransactions.find(x=>x.clientId===clientId);
      if (!tx) return send(res,200,{received:true});
      const next=Number(input.status_id)===1?"success":Number(input.status_id)===2?"failed":"pending";
      if (tx.status === "pending" && next !== "pending") {
        tx.status=next; tx.updatedAt=now(); tx.providerTxnId=input.txn_id||tx.providerTxnId; tx.message=input.message||tx.message;
        if (next === "failed" && !tx.refunded) {
          const wallet=ensureWallet(tx.userId); wallet.balance += tx.amount; wallet.updatedAt=now(); tx.refunded=true;
          db.walletLedger.unshift({id:id("WL"),userId:tx.userId,type:"credit",amount:tx.amount,reference:tx.id,description:"Recharge refund",status:"success",createdAt:now(),balanceAfter:wallet.balance});
        }
        if (next === "success" && !tx.commissionCredited) {
          const providerCommission = Number(input.commission ?? tx.providerCommission ?? 0);
          const userCommission = Number((providerCommission / 2).toFixed(2));
          const adminCommission = Number((providerCommission - userCommission).toFixed(2));
          tx.providerCommission = providerCommission; tx.userCommission=userCommission; tx.adminCommission=adminCommission; tx.commission=providerCommission;
          if (userCommission > 0) {
            const wallet=ensureWallet(tx.userId); wallet.balance += userCommission; wallet.updatedAt=now();
            db.walletLedger.unshift({id:id("WL"),userId:tx.userId,type:"credit",amount:userCommission,reference:tx.id,description:"50% recharge commission",status:"success",createdAt:now(),balanceAfter:wallet.balance});
            db.commissionLedger.unshift({id:id("CM"),rechargeId:tx.id,userId:tx.userId,providerCommission,userCommission,adminCommission,createdAt:now()});
          }
          tx.commissionCredited=true;
        }
        saveDb(db);
      }
      return send(res,200,{received:true});
    }

    if (pathName === "/api/analytics/summary" && req.method === "GET") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      const days = url.searchParams.get("range") === "30d" ? 30 : 7; const start=Date.now()-days*86400000;
      const txs=db.rechargeTransactions.filter(x=>x.userId===auth.user.id && new Date(x.createdAt).getTime()>=start);
      const apps=db.applications.filter(x=>x.userId===auth.user.id && new Date(x.createdAt).getTime()>=start && x.status !== "payment_pending");
      const rows=[...txs.map(x=>({date:x.createdAt, revenue:x.amount, commission:x.userCommission||0, service:x.type === "DTH" ? "DTH Recharge" : "Mobile Recharge", status:x.status})), ...apps.map(x=>({date:x.createdAt,revenue:Number(x.customerPrice||0),commission:Number(x.commissionCredited ? x.userCommission || 0 : 0),service:x.serviceName,status:x.status}))];
      const buckets={}; for(let i=days-1;i>=0;i--){const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i); const key=d.toISOString().slice(0,10); buckets[key]={date:key,revenue:0,transactions:0,commission:0};}
      for(const r of rows){const key=new Date(r.date).toISOString().slice(0,10); if(buckets[key]){buckets[key].revenue+=r.revenue;buckets[key].commission+=r.commission;buckets[key].transactions+=1;}}
      const serviceMap={}; for(const r of rows){const k=r.service; serviceMap[k] ||= {name:k,transactions:0,revenue:0,commission:0,success:0}; serviceMap[k].transactions++;serviceMap[k].revenue+=r.revenue;serviceMap[k].commission+=r.commission;if(["success","completed","accepted"].includes(r.status))serviceMap[k].success++;}
      const servicePerformance=Object.values(serviceMap).map(x=>({...x,successRate:x.transactions?Number((x.success/x.transactions*100).toFixed(1)):0}));
      const allUserTx=[...db.rechargeTransactions.filter(x=>x.userId===auth.user.id),...db.applications.filter(x=>x.userId===auth.user.id && x.status!=="payment_pending")];
      const successful=allUserTx.filter(x=>["success","completed","accepted"].includes(x.status));
      const todayKey=new Date().toISOString().slice(0,10); const today=allUserTx.filter(x=>String(x.createdAt).slice(0,10)===todayKey);
      const monthPrefix=new Date().toISOString().slice(0,7); const month=allUserTx.filter(x=>String(x.createdAt).slice(0,7)===monthPrefix);
      const customerSet=new Set(allUserTx.map(x=>x.mobile || x.applicant?.mobile || x.applicant?.phone).filter(Boolean));
      return send(res,200,{range:`${days}d`,trend:Object.values(buckets),servicePerformance,kpis:{todaySales:today.reduce((n,x)=>n+Number(x.amount||x.customerPrice||0),0),todayEarnings:today.reduce((n,x)=>n+Number(x.userCommission||((x.commissionCredited)?x.userCommission:0)||0),0),transactions:allUserTx.length,successRate:allUserTx.length?Number((successful.length/allUserTx.length*100).toFixed(1)):0,customers:customerSet.size,monthCommission:month.reduce((n,x)=>n+Number(x.userCommission||0),0),totalEarned:allUserTx.reduce((n,x)=>n+Number(x.userCommission||0),0)}});
    }

    if (pathName === "/api/customers" && req.method === "GET") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      const source=[...db.rechargeTransactions.filter(x=>x.userId===auth.user.id),...db.applications.filter(x=>x.userId===auth.user.id)]; const map={};
      for(const x of source){const mobile=String(x.mobile||x.applicant?.mobile||x.applicant?.phone||""); const name=String(x.customerName||x.applicant?.name||x.applicant?.fullName||"Customer"); if(!mobile)continue; map[mobile] ||= {id:`C-${mobile}`,name,mobile,servicesUsed:0,totalSpend:0,lastTxn:null,status:"active"}; const c=map[mobile]; c.servicesUsed++;c.totalSpend+=Number(x.amount||x.customerPrice||0);if(!c.lastTxn||new Date(x.createdAt)>new Date(c.lastTxn))c.lastTxn=x.createdAt;}
      return send(res,200,{customers:Object.values(map).sort((a,b)=>new Date(b.lastTxn||0)-new Date(a.lastTxn||0))});
    }

    if (pathName === "/api/support/tickets" && req.method === "GET") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      const tickets=db.supportTickets.filter(x=>auth.user.role==="admin" || x.userId===auth.user.id); return send(res,200,{tickets});
    }
    if (pathName === "/api/support/tickets" && req.method === "POST") {
      const auth = requireAuth(req, res, db); if (!auth) return; const input=await parseJson(req); if(!input.subject||!input.message)return send(res,400,{error:"Subject and message are required"});
      const ticket={id:id("TKT"),userId:auth.user.id,subject:String(input.subject),category:String(input.category||"General"),priority:String(input.priority||"medium"),status:"open",message:String(input.message),createdAt:now(),updatedAt:now()}; db.supportTickets.unshift(ticket);audit(db,auth.user,"SUPPORT_TICKET_CREATED","ticket",ticket.id);saveDb(db);return send(res,201,{ticket});
    }

    if (pathName === "/api/help" && req.method === "POST") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      const input = await parseJson(req);
      const subject = String(input.subject || "").trim();
      const message = String(input.message || "").trim();
      if (!subject || !message) return send(res, 400, { error: "Subject and message are required" });
      let app = null;
      if (input.applicationId) {
        app = db.applications.find(a => a.applicationId === String(input.applicationId) && a.userId === auth.user.id);
        if (!app) return send(res, 404, { error: "Application not found" });
      }
      const help = { id: id("HLP"), userId: auth.user.id, retailerName: auth.user.name, applicationId: app?.applicationId || null, serviceName: String(input.serviceName || app?.serviceName || "General Support"), subject, message, status: "open", adminReply: "", createdAt: now(), updatedAt: now(), applicationSnapshot: applicationHelpSnapshot(app) };
      db.helpRequests.unshift(help);
      audit(db, auth.user, "HELP_REQUEST_CREATED", "helpRequest", help.id, { applicationId: help.applicationId, serviceName: help.serviceName });
      saveDb(db);
      return send(res, 201, { helpRequest: help });
    }

    if (pathName === "/api/help" && req.method === "GET") {
      const auth = requireAuth(req, res, db); if (!auth) return;
      return send(res, 200, { helpRequests: db.helpRequests.filter(x => x.userId === auth.user.id) });
    }

    if (pathName === "/api/admin/help" && req.method === "GET") {
      const auth = requireAuth(req, res, db, "admin"); if (!auth) return;
      const status = url.searchParams.get("status");
      const helpRequests = db.helpRequests.filter(x => !status || x.status === status);
      return send(res, 200, { helpRequests });
    }

    if (pathName.match(/^\/api\/admin\/help\/[^/]+$/) && req.method === "PATCH") {
      const auth = requireAuth(req, res, db, "admin"); if (!auth) return;
      const helpId = pathName.split("/").pop();
      const help = db.helpRequests.find(x => x.id === helpId);
      if (!help) return send(res, 404, { error: "Help request not found" });
      const input = await parseJson(req);
      if (input.status !== undefined && !["open", "in_progress", "resolved"].includes(input.status)) return send(res, 400, { error: "Invalid help request status" });
      if (input.status !== undefined) help.status = input.status;
      if (input.adminReply !== undefined) help.adminReply = String(input.adminReply || "");
      let applicationUpdate = null;
      if (help.applicationId && input.applicationUpdate && typeof input.applicationUpdate === "object") {
        const app = db.applications.find(a => a.applicationId === help.applicationId);
        if (!app) return send(res, 404, { error: "Linked application not found" });
        try { applicationUpdate = updateApplicationByAdmin(db, app, input.applicationUpdate, auth.user); } catch (error) { return send(res, 400, { error: error.message }); }
        help.applicationSnapshot = applicationHelpSnapshot(app);
      }
      help.updatedAt = now();
      audit(db, auth.user, "HELP_REQUEST_UPDATED", "helpRequest", help.id, { status: help.status, applicationId: help.applicationId, applicationUpdate });
      saveDb(db);
      if (help.applicationId) { const app = db.applications.find(a => a.applicationId === help.applicationId); if (app) syncSheet(GOOGLE_SHEET_TAB_APPLICATIONS, sheetApplication(app)); }
      return send(res, 200, { helpRequest: help, applicationUpdate });
    }

    if (pathName === "/api/admin/commissions" && req.method === "GET") {
      const auth = requireAuth(req, res, db, "admin"); if (!auth) return;
      const rows = db.commissionLedger.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      return send(res, 200, { totalProviderCommission: rows.reduce((n,x)=>n+Number(x.providerCommission||0),0), totalAdminCommission: rows.reduce((n,x)=>n+Number(x.adminCommission||0),0), totalUserCommission: rows.reduce((n,x)=>n+Number(x.userCommission||0),0), rows });
    }

    if (pathName === "/api/admin/transactions" && req.method === "GET") {
      const auth=requireAuth(req,res,db,"admin"); if(!auth)return; const rows=[...db.rechargeTransactions.map(x=>({id:x.id,userId:x.userId,service:x.type==="DTH"?"DTH Recharge":"Mobile Recharge",customer:x.mobile,amount:x.amount,commission:x.adminCommission||0,date:x.createdAt,status:x.status,operator:x.operator})),...db.applications.map(x=>({id:x.applicationId,userId:x.userId,service:x.serviceName,customer:x.applicant?.name||x.applicant?.fullName||"",amount:x.customerPrice,commission:x.adminCommission||0,date:x.createdAt,status:x.status,operator:""}))]; return send(res,200,{transactions:rows.sort((a,b)=>new Date(b.date)-new Date(a.date))});
    }

    if (pathName === "/api/admin/stats" && req.method === "GET") {
      const auth = requireAuth(req, res, db, "admin"); if (!auth) return;
      const counts = [...db.applications, ...db.rechargeTransactions].reduce((m, a) => { m[a.status] = (m[a.status] || 0) + 1; return m; }, {});
      const revenue = [...db.applications.filter(a=>a.paymentId && a.status!=="payment_pending"), ...db.rechargeTransactions.filter(a=>a.status==="success")].reduce((n,a)=>n+Number(a.customerPrice||a.amount||0),0);
      return send(res, 200, { users: db.users.length, retailers: db.users.filter(u => u.role === "retailer").length, applications: db.applications.length, payments: db.payments.filter(p => p.status === "paid").length, pending: (counts.submitted || 0) + (counts.processing || 0) + (counts.pending || 0), revenue, statusCounts: counts });
    }

    if (pathName === "/api/admin/kyc" && req.method === "GET") {
      const auth=requireAuth(req,res,db,"admin"); if(!auth)return;
      const rows=db.users.filter(u=>u.role==="retailer").map(u=>({id:u.id,name:u.name,businessName:u.businessName,email:u.email,mobile:u.mobile,kycStatus:u.kycStatus||"pending",kyc:u.kyc?{...u.kyc,aadhaar:decrypt(u.kyc.aadhaar),pan:decrypt(u.kyc.pan),bankAccount:decrypt(u.kyc.bankAccount)}:null}));
      return send(res,200,{kyc:rows});
    }

    if (pathName.match(/^\/api\/admin\/kyc\/[^/]+$/) && req.method === "PATCH") {
      const auth=requireAuth(req,res,db,"admin"); if(!auth)return; const userId=pathName.split("/").pop(); const user=db.users.find(u=>u.id===userId && u.role==="retailer"); if(!user)return send(res,404,{error:"User not found"}); const input=await parseJson(req); if(!["verified","rejected","pending"].includes(input.status))return send(res,400,{error:"Invalid KYC status"}); user.kycStatus=input.status; user.kyc=user.kyc||{}; user.kyc.reviewedAt=now(); user.kyc.adminNote=String(input.adminNote||""); audit(db,auth.user,`KYC_${String(input.status).toUpperCase()}`,"user",user.id,{adminNote:user.kyc.adminNote}); saveDb(db); syncSheet(GOOGLE_SHEET_TAB_USERS,sheetUser(user)); return send(res,200,{user:sanitizeUser(user)});
    }

    if (pathName === "/api/admin/users" && req.method === "GET") {
      const auth = requireAuth(req, res, db, "admin"); if (!auth) return;
      return send(res, 200, { users: db.users.map(u => ({ ...sanitizeUser(u), wallet: ensureWallet(u.id).balance })) });
    }

    if (pathName === "/api/admin/audit" && req.method === "GET") {
      const auth = requireAuth(req, res, db, "admin"); if (!auth) return;
      return send(res, 200, { logs: db.auditLogs.slice(0, 300) });
    }

    return send(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: error?.message || "Internal server error" });
  }
}

const server = http.createServer(handleRequest);

if (!process.env.VERCEL) {
  server.on("error", error => {
    console.error(`LD SERVICE ZONE API could not start on port ${PORT}: ${error.message}`);
    process.exit(1);
  });
  server.listen(PORT, "0.0.0.0", () =>
    console.log(`LD SERVICE ZONE API running on http://localhost:${PORT} | payment: ${RAZORPAY_KEY_ID ? "Razorpay" : "Demo"}`)
  );
}

export default server;
