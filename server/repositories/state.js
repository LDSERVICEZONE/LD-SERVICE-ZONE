import fs from "node:fs"
import path from "node:path"

export const EMPTY_STATE = {
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
}

export function createStateRepository(config) {
  const {
    dataStore,
    dataDir,
    supabaseUrl,
    supabaseServiceRoleKey,
    supabaseStateTable,
  } = config
  const dbFile = path.join(dataDir, "db.json")
  let persistQueue = Promise.resolve()

  async function load() {
    if (dataStore === "supabase") {
      if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error(
          "Supabase database mode requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
        )
      }
      const response = await fetch(
        `${supabaseUrl}/rest/v1/${supabaseStateTable}?id=eq.singleton&select=state`,
        {
          headers: {
            apikey: supabaseServiceRoleKey,
            Authorization: `Bearer ${supabaseServiceRoleKey}`,
          },
        },
      )
      if (!response.ok) {
        throw new Error(
          `Supabase database read failed (${response.status}). Run supabase/schema.sql first.`,
        )
      }
      const rows = await response.json()
      if (rows[0]?.state) return { ...EMPTY_STATE, ...rows[0].state }

      const responseToSeed = await fetch(
        `${supabaseUrl}/rest/v1/${supabaseStateTable}`,
        {
          method: "POST",
          headers: {
            apikey: supabaseServiceRoleKey,
            Authorization: `Bearer ${supabaseServiceRoleKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ id: "singleton", state: EMPTY_STATE }),
        },
      )
      if (!responseToSeed.ok) {
        throw new Error(
          "Supabase database initialization failed. Run supabase/schema.sql first.",
        )
      }
      return structuredClone(EMPTY_STATE)
    }

    if (!fs.existsSync(dbFile)) {
      fs.writeFileSync(dbFile, JSON.stringify(EMPTY_STATE, null, 2))
    }
    try {
      const state = JSON.parse(fs.readFileSync(dbFile, "utf8"))
      return { ...EMPTY_STATE, ...state }
    } catch (error) {
      throw new Error(
        "Unable to read database; refusing to overwrite existing records",
        { cause: error },
      )
    }
  }

  function save(state) {
    if (dataStore === "supabase") {
      const snapshot = structuredClone(state)
      persistQueue = persistQueue
        .then(async () => {
          const response = await fetch(
            `${supabaseUrl}/rest/v1/${supabaseStateTable}?on_conflict=id`,
            {
              method: "POST",
              headers: {
                apikey: supabaseServiceRoleKey,
                Authorization: `Bearer ${supabaseServiceRoleKey}`,
                "Content-Type": "application/json",
                Prefer: "resolution=merge-duplicates,return=minimal",
              },
              body: JSON.stringify({
                id: "singleton",
                state: snapshot,
                updated_at: new Date().toISOString(),
              }),
            },
          )
          if (!response.ok) {
            console.error(`Supabase database write failed (${response.status})`)
          }
        })
        .catch((error) =>
          console.error("Supabase persistence queue failed:", error.message),
        )
      return persistQueue
    }

    const temporaryFile = `${dbFile}.tmp`
    fs.writeFileSync(temporaryFile, JSON.stringify(state, null, 2))
    fs.renameSync(temporaryFile, dbFile)
    return Promise.resolve()
  }

  return { load, save }
}
