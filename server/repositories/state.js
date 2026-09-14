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
  rechargeStatusHistory: [],
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
      if (!rows[0]?.state) {
        const seedResponse = await fetch(`${supabaseUrl}/rest/v1/${supabaseStateTable}`, {
          method: "POST",
          headers: {
            apikey: supabaseServiceRoleKey,
            Authorization: `Bearer ${supabaseServiceRoleKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ id: "singleton", state: EMPTY_STATE }),
        })
        if (!seedResponse.ok) {
          throw new Error("Supabase database initialization failed. Run supabase/schema.sql first.")
        }
        return structuredClone(EMPTY_STATE)
      }
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
      const relationalApplications = await fetch(
        `${supabaseUrl}/rest/v1/Application?select=*`,
        { headers: { apikey: supabaseServiceRoleKey, Authorization: `Bearer ${supabaseServiceRoleKey}` } },
      )
      const relationalDocuments = await fetch(
        `${supabaseUrl}/rest/v1/ApplicationDocument?select=*`,
        { headers: { apikey: supabaseServiceRoleKey, Authorization: `Bearer ${supabaseServiceRoleKey}` } },
      )
      if (!relationalApplications.ok || !relationalDocuments.ok) {
        throw new Error("Supabase relational application read failed")
      }
      const applicationRows = await relationalApplications.json()
      const documentRows = await relationalDocuments.json()
      if (applicationRows.length) {
        const usersById = new Map(state.users.map((user) => [user.id, user]))
        const servicesById = new Map(state.services.map((service) => [service.id, service]))
        const docsByApplication = new Map()
        for (const document of documentRows) {
          const documents = docsByApplication.get(document.applicationId) || []
          documents.push({
            name: document.documentType || document.originalName,
            fileName: document.originalName,
            storageName: document.storageKey,
            mimeType: document.mimeType,
            size: document.sizeBytes,
            uploadedAt: document.createdAt,
          })
          docsByApplication.set(document.applicationId, documents)
        }
        state.applications = applicationRows.map((application) => {
          const service = servicesById.get(application.serviceId) || {}
          const user = usersById.get(application.userId) || {}
          const required = Array.isArray(service.documents) ? service.documents : []
          const uploaded = docsByApplication.get(application.id) || []
          const uploadedByName = new Map(uploaded.map((document) => [document.name, document]))
          return {
            applicationId: application.id,
            userId: application.userId,
            retailerName: user.name || "Retailer",
            serviceId: application.serviceId,
            serviceName: service.name || "Service",
            category: service.category || "General",
            customerPrice: Number(application.amount || service.customerPrice || 0),
            commission: Number(service.commission || 0),
            applicant: application.customerData || {},
            documents: required.map((name) => uploadedByName.get(name) || { name }),
            status: String(application.status || "SUBMITTED").toLowerCase(),
            adminNote: application.rejectionReason || "",
            createdAt: application.createdAt,
            updatedAt: application.updatedAt,
            paymentId: null,
            orderId: null,
          }
        })
      }
      const relationalPayments = await fetch(`${supabaseUrl}/rest/v1/Payment?select=*`, {
        headers: { apikey: supabaseServiceRoleKey, Authorization: `Bearer ${supabaseServiceRoleKey}` },
      })
      const relationalWallets = await fetch(`${supabaseUrl}/rest/v1/Wallet?select=*`, {
        headers: { apikey: supabaseServiceRoleKey, Authorization: `Bearer ${supabaseServiceRoleKey}` },
      })
      const relationalLedger = await fetch(`${supabaseUrl}/rest/v1/WalletLedger?select=*`, {
        headers: { apikey: supabaseServiceRoleKey, Authorization: `Bearer ${supabaseServiceRoleKey}` },
      })
      if (!relationalPayments.ok || !relationalWallets.ok || !relationalLedger.ok) {
        throw new Error("Supabase relational payment read failed")
      }
      const paymentRows = await relationalPayments.json()
      const walletRows = await relationalWallets.json()
      const ledgerRows = await relationalLedger.json()
      if (paymentRows.length) {
        state.payments = paymentRows.map((payment) => ({
          paymentId: payment.id, applicationId: payment.applicationId || null, userId: payment.userId,
          amount: Number(payment.amount || 0), mode: payment.mode || "razorpay",
          status: String(payment.status || "CREATED").toLowerCase(), orderId: payment.providerOrderId || null,
          gatewayPaymentId: payment.gatewayPaymentId || payment.providerPaymentId || null,
          createdAt: payment.createdAt, paidAt: payment.paidAt || null, updatedAt: payment.updatedAt,
        }))
      }
      if (walletRows.length) {
        state.wallets = Object.fromEntries(walletRows.map((wallet) => [wallet.userId, {
          id: wallet.id, userId: wallet.userId, balance: Number(wallet.balance || 0),
          creditLimit: Number(wallet.creditLimit || 0), pendingSettlement: Number(wallet.pendingSettlement || 0),
          createdAt: wallet.createdAt, updatedAt: wallet.updatedAt,
        }]))
      }
      if (ledgerRows.length) {
        state.walletLedger = ledgerRows.map((entry) => ({
          id: entry.id, userId: entry.userId, type: String(entry.type || "ADJUSTMENT").toLowerCase(),
          amount: Number(entry.amount || 0), reference: entry.reference, description: entry.description || "",
          status: entry.status || "success", balanceAfter: Number(entry.balanceAfter || 0), createdAt: entry.createdAt,
        }))
      }
      const relationalRecharges = await fetch(`${supabaseUrl}/rest/v1/RechargeTransaction?select=*`, {
        headers: { apikey: supabaseServiceRoleKey, Authorization: `Bearer ${supabaseServiceRoleKey}` },
      })
      if (!relationalRecharges.ok) throw new Error("Supabase relational recharge read failed")
      const rechargeRows = await relationalRecharges.json()
      const relationalRechargeHistory = await fetch(`${supabaseUrl}/rest/v1/RechargeStatusHistory?select=*`, {
        headers: { apikey: supabaseServiceRoleKey, Authorization: `Bearer ${supabaseServiceRoleKey}` },
      })
      if (!relationalRechargeHistory.ok) throw new Error("Supabase recharge history read failed")
      const rechargeHistoryRows = await relationalRechargeHistory.json()
      if (rechargeRows.length) {
        state.rechargeTransactions = rechargeRows.map((row) => ({
          id: row.id, clientId: row.clientId || row.externalRef, providerTxnId: row.providerTxnId || row.externalRef,
          userId: row.userId, mobile: row.mobile, operator: row.operator, circle: row.circle || "",
          providerId: row.providerId, type: row.type || "MOBILE", amount: Number(row.amount || 0),
          providerCommission: Number(row.providerCommission || row.commission || 0), userCommission: Number(row.userCommission || 0),
          adminCommission: Number(row.adminCommission || 0), commission: Number(row.commission || 0),
          commissionCredited: row.commissionCredited === true, status: String(row.status || "PENDING").toLowerCase(),
          message: row.message || "", refunded: row.refunded === true, createdAt: row.createdAt, updatedAt: row.updatedAt,
        }))
      }
      if (rechargeHistoryRows.length) {
        state.rechargeStatusHistory = rechargeHistoryRows.map((row) => ({
          id: row.id, transactionId: row.transactionId, status: String(row.status || "PENDING").toLowerCase(),
          payload: row.payload || null, createdAt: row.createdAt,
        }))
      }
      return state
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
          const applications = (snapshot.applications || []).map((application) => ({
            id: application.applicationId || application.id,
            userId: application.userId,
            serviceId: application.serviceId,
            status: String(application.status || "submitted").toUpperCase(),
            amount: Number(application.customerPrice || application.amount || 0),
            customerData: application.applicant || application.customerData || {},
            rejectionReason: application.adminNote || application.rejectionReason || null,
            createdAt: application.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))
          if (applications.length) {
            const applicationResponse = await fetch(`${supabaseUrl}/rest/v1/Application?on_conflict=id`, {
              method: "POST",
              headers: { ...authHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
              body: JSON.stringify(applications),
            })
            if (!applicationResponse.ok) throw new Error(`Supabase Application sync failed (${applicationResponse.status})`)
          }
          const documents = []
          for (const application of snapshot.applications || []) {
            for (const document of application.documents || []) {
              if (!document.storageName) continue
              documents.push({
                id: document.id || `${application.applicationId}_${document.name}`,
                applicationId: application.applicationId || application.id,
                documentType: document.name,
                storageKey: document.storageName,
                originalName: document.fileName || document.name,
                mimeType: document.mimeType || "application/octet-stream",
                sizeBytes: Number(document.size || 0),
                createdAt: document.uploadedAt || new Date().toISOString(),
              })
            }
          }
          if (documents.length) {
            const documentResponse = await fetch(`${supabaseUrl}/rest/v1/ApplicationDocument?on_conflict=id`, {
              method: "POST",
              headers: { ...authHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
              body: JSON.stringify(documents),
            })
            if (!documentResponse.ok) throw new Error(`Supabase ApplicationDocument sync failed (${documentResponse.status})`)
          }
          const payments = (snapshot.payments || []).map((payment) => ({
            id: payment.paymentId || payment.id, applicationId: payment.applicationId || null, userId: payment.userId,
            provider: payment.provider || "razorpay", providerOrderId: payment.orderId || null,
            providerPaymentId: payment.gatewayPaymentId || payment.providerPaymentId || null,
            amount: Number(payment.amount || 0), status: String(payment.status || "created").toUpperCase(),
            mode: payment.mode || "razorpay", gatewayPaymentId: payment.gatewayPaymentId || null,
            paidAt: payment.paidAt || null, createdAt: payment.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
          }))
          if (payments.length) {
            const paymentResponse = await fetch(`${supabaseUrl}/rest/v1/Payment?on_conflict=id`, {
              method: "POST", headers: { ...authHeaders, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(payments),
            })
            if (!paymentResponse.ok) throw new Error(`Supabase Payment sync failed (${paymentResponse.status})`)
          }
          const walletRows = Object.values(snapshot.wallets || {}).map((wallet) => ({
            id: wallet.id || `wallet_${wallet.userId}`, userId: wallet.userId, balance: Number(wallet.balance || 0),
            creditLimit: Number(wallet.creditLimit || 0), pendingSettlement: Number(wallet.pendingSettlement || 0),
            createdAt: wallet.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
          }))
          if (walletRows.length) {
            const walletResponse = await fetch(`${supabaseUrl}/rest/v1/Wallet?on_conflict=userId`, {
              method: "POST", headers: { ...authHeaders, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(walletRows),
            })
            if (!walletResponse.ok) throw new Error(`Supabase Wallet sync failed (${walletResponse.status})`)
          }
          const ledgerRows = (snapshot.walletLedger || []).map((entry) => ({
            id: entry.id, userId: entry.userId, walletId: snapshot.wallets?.[entry.userId]?.id || `wallet_${entry.userId}`,
            type: String(entry.type || "adjustment").toUpperCase(), amount: Number(entry.amount || 0),
            reference: entry.reference || entry.id, description: entry.description || null, status: entry.status || "success",
            balanceAfter: Number(entry.balanceAfter || 0), createdAt: entry.createdAt || new Date().toISOString(),
          }))
          if (ledgerRows.length) {
            const ledgerResponse = await fetch(`${supabaseUrl}/rest/v1/WalletLedger?on_conflict=id`, {
              method: "POST", headers: { ...authHeaders, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(ledgerRows),
            })
            if (!ledgerResponse.ok) throw new Error(`Supabase WalletLedger sync failed (${ledgerResponse.status})`)
          }
          const rechargeRows = (snapshot.rechargeTransactions || []).map((transaction) => ({
            id: transaction.id, clientId: transaction.clientId || null, externalRef: transaction.clientId || null,
            providerTxnId: transaction.providerTxnId || null, userId: transaction.userId, provider: transaction.provider || "pay2all",
            providerId: transaction.providerId || null, mobile: transaction.mobile, operator: transaction.operator,
            circle: transaction.circle || null, type: transaction.type || "MOBILE", amount: Number(transaction.amount || 0),
            status: String(transaction.status || "pending").toUpperCase(), commission: Number(transaction.commission || 0),
            providerCommission: Number(transaction.providerCommission || 0), userCommission: Number(transaction.userCommission || 0),
            adminCommission: Number(transaction.adminCommission || 0), commissionCredited: transaction.commissionCredited === true,
            message: transaction.message || null, refunded: transaction.refunded === true,
            createdAt: transaction.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
          }))
          if (rechargeRows.length) {
            const rechargeResponse = await fetch(`${supabaseUrl}/rest/v1/RechargeTransaction?on_conflict=id`, {
              method: "POST", headers: { ...authHeaders, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rechargeRows),
            })
            if (!rechargeResponse.ok) throw new Error(`Supabase RechargeTransaction sync failed (${rechargeResponse.status})`)
          }
          const rechargeHistory = (snapshot.rechargeStatusHistory || []).map((entry) => ({
            id: entry.id, transactionId: entry.transactionId, status: String(entry.status || "pending").toUpperCase(),
            payload: entry.payload || null, createdAt: entry.createdAt || new Date().toISOString(),
          }))
          if (rechargeHistory.length) {
            const historyResponse = await fetch(`${supabaseUrl}/rest/v1/RechargeStatusHistory?on_conflict=id`, {
              method: "POST", headers: { ...authHeaders, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rechargeHistory),
            })
            if (!historyResponse.ok) throw new Error(`Supabase RechargeStatusHistory sync failed (${historyResponse.status})`)
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
