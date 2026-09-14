/**
 * One-time, idempotent migration from the legacy platform_state snapshot to
 * the relational Supabase tables. It intentionally does not change runtime
 * traffic; run it after applying supabase/schema.sql and before the repository
 * cutover.
 */
import fs from "node:fs"

function loadEnv() {
  const file = ".env"
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i)
    if (!match || process.env[match[1]]) continue
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "")
  }
}

loadEnv()

const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "")
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const stateTable = process.env.SUPABASE_STATE_TABLE || "platform_state"
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
}

async function request(path, options = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${options.method || "GET"} ${path} failed (${response.status}): ${body}`)
  }
  if (response.status === 204) return null
  const body = await response.text()
  return body ? JSON.parse(body) : null
}

async function upsert(table, rows, conflict = "id") {
  if (!rows.length) return
  await request(`${table}?on_conflict=${encodeURIComponent(conflict)}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  })
  console.log(`${table}: ${rows.length}`)
}

const stateRows = await request(`${stateTable}?id=eq.singleton&select=state`)
const state = stateRows?.[0]?.state
if (!state) throw new Error(`No state found in ${stateTable}. Nothing to migrate.`)

const users = (state.users || []).map((u) => ({
  id: u.id,
  email: u.email || null,
  mobile: u.mobile || null,
  passwordHash: u.passwordHash || null,
  name: u.name || "Unknown user",
  businessName: u.businessName || null,
  role: String(u.role || "retailer").toUpperCase(),
  active: u.status !== "suspended",
  emailVerifiedAt: u.emailVerifiedAt || null,
  mobileVerifiedAt: u.mobileVerifiedAt || null,
  supabaseUserId: u.supabaseUserId || null,
  createdAt: u.createdAt || new Date().toISOString(),
  updatedAt: u.updatedAt || new Date().toISOString(),
}))
await upsert("User", users)
const userIds = new Set(users.map((u) => u.id))

await upsert(
  "RetailerProfile",
  users.filter((u) => u.role === "RETAILER").map((u) => ({ userId: u.id })),
  "userId",
)

const categories = new Map()
for (const service of state.services || []) {
  const name = service.category || "General"
  if (!categories.has(name)) categories.set(name, `cat_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`)
}
await upsert(
  "ServiceCategory",
  [...categories].map(([name, id]) => ({ id, name, active: true })),
  "id",
)
await upsert(
  "Service",
  (state.services || []).map((s) => ({
    id: s.id,
    categoryId: categories.get(s.category || "General"),
    name: s.name,
    slug: s.slug || s.id,
    description: s.description || null,
    customerPrice: Number(s.customerPrice || 0),
    retailerCommission: Number(s.commission || s.retailerCommission || 0),
    processingDays: Number.parseInt(String(s.processingDays || "0"), 10) || null,
    active: s.active !== false,
    formSchema: s.formSchema || null,
    requiredDocuments: s.documents || s.requiredDocuments || [],
    createdAt: s.createdAt || new Date().toISOString(),
    updatedAt: s.updatedAt || new Date().toISOString(),
  })),
)

const applications = (state.applications || []).filter((a) => userIds.has(a.userId) && (state.services || []).some((s) => s.id === a.serviceId))
const applicationIds = new Set(applications.map((a) => a.id || a.applicationId))
await upsert(
  "Application",
  applications.map((a) => ({
    id: a.id || a.applicationId,
    userId: a.userId,
    serviceId: a.serviceId,
    status: String(a.status || "SUBMITTED").toUpperCase(),
    amount: Number(a.amount || a.customerPrice || 0),
    customerData: a.applicant || a.customerData || {},
    rejectionReason: a.rejectionReason || null,
    createdAt: a.createdAt || new Date().toISOString(),
    updatedAt: a.updatedAt || a.createdAt || new Date().toISOString(),
  })),
)

const appDocuments = []
for (const app of state.applications || []) {
  const applicationId = app.id || app.applicationId
  if (!applicationIds.has(applicationId)) continue
  for (const document of app.documents || []) {
    if (!document.fileName && !document.storageName) continue
    appDocuments.push({
      id: document.id || `${applicationId}_${document.name}`,
      applicationId,
      documentType: document.name,
      storageKey: document.storageName || document.fileName,
      originalName: document.fileName || document.name,
      mimeType: document.mimeType || "application/octet-stream",
      sizeBytes: Number(document.sizeBytes || 0),
      createdAt: document.uploadedAt || new Date().toISOString(),
    })
  }
}
await upsert("ApplicationDocument", appDocuments)

await upsert(
  "Payment",
  (state.payments || []).map((p) => ({
    id: p.id,
    userId: p.userId,
    provider: p.provider || "razorpay",
    providerOrderId: p.orderId || p.providerOrderId || null,
    providerPaymentId: p.paymentId || p.providerPaymentId || null,
    amount: Number(p.amount || 0),
    status: String(p.status || "CREATED").toUpperCase(),
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: p.updatedAt || p.createdAt || new Date().toISOString(),
  })),
)

const wallets = Object.values(state.wallets || {}).filter((w) => userIds.has(w.userId))
await upsert(
  "Wallet",
  wallets.map((w) => ({
    id: w.id || `wallet_${w.userId}`,
    userId: w.userId,
    balance: Number(w.balance || 0),
    createdAt: w.createdAt || new Date().toISOString(),
    updatedAt: w.updatedAt || new Date().toISOString(),
  })),
  "userId",
)
const walletIds = new Map(wallets.map((w) => [w.userId, w.id || `wallet_${w.userId}`]))
await upsert(
  "WalletLedger",
  (state.walletLedger || []).filter((entry) => walletIds.has(entry.userId)).map((entry) => ({
    id: entry.id,
    walletId: walletIds.get(entry.userId) || `wallet_${entry.userId}`,
    type: String(entry.type || "ADJUSTMENT").toUpperCase(),
    amount: Number(entry.amount || 0),
    reference: entry.reference || entry.id,
    description: entry.description || null,
    createdAt: entry.createdAt || new Date().toISOString(),
  })),
)

await upsert(
  "RechargeTransaction",
  (state.rechargeTransactions || []).filter((t) => userIds.has(t.userId)).map((t) => ({
    id: t.id,
    userId: t.userId,
    provider: t.provider || "pay2all",
    externalRef: t.externalRef || t.clientId || null,
    mobile: t.mobile,
    operator: t.operator,
    circle: t.circle || null,
    amount: Number(t.amount || 0),
    status: String(t.status || "PENDING").toUpperCase(),
    commission: Number(t.commission || 0),
    createdAt: t.createdAt || new Date().toISOString(),
    updatedAt: t.updatedAt || t.createdAt || new Date().toISOString(),
  })),
)

await upsert(
  "AuditLog",
  (state.auditLogs || []).map((log) => ({
    id: log.id,
    userId: log.userId || null,
    action: log.action || "MIGRATED",
    entity: log.entity || null,
    entityId: log.entityId || null,
    ip: log.ip || null,
    metadata: log.metadata || null,
    createdAt: log.createdAt || new Date().toISOString(),
  })),
)

console.log("Relational migration completed. Legacy platform_state was preserved.")
