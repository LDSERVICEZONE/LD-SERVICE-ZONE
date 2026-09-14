import fs from "node:fs"

function loadEnv() {
  if (!fs.existsSync(".env")) return
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "")
  }
}
loadEnv()

const base = String(process.env.SUPABASE_URL || "").replace(/\/$/, "")
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const stateTable = process.env.SUPABASE_STATE_TABLE || "platform_state"
if (!base || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")

async function get(path) {
  const response = await fetch(`${base}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!response.ok) throw new Error(`GET ${path} failed (${response.status}): ${await response.text()}`)
  return response.json()
}

const stateRows = await get(`${stateTable}?id=eq.singleton&select=state`)
const state = stateRows?.[0]?.state
if (!state) throw new Error(`No ${stateTable} singleton found`)
const userIds = new Set((state.users || []).map((user) => user.id))
const sourceWallets = Object.values(state.wallets || {})
const validWallets = sourceWallets.filter((wallet) => userIds.has(wallet.userId))

const expected = {
  User: (state.users || []).length,
  Service: (state.services || []).length,
  Application: (state.applications || []).length,
  Payment: (state.payments || []).length,
  Wallet: validWallets.length,
  RechargeTransaction: (state.rechargeTransactions || []).length,
  AuditLog: (state.auditLogs || []).length,
}
if (sourceWallets.length !== validWallets.length) {
  console.log(`Wallet: skipped_orphans=${sourceWallets.length - validWallets.length}`)
}

let failed = false
for (const [table, sourceCount] of Object.entries(expected)) {
  const rows = await get(`${table}?select=id`)
  const relationalCount = rows.length
  const status = relationalCount >= sourceCount ? "OK" : "MISSING"
  if (status !== "OK") failed = true
  console.log(`${table}: source=${sourceCount} relational=${relationalCount} ${status}`)
}

if (failed) process.exitCode = 1
else console.log("Relational migration verification passed.")
