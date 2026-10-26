import { parseJson } from "../lib/http.js"
import { createId, now } from "../lib/ids.js"
import { apiniceProvider } from "../services/apiniceProvider.js"

export const DEFAULT_APINICE_SERVICES = [
  {
    id: "SVC-RC-PRINT",
    name: "RC Smart Card Print",
    category: "Vehicle",
    customerPrice: 30,
    commission: 5,
    processingTime: "Instant",
    documents: ["Vehicle Registration Number"],
    color: "#06B6D4",
    status: "active",
  },
  {
    id: "SVC-DL-PRINT",
    name: "Driving Licence Print",
    category: "Vehicle",
    customerPrice: 25,
    commission: 5,
    processingTime: "Instant",
    documents: ["DL Number", "Date of Birth"],
    color: "#1D56D8",
    status: "active",
  },
  {
    id: "SVC-RATION-PRINT",
    name: "Ration Card Print",
    category: "Citizen",
    customerPrice: 25,
    commission: 5,
    processingTime: "Instant",
    documents: ["Ration Card Number"],
    color: "#10B981",
    status: "active",
  },
]

export function seedApiniceServices(db) {
  if (!Array.isArray(db.services)) {
    db.services = []
  }
  for (const def of DEFAULT_APINICE_SERVICES) {
    if (!db.services.some((s) => s.id === def.id)) {
      db.services.push({
        ...def,
        createdAt: now(),
        updatedAt: now(),
      })
    }
  }
}

function getServiceConfig(db, serviceId, fallbackPrice, fallbackName) {
  const svc = (db.services || []).find((s) => s.id === serviceId)
  if (svc) {
    const price = Number(svc.customerPrice)
    return {
      price: Number.isFinite(price) && price >= 0 ? price : fallbackPrice,
      name: svc.name || fallbackName,
      status: svc.status || "active",
      commission: Number(svc.commission || 0),
    }
  }
  return {
    price: fallbackPrice,
    name: fallbackName,
    status: "active",
    commission: 0,
  }
}

export async function handleApiniceRoutes(context) {
  const {
    req,
    res,
    pathName,
    db,
    send,
    saveDb,
    audit,
    requireAuth,
    ensureWallet,
  } = context

  if (!pathName.startsWith("/api/apinice")) {
    return false
  }

  const respond = (status, payload) => {
    send(res, status, payload)
    return true
  }

  // Ensure services exist in catalog so admin can see and edit them
  seedApiniceServices(db)

  // 1. GET /api/apinice/balance
  if (pathName === "/api/apinice/balance" && req.method === "GET") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    if (!apiniceProvider.configured()) {
      return respond(200, { configured: false, balance: 0, message: "APINICE API is not configured" })
    }

    try {
      const balanceData = await apiniceProvider.checkBalance()
      if (auth.user.role === "admin") {
        return respond(200, balanceData)
      }
      return respond(200, { configured: true, active: balanceData.success })
    } catch (err) {
      return respond(500, { error: err.message || "Failed to check APINICE balance" })
    }
  }

  // Helper for executing print transactions with dynamic admin pricing & wallet debit
  async function executePrintTransaction({
    serviceId,
    fallbackPrice,
    fallbackName,
    descriptionPrefix,
    executor,
  }) {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(db, serviceId, fallbackPrice, fallbackName)
    if (svcConfig.status === "disabled") {
      return respond(403, {
        error: `${svcConfig.name} is temporarily disabled by admin. Please try again later.`,
      })
    }

    const wallet = ensureWallet(auth.user.id)
    const requiredPrice = svcConfig.price

    if (Number(wallet.balance) < requiredPrice) {
      return respond(400, {
        error: `Insufficient wallet balance. Required: ₹${requiredPrice.toFixed(2)}, Current: ₹${Number(wallet.balance).toFixed(2)}. Please recharge your wallet.`,
        required: requiredPrice,
        balance: Number(wallet.balance),
      })
    }

    let input = {}
    try {
      input = await parseJson(req)
    } catch {
      input = {}
    }

    let result
    try {
      result = await executor(input)
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Provider service failed",
      })
    }

    // Provider call succeeded — atomically debit wallet and append to immutable ledger
    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `${descriptionPrefix} (${result.identifier || result.dlno || result.rcno || result.rationno})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    const ledgerEntry = {
      id: txId,
      userId: auth.user.id,
      type: "DEBIT",
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId,
      referenceId: result.identifier || null,
      status: "SUCCESS",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId,
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: result.identifier || null,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: serviceId,
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      pdf: result.pdf,
      data: result,
      ledgerId: txId,
      transactionId: txId,
      message: `${svcConfig.name} generated successfully`,
    })
  }

  // 2. POST /api/apinice/rc-print
  if (pathName === "/api/apinice/rc-print" && req.method === "POST") {
    return executePrintTransaction({
      serviceId: "SVC-RC-PRINT",
      fallbackPrice: 30,
      fallbackName: "RC Smart Card Print",
      descriptionPrefix: "Vehicle RC Print",
      executor: async (input) => {
        const rcno = String(input.rcno || "").trim()
        if (!rcno) throw new Error("Vehicle Registration Number (RC Number) is required")
        const cardtype = String(input.cardtype || "2")
        const chiptype = String(input.chiptype || "1")
        const res = await apiniceProvider.printRc({ rcno, cardtype, chiptype })
        return { ...res, identifier: rcno }
      },
    })
  }

  // 3. POST /api/apinice/dl-print
  if (pathName === "/api/apinice/dl-print" && req.method === "POST") {
    return executePrintTransaction({
      serviceId: "SVC-DL-PRINT",
      fallbackPrice: 25,
      fallbackName: "Driving Licence Print",
      descriptionPrefix: "Driving Licence Print",
      executor: async (input) => {
        const dlno = String(input.dlno || "").trim()
        const dob = String(input.dob || "").trim()
        if (!dlno) throw new Error("Driving Licence Number is required")
        if (!dob) throw new Error("Date of Birth is required")
        const cardtype = String(input.cardtype || "1")
        const res = await apiniceProvider.printDl({ dlno, dob, cardtype })
        return { ...res, identifier: dlno }
      },
    })
  }

  // 4. POST /api/apinice/ration-print
  if (pathName === "/api/apinice/ration-print" && req.method === "POST") {
    return executePrintTransaction({
      serviceId: "SVC-RATION-PRINT",
      fallbackPrice: 25,
      fallbackName: "Ration Card Print",
      descriptionPrefix: "Ration Card Print",
      executor: async (input) => {
        const rationno = String(input.rationno || "").trim()
        if (!rationno) throw new Error("Ration Card Number is required")
        const card_type = String(input.card_type || "1")
        const res = await apiniceProvider.printRation({ rationno, card_type })
        return { ...res, identifier: rationno }
      },
    })
  }

  return false
}
