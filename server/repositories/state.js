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
      const state = rows[0]?.state ? { ...EMPTY_STATE, ...rows[0].state } : structuredClone(EMPTY_STATE)
      // Authentication records are read from relational tables. The snapshot
      // remains available for domains that have not been migrated yet.
      const relationalUsers = await fetch(
        `${supabaseUrl}/rest/v1/User?select=*`,
        { headers: { apikey: supabaseServiceRoleKey, Authorization: `Bearer ${supabaseServiceRoleKey}` } },
      )
      const relationalSessions = await fetch(
        `${supabaseUrl}/rest/v1/Session?select=*`,
        { headers: { apikey: supabaseServiceRoleKey, Authorization: `Bearer ${supabaseServiceRoleKey}` } },
      )
      if (!relationalUsers.ok || !relationalSessions.ok) {
        throw new Error("Supabase relational authentication read failed")
      }
      const userRows = await relationalUsers.json()
      const sessionRows = await relationalSessions.json()
      const relationalCategories = await fetch(
        `${supabaseUrl}/rest/v1/ServiceCategory?select=*`,
        { headers: { apikey: supabaseServiceRoleKey, Authorization: `Bearer ${supabaseServiceRoleKey}` } },
      )
      const relationalServices = await fetch(
        `${supabaseUrl}/rest/v1/Service?select=*`,
        { headers: { apikey: supabaseServiceRoleKey, Authorization: `Bearer ${supabaseServiceRoleKey}` } },
      )
      if (!relationalCategories.ok || !relationalServices.ok) {
        throw new Error("Supabase relational catalog read failed")
      }
      const categoryRows = await relationalCategories.json()
      const serviceRows = await relationalServices.json()
      if (userRows.length) {
        state.users = userRows.map((user) => ({
          id: user.id,
          email: user.email,
          mobile: user.mobile,
          passwordHash: user.passwordHash,
          name: user.name,
          businessName: user.businessName,
          role: String(user.role || "RETAILER").toLowerCase(),
          status: user.active === false ? "suspended" : "active",
          emailVerifiedAt: user.emailVerifiedAt,
          mobileVerifiedAt: user.mobileVerifiedAt,
          supabaseUserId: user.supabaseUserId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }))
      }
      state.sessions = sessionRows.map((session) => ({
        id: session.id,
        userId: session.userId,
        tokenHash: session.tokenHash,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
      }))
      if (serviceRows.length) {
        const categoryNames = new Map(categoryRows.map((category) => [category.id, category.name]))
        state.services = serviceRows.map((service) => ({
          id: service.id,
          category: categoryNames.get(service.categoryId) || "General",
          name: service.name,
          slug: service.slug,
          description: service.description || "",
          customerPrice: Number(service.customerPrice || 0),
          commission: Number(service.retailerCommission || 0),
          processingDays: service.processingDays,
          active: service.active !== false,
          formSchema: service.formSchema || null,
          documents: service.requiredDocuments || [],
          createdAt: service.createdAt,
          updatedAt: service.updatedAt,
        }))
      }
      return state

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
          const authHeaders = {
            apikey: supabaseServiceRoleKey,
            Authorization: `Bearer ${supabaseServiceRoleKey}`,
            "Content-Type": "application/json",
          }
          const users = (snapshot.users || []).map((user) => ({
            id: user.id,
            email: user.email || null,
            mobile: user.mobile || null,
            passwordHash: user.passwordHash || null,
            name: user.name || "Unknown user",
            businessName: user.businessName || null,
            role: String(user.role || "retailer").toUpperCase(),
            active: user.status !== "suspended",
            emailVerifiedAt: user.emailVerifiedAt || null,
            mobileVerifiedAt: user.mobileVerifiedAt || null,
            supabaseUserId: user.supabaseUserId || null,
            createdAt: user.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))
          if (users.length) {
            const userResponse = await fetch(`${supabaseUrl}/rest/v1/User?on_conflict=id`, {
              method: "POST",
              headers: { ...authHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
              body: JSON.stringify(users),
            })
            if (!userResponse.ok) throw new Error(`Supabase User sync failed (${userResponse.status})`)
          }
          await fetch(`${supabaseUrl}/rest/v1/Session?id=not.is.null`, {
            method: "DELETE", headers: { ...authHeaders, Prefer: "return=minimal" },
          })
          const sessions = (snapshot.sessions || []).map((session) => ({
            id: session.id,
            userId: session.userId,
            tokenHash: session.tokenHash,
            expiresAt: session.expiresAt,
            revokedAt: session.revokedAt || null,
            createdAt: session.createdAt || new Date().toISOString(),
          }))
          if (sessions.length) {
            const sessionResponse = await fetch(`${supabaseUrl}/rest/v1/Session?on_conflict=id`, {
              method: "POST",
              headers: { ...authHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
              body: JSON.stringify(sessions),
            })
            if (!sessionResponse.ok) throw new Error(`Supabase Session sync failed (${sessionResponse.status})`)
          }
          const categoryIds = new Map()
          for (const service of snapshot.services || []) {
            const name = service.category || "General"
            if (!categoryIds.has(name)) categoryIds.set(name, `cat_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`)
          }
          const categoryRows = [...categoryIds].map(([name, id]) => ({ id, name, active: true }))
          if (categoryRows.length) {
            const categoryResponse = await fetch(`${supabaseUrl}/rest/v1/ServiceCategory?on_conflict=id`, {
              method: "POST",
              headers: { ...authHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
              body: JSON.stringify(categoryRows),
            })
            if (!categoryResponse.ok) throw new Error(`Supabase ServiceCategory sync failed (${categoryResponse.status})`)
          }
          const services = (snapshot.services || []).map((service) => ({
            id: service.id,
            categoryId: categoryIds.get(service.category || "General"),
            name: service.name,
            slug: service.slug || service.id,
            description: service.description || null,
            customerPrice: Number(service.customerPrice || 0),
            retailerCommission: Number(service.commission || service.retailerCommission || 0),
            processingDays: Number.parseInt(String(service.processingDays || "0"), 10) || null,
            active: service.active !== false,
            formSchema: service.formSchema || null,
            requiredDocuments: service.documents || service.requiredDocuments || [],
            createdAt: service.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))
          if (services.length) {
            const serviceResponse = await fetch(`${supabaseUrl}/rest/v1/Service?on_conflict=id`, {
              method: "POST",
              headers: { ...authHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
              body: JSON.stringify(services),
            })
            if (!serviceResponse.ok) throw new Error(`Supabase Service sync failed (${serviceResponse.status})`)
          }
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
