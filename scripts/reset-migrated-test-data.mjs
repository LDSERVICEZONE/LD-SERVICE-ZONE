import fs from "node:fs"

if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "")
  }
}
const base = String(process.env.SUPABASE_URL || "").replace(/\/$/, "")
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const stateTable = process.env.SUPABASE_STATE_TABLE || "platform_state"
if (!base || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
if (process.env.CONFIRM_RESET !== "YES") throw new Error("Set CONFIRM_RESET=YES to run this destructive cleanup")
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }
async function request(path, options = {}) {
  const response = await fetch(`${base}/rest/v1/${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } })
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path} failed (${response.status}): ${await response.text()}`)
  return response.status === 204 ? null : response.text()
}
const stateRows = JSON.parse(await request(`${stateTable}?id=eq.singleton&select=state`))
const state = stateRows?.[0]?.state
if (!state) throw new Error(`No ${stateTable} singleton found`)

// Delete children before parents to satisfy the relational foreign keys.
for (const table of [
  "ApplicationDocument", "ApplicationStatusHistory", "PaymentEvent", "Refund",
  "WalletLedger", "RechargeStatusHistory", "KycDocument", "KycReview", "KycProfile",
  "SupportMessage", "Notification", "SupportTicket", "AuditLog", "Payment",
  "RechargeTransaction", "Application", "Wallet", "Session", "RetailerProfile", "User",
]) {
  await request(`${table}?id=not.is.null`, { method: "DELETE", headers: { Prefer: "return=minimal" } })
  console.log(`cleared ${table}`)
}

const cleared = {
  users: [], sessions: [], applications: [], payments: [], auditLogs: [], otpVerifications: [],
  wallets: {}, walletLedger: [], rechargeTransactions: [], commissionLedger: [], supportTickets: [],
  helpRequests: [], pendingSignups: [], services: state.services || [],
}
await request(`${stateTable}?id=eq.singleton`, {
  method: "PATCH",
  headers: { Prefer: "return=minimal" },
  body: JSON.stringify({ state: cleared, updated_at: new Date().toISOString() }),
})
console.log("Cleared migrated test data; service catalog preserved.")
