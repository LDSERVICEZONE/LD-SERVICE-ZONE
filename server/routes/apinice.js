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
  {
    id: "SVC-VEHICLE-CHALLAN",
    name: "Vehicle e-Challan Check",
    category: "Vehicle",
    customerPrice: 15,
    commission: 3,
    processingTime: "Instant",
    documents: ["Vehicle Registration Number"],
    color: "#F59E0B",
    status: "active",
  },
  {
    id: "SVC-ABHA-CARD",
    name: "ABHA Health Card Print",
    category: "Citizen",
    customerPrice: 35,
    commission: 5,
    processingTime: "Instant",
    documents: ["Aadhaar Number", "Date of Birth"],
    color: "#059669",
    status: "active",
  },
  {
    id: "SVC-VOTER-VERIFY",
    name: "Voter ID Verification",
    category: "Voter",
    customerPrice: 10,
    commission: 2,
    processingTime: "Instant",
    documents: ["EPIC / Voter ID Number"],
    color: "#6366F1",
    status: "active",
  },
  {
    id: "SVC-VOTER-PDF",
    name: "Voter Card PDF Download",
    category: "Voter",
    customerPrice: 55,
    commission: 5,
    processingTime: "Instant / 1-2 hrs",
    documents: ["EPIC / Voter ID Number", "State"],
    color: "#8B5CF6",
    status: "active",
  },
  {
    id: "SVC-VOTER-MOBILE-LINK",
    name: "Voter Mobile Link Without OTP",
    category: "Voter",
    customerPrice: 25,
    commission: 5,
    processingTime: "Instant (5 mins)",
    documents: ["EPIC / Voter ID Number", "10-digit Mobile Number"],
    color: "#EC4899",
    status: "active",
  },
  {
    id: "SVC-LL-PDF",
    name: "Learning Licence (LL) PDF",
    category: "Vehicle",
    customerPrice: 25,
    commission: 5,
    processingTime: "Instant",
    documents: ["Learning Licence Number / Application ID"],
    color: "#0284C7",
    status: "active",
  },
  {
    id: "SVC-CHASSIS-TO-RC",
    name: "Chassis Number to RC Details",
    category: "Vehicle",
    customerPrice: 60,
    commission: 10,
    processingTime: "Instant",
    documents: ["Vehicle Chassis Number"],
    color: "#D97706",
    status: "active",
  },
  {
    id: "SVC-RC-TO-MOBILE",
    name: "RC to Mobile Number Search",
    category: "Vehicle",
    customerPrice: 35,
    commission: 5,
    processingTime: "Instant",
    documents: ["Vehicle Registration Number"],
    color: "#2563EB",
    status: "active",
  },
  {
    id: "SVC-ESHRAM-CARD",
    name: "e-Shram Card PDF & Verification",
    category: "Citizen",
    customerPrice: 25,
    commission: 5,
    processingTime: "Instant",
    documents: ["Aadhaar Number", "Date of Birth"],
    color: "#EA580C",
    status: "active",
  },
  {
    id: "SVC-AADHAAR-PVC",
    name: "Aadhaar PVC Card Print",
    category: "Citizen",
    customerPrice: 25,
    commission: 5,
    processingTime: "Instant",
    documents: ["e-Aadhaar PDF", "PDF Password"],
    color: "#0284C7",
    status: "active",
  },
  {
    id: "SVC-AGRISTACK-FARMER",
    name: "AgriStack Farmer PDF Check",
    category: "Citizen",
    customerPrice: 20,
    commission: 5,
    processingTime: "Instant",
    documents: ["Farmer Aadhaar Number", "State"],
    color: "#16A34A",
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

  // 5. POST /api/apinice/vehicle-challan
  if (pathName === "/api/apinice/vehicle-challan" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-VEHICLE-CHALLAN",
      15,
      "Vehicle e-Challan Check",
    )
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

    const vehicleNumber = String(
      input.vehicle || input.vehicleNumber || input.rcno || "",
    )
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")

    if (!vehicleNumber) {
      return respond(400, { error: "Vehicle registration number is required." })
    }

    let result
    try {
      result = await apiniceProvider.checkVehicleChallan(vehicleNumber)
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to query vehicle challan from provider",
      })
    }

    // Provider call succeeded — atomically debit wallet and append to immutable ledger
    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `Vehicle e-Challan Check (${vehicleNumber})`

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
      serviceId: "SVC-VEHICLE-CHALLAN",
      referenceId: vehicleNumber,
      status: "SUCCESS",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-VEHICLE-CHALLAN",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: vehicleNumber,
      challanCount: result.challanCount,
      totalAmount: result.totalAmount,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-VEHICLE-CHALLAN",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      data: result,
      ledgerId: txId,
      transactionId: txId,
      message: `${svcConfig.name} completed successfully`,
    })
  }

  // 6. POST /api/apinice/abha-card
  if (pathName === "/api/apinice/abha-card" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-ABHA-CARD",
      35,
      "ABHA Health Card Print",
    )
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

    const uidNumber = String(
      input.uidNumber || input.aadhaar || input.aadhaarNo || "",
    )
      .trim()
      .replace(/[\s-]/g, "")
    const dob = String(input.dob || "").trim()

    if (!uidNumber || uidNumber.length !== 12) {
      return respond(400, {
        error: "Valid 12-digit Aadhaar / UID number is required.",
      })
    }
    if (!dob) {
      return respond(400, { error: "Date of Birth is required." })
    }

    let result
    try {
      result = await apiniceProvider.downloadAbhaCard({ uidNumber, dob })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to download ABHA card from provider",
      })
    }

    // Provider call succeeded — atomically debit wallet and append to immutable ledger
    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `ABHA Health Card Print (UID: ${uidNumber.slice(0, 4)}XXXX${uidNumber.slice(8)})`

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
      serviceId: "SVC-ABHA-CARD",
      referenceId: uidNumber,
      status: "SUCCESS",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-ABHA-CARD",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: uidNumber,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-ABHA-CARD",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      data: result,
      imageBase64: result.imageBase64,
      pdf: result.pdf,
      ledgerId: txId,
      transactionId: txId,
      message: `${svcConfig.name} generated successfully`,
    })
  }

  // 7. POST /api/apinice/voter-verify
  if (pathName === "/api/apinice/voter-verify" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-VOTER-VERIFY",
      10,
      "Voter ID Verification",
    )
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

    const epic = String(input.epic || input.epicNo || input.voterId || "").trim().toUpperCase().replace(/\s+/g, "")
    const stateId = String(input.stateId || input.state || "").trim().toUpperCase()

    if (!epic) {
      return respond(400, { error: "Voter ID / EPIC number is required." })
    }

    let result
    try {
      result = await apiniceProvider.verifyVoterId({ epic, stateId })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to verify Voter ID from provider",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `Voter ID Verification (EPIC: ${epic})`

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
      serviceId: "SVC-VOTER-VERIFY",
      referenceId: epic,
      status: "SUCCESS",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-VOTER-VERIFY",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: epic,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-VOTER-VERIFY",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      data: result.data,
      ledgerId: txId,
      transactionId: txId,
      message: "Voter details verified successfully",
    })
  }

  // 8. POST /api/apinice/voter-pdf
  if (pathName === "/api/apinice/voter-pdf" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-VOTER-PDF",
      55,
      "Voter Card PDF Download",
    )
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

    const epicNumber = String(input.epicNumber || input.epic || input.epicNo || "").trim().toUpperCase().replace(/\s+/g, "")
    const state = String(input.state || input.stateCode || "").trim().toUpperCase()
    const name = String(input.name || "").trim()

    if (!epicNumber) {
      return respond(400, { error: "Voter ID / EPIC number is required." })
    }
    if (!state) {
      return respond(400, { error: "State is required." })
    }

    const partnerRef = createId("VTR")

    let result
    try {
      result = await apiniceProvider.downloadVoterPdf({ epicNumber, state, name, partnerRef })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to download Voter Card PDF from provider",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `Voter Card PDF Download (EPIC: ${epicNumber}, State: ${state})`

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
      serviceId: "SVC-VOTER-PDF",
      referenceId: epicNumber,
      status: "SUCCESS",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-VOTER-PDF",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: epicNumber,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-VOTER-PDF",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      data: result,
      pdfUrl: result.pdfUrl,
      orderId: result.orderId,
      status: result.status,
      ledgerId: txId,
      transactionId: txId,
      message: "Voter Card PDF request processed successfully",
    })
  }

  // 9. POST /api/apinice/voter-mobile-link
  if (pathName === "/api/apinice/voter-mobile-link" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-VOTER-MOBILE-LINK",
      25,
      "Voter Mobile Link Without OTP",
    )
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

    const epic = String(input.epic || input.epicNo || input.voterId || "").trim().toUpperCase().replace(/\s+/g, "")
    const mobile = String(input.mobile || input.mobileNumber || "").trim().replace(/\D/g, "")

    if (!epic) {
      return respond(400, { error: "Voter ID / EPIC number is required." })
    }
    if (!mobile || mobile.length !== 10) {
      return respond(400, { error: "Valid 10-digit mobile number is required." })
    }

    let result
    try {
      result = await apiniceProvider.linkVoterMobile({ epic, mobile })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to initiate Voter mobile linking from provider",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `Voter Mobile Link Without OTP (EPIC: ${epic}, Mob: ${mobile})`

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
      serviceId: "SVC-VOTER-MOBILE-LINK",
      referenceId: epic,
      status: "SUCCESS",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-VOTER-MOBILE-LINK",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: epic,
      mobile,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-VOTER-MOBILE-LINK",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      data: result,
      refId: result.refId,
      applicationNo: result.applicationNo,
      ledgerId: txId,
      transactionId: txId,
      message: result.message || "Voter mobile link request submitted successfully",
    })
  }

  // 10. POST /api/apinice/ll-pdf
  if (pathName === "/api/apinice/ll-pdf" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-LL-PDF",
      25,
      "Learning Licence (LL) PDF",
    )
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

    const idNumber = String(input.idNumber || input.llNo || input.llNumber || "").trim().toUpperCase().replace(/\s+/g, "")

    if (!idNumber) {
      return respond(400, { error: "Learning Licence (LL) number or ID is required." })
    }

    let result
    try {
      result = await apiniceProvider.fetchLearningLicencePdf({ idNumber })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to download Learning Licence PDF from provider",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `Learning Licence PDF Download (LL: ${idNumber})`

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
      serviceId: "SVC-LL-PDF",
      referenceId: idNumber,
      status: "SUCCESS",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-LL-PDF",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: idNumber,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-LL-PDF",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      data: result,
      pdfBase64: result.pdfBase64,
      ledgerId: txId,
      transactionId: txId,
      message: "Learning Licence PDF generated successfully",
    })
  }

  // 11. POST /api/apinice/chassis-to-rc
  if (pathName === "/api/apinice/chassis-to-rc" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-CHASSIS-TO-RC",
      60,
      "Chassis Number to RC Details",
    )
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

    const chassisNumber = String(input.chassisNumber || input.chassisNo || "").trim().toUpperCase().replace(/\s+/g, "")

    if (!chassisNumber) {
      return respond(400, { error: "Vehicle chassis number is required." })
    }

    let result
    try {
      result = await apiniceProvider.lookupChassisToRc({ chassisNumber })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to find vehicle details from chassis number",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `Chassis to RC Search (Chassis: ${chassisNumber})`

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
      serviceId: "SVC-CHASSIS-TO-RC",
      referenceId: chassisNumber,
      status: "SUCCESS",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-CHASSIS-TO-RC",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: chassisNumber,
      plate: result.plate,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-CHASSIS-TO-RC",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      data: result,
      plate: result.plate,
      fullName: result.fullName,
      relationName: result.relationName,
      queryResult: result.queryResult,
      location: result.location,
      ledgerId: txId,
      transactionId: txId,
      message: "Vehicle details found successfully",
    })
  }

  // 12. POST /api/apinice/rc-to-mobile
  if (pathName === "/api/apinice/rc-to-mobile" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-RC-TO-MOBILE",
      35,
      "RC to Mobile Number Search",
    )
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

    const vehicleNumber = String(input.vehicleNumber || input.rcno || input.plate || input.vehicleNo || "").trim().toUpperCase().replace(/[\s-]/g, "")

    if (!vehicleNumber) {
      return respond(400, { error: "Vehicle registration number is required." })
    }

    let result
    try {
      result = await apiniceProvider.lookupRcToMobile({ vehicleNumber })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to find registered mobile number from vehicle RC",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `RC to Mobile Search (Vehicle: ${vehicleNumber})`

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
      serviceId: "SVC-RC-TO-MOBILE",
      referenceId: vehicleNumber,
      status: "SUCCESS",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-RC-TO-MOBILE",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: vehicleNumber,
      contact: result.contact,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-RC-TO-MOBILE",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      data: result,
      holder: result.holder,
      fullName: result.fullName,
      relationName: result.relationName,
      contact: result.contact,
      ledgerId: txId,
      transactionId: txId,
      message: "RC mobile contact found successfully",
    })
  }

  // 13. POST /api/apinice/eshram-card
  if (pathName === "/api/apinice/eshram-card" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-ESHRAM-CARD",
      25,
      "e-Shram Card PDF & Verification",
    )
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

    const uidNumber = String(input.uidNumber || input.aadhaar || input.aadhaarNo || input.uid || "").trim().replace(/[\s-]/g, "")
    const dob = String(input.dob || "").trim()

    if (!uidNumber || uidNumber.length !== 12) {
      return respond(400, { error: "Valid 12-digit Aadhaar (UID) number is required." })
    }
    if (!dob) {
      return respond(400, { error: "Date of Birth is required." })
    }

    let result
    try {
      result = await apiniceProvider.downloadEshramCard({ uidNumber, dob })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to download e-Shram card from provider",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `e-Shram Card Download (UID: ${uidNumber.slice(0, 4)}XXXX${uidNumber.slice(8)})`

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
      serviceId: "SVC-ESHRAM-CARD",
      referenceId: uidNumber,
      status: "SUCCESS",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-ESHRAM-CARD",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: uidNumber,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-ESHRAM-CARD",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      data: result,
      pdfBase64: result.pdfBase64,
      ledgerId: txId,
      transactionId: txId,
      message: "e-Shram card PDF downloaded successfully",
    })
  }

  // 14. POST /api/apinice/aadhar-pvc
  if (pathName === "/api/apinice/aadhar-pvc" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-AADHAAR-PVC",
      25,
      "Aadhaar PVC Card Print",
    )
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

    const pdfBase64 = String(input.pdfBase64 || input.file || input.pdf || "").trim()
    const password = String(input.password || "").trim()
    const mobilePrint = String(input.mobilePrint || "Yes").trim()
    const cardColor = String(input.cardColor || "White").trim()

    if (!pdfBase64) {
      return respond(400, { error: "e-Aadhaar PDF file or base64 stream is required." })
    }
    if (!password) {
      return respond(400, { error: "e-Aadhaar PDF password is required." })
    }

    let result
    try {
      result = await apiniceProvider.convertAadhaarPvc({
        pdfBase64,
        password,
        mobilePrint,
        cardColor,
      })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to convert Aadhaar to PVC card format",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `Aadhaar PVC Card Print (${cardColor} Border)`

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
      serviceId: "SVC-AADHAAR-PVC",
      referenceId: txId,
      status: "SUCCESS",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-AADHAAR-PVC",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      cardColor,
      mobilePrint,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-AADHAAR-PVC",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      data: result,
      pdfBase64: result.pdfBase64,
      ledgerId: txId,
      transactionId: txId,
      message: "Aadhaar PVC card format generated successfully",
    })
  }

  // 15. POST /api/apinice/agristack-farmer
  if (pathName === "/api/apinice/agristack-farmer" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-AGRISTACK-FARMER",
      20,
      "AgriStack Farmer PDF Check",
    )
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

    const uidNumber = String(input.uidNumber || input.aadhaar || input.aadhaarNo || input.uid || "").trim().replace(/[\s-]/g, "")
    const state = String(input.state || input.stateCode || "OD").trim().toUpperCase()

    if (!uidNumber || uidNumber.length !== 12) {
      return respond(400, { error: "Valid 12-digit Farmer Aadhaar (UID) number is required." })
    }
    if (!state) {
      return respond(400, { error: "Farmer State is required (e.g. UP, BR, MH, OD, RJ, MP)." })
    }

    let result
    try {
      result = await apiniceProvider.fetchAgristackFarmerPdf({ uidNumber, state })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to find approved farmer record in AgriStack registry",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `AgriStack Farmer PDF (${result.name ? result.name + ", " : ""}UID: ${uidNumber.slice(0, 4)}XXXX${uidNumber.slice(8)})`

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
      serviceId: "SVC-AGRISTACK-FARMER",
      referenceId: uidNumber,
      status: "SUCCESS",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-AGRISTACK-FARMER",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: uidNumber,
      state,
      farmerName: result.name,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-AGRISTACK-FARMER",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      data: result,
      name: result.name,
      pdfBase64: result.pdfBase64,
      applicationNo: result.applicationNo,
      ledgerId: txId,
      transactionId: txId,
      message: "AgriStack farmer document generated successfully",
    })
  }

  return false
}
