import { parseJson } from "../lib/http.js"
import { createId, now } from "../lib/ids.js"
import { apiniceProvider } from "../services/apiniceProvider.js"

export const DEFAULT_APINICE_SERVICES = [
  {
    id: "SVC-RC-PRINT",
    name: "RC Smart Card Print",
    category: "Vehicle Services",
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
    category: "Vehicle Services",
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
    category: "Citizen Documents",
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
    category: "Vehicle Services",
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
    category: "Aadhaar Services",
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
    category: "Voter Services",
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
    category: "Voter Services",
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
    category: "Voter Services",
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
    category: "Vehicle Services",
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
    category: "Vehicle Services",
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
    category: "Vehicle Services",
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
    category: "Aadhaar Services",
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
    category: "Aadhaar Services",
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
    category: "Citizen Documents",
    customerPrice: 20,
    commission: 5,
    processingTime: "Instant",
    documents: ["Farmer Aadhaar Number", "State"],
    color: "#16A34A",
    status: "active",
  },
  {
    id: "SVC-UDYOG-AADHAAR",
    name: "Udyog Aadhaar (MSME) Details",
    category: "Citizen Documents",
    customerPrice: 15,
    commission: 5,
    processingTime: "Instant",
    documents: ["Udyam Registration Number (UAN)"],
    color: "#D97706",
    status: "active",
  },
  {
    id: "SVC-NPCI-STATUS",
    name: "NPCI Aadhaar-Bank Link Status",
    category: "Aadhaar Services",
    customerPrice: 20,
    commission: 5,
    processingTime: "Instant",
    documents: ["Aadhaar Number (12-digit)"],
    color: "#2563EB",
    status: "active",
  },
  {
    id: "SVC-GST-DETAILS",
    name: "GST Number Details Verification",
    category: "Utilities & Banking",
    customerPrice: 10,
    commission: 2,
    processingTime: "Instant",
    documents: ["GSTIN Number (15-character)"],
    color: "#4F46E5",
    status: "active",
  },
  {
    id: "SVC-PASSPORT-VERIFY",
    name: "Passport Details Verification",
    category: "Citizen Documents",
    customerPrice: 20,
    commission: 5,
    processingTime: "Instant",
    documents: ["Passport File Number (15-char)", "Date of Birth"],
    color: "#0D9488",
    status: "active",
  },
  {
    id: "SVC-IFSC-DETAILS",
    name: "Bank IFSC Code Details",
    category: "Utilities & Banking",
    customerPrice: 5,
    commission: 1,
    processingTime: "Instant",
    documents: ["11-character Bank IFSC Code"],
    color: "#2563EB",
    status: "active",
  },
  {
    id: "SVC-ELECTRIC-BILL",
    name: "Electricity Bill PDF Download",
    category: "Utilities & Banking",
    customerPrice: 15,
    commission: 3,
    processingTime: "Instant",
    documents: ["Consumer / CA Number"],
    color: "#EAB308",
    status: "active",
  },
  {
    id: "SVC-PAN-FIND",
    name: "PAN Find by Aadhaar",
    category: "PAN Card Services",
    customerPrice: 20,
    commission: 5,
    processingTime: "Instant",
    documents: ["12-digit Aadhaar Number"],
    color: "#4F46E5",
    status: "active",
  },
  {
    id: "SVC-PAN-DETAILS",
    name: "PAN Details Verification",
    category: "PAN Card Services",
    customerPrice: 15,
    commission: 3,
    processingTime: "Instant",
    documents: ["10-character PAN Number"],
    color: "#6366F1",
    status: "active",
  },
  {
    id: "SVC-VOTER-MANUAL-PDF",
    name: "Voter Manual PDF Instant (v2)",
    category: "Voter Services",
    customerPrice: 25,
    commission: 5,
    processingTime: "Instant",
    documents: ["EPIC Number", "Full Name", "Father Name", "Tahshil", "Address", "Language", "Applicant Photo"],
    color: "#7C3AED",
    status: "active",
  },
  {
    id: "SVC-AADHAAR-MANUAL",
    name: "Aadhaar Manual Print (v2)",
    category: "Aadhaar Services",
    customerPrice: 25,
    commission: 5,
    processingTime: "Instant",
    documents: ["Aadhaar Number", "Full Name", "Father Name", "DOB", "Address", "Language", "Photo"],
    color: "#059669",
    status: "active",
  },
  {
    id: "SVC-PAN-PRINT-V2",
    name: "PAN Card High-Res Manual Print (v2)",
    category: "PAN Card Services",
    customerPrice: 25,
    commission: 5,
    processingTime: "Instant",
    documents: ["PAN Number", "Full Name", "Father Name", "DOB", "Card Type", "Photo", "Signature"],
    color: "#4338CA",
    status: "active",
  },
  {
    id: "SVC-GST-TO-PAN",
    name: "GST to PAN Verification",
    category: "PAN Card Services",
    customerPrice: 15,
    commission: 3,
    processingTime: "Instant",
    documents: ["15-character GSTIN Number"],
    color: "#2563EB",
    status: "active",
  },
  {
    id: "SVC-PAN-TO-GST",
    name: "PAN to GST Verification",
    category: "PAN Card Services",
    customerPrice: 10,
    commission: 2,
    processingTime: "Instant",
    documents: ["10-character PAN Number"],
    color: "#0D9488",
    status: "active",
  },
  {
    id: "SVC-PAN-TO-AADHAAR",
    name: "PAN to Aadhaar Find",
    category: "PAN Card Services",
    customerPrice: 50,
    commission: 5,
    processingTime: "Instant",
    documents: ["10-character PAN Number"],
    color: "#7C3AED",
    status: "active",
  },
  {
    id: "SVC-MOBILE-TO-RC",
    name: "Mobile to RC Find",
    category: "Vehicle Services",
    customerPrice: 20,
    commission: 5,
    processingTime: "Instant",
    documents: ["10-digit Registered Mobile Number"],
    color: "#2563EB",
    status: "active",
  },
  {
    id: "SVC-PAN-ADDRESS-DETAILS",
    name: "PAN Card Address Details",
    category: "PAN Card Services",
    customerPrice: 15,
    commission: 3,
    processingTime: "Instant",
    documents: ["10-character PAN Number"],
    color: "#4F46E5",
    status: "active",
  },
  {
    id: "SVC-PAN-OCR",
    name: "PAN Card Details by PAN Image",
    category: "PAN Card Services",
    customerPrice: 15,
    commission: 3,
    processingTime: "Instant",
    documents: ["PAN Card Image (JPG/PNG)"],
    color: "#0891B2",
    status: "active",
  },
]

export function seedApiniceServices(db) {
  if (!Array.isArray(db.services)) {
    db.services = []
  }
  for (const def of DEFAULT_APINICE_SERVICES) {
    const existing = db.services.find((s) => s.id === def.id)
    if (!existing) {
      db.services.push({
        ...def,
        provider: "apinice",
        createdAt: now(),
        updatedAt: now(),
      })
    } else {
      existing.provider = "apinice"
      if (!existing.category) existing.category = def.category
      if (!existing.name) existing.name = def.name
      if (!existing.processingTime) existing.processingTime = def.processingTime || "Instant"
      if (existing.customerPrice === undefined || existing.customerPrice === null) {
        existing.customerPrice = def.customerPrice
      }
      if (existing.commission === undefined || existing.commission === null) {
        existing.commission = def.commission
      }
      if (!Array.isArray(existing.documents) || existing.documents.length === 0) {
        existing.documents = [...def.documents]
      }
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

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

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
      wallet.balance = balanceBefore
      wallet.updatedAt = now()
      return respond(400, {
        error: apiErr.message || "Provider service failed",
      })
    }

    const txId = createId("TXN")
    const description = `${descriptionPrefix} (${result.identifier || result.dlno || result.rcno || result.rationno})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    const ledgerEntry = {
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId,
      referenceId: result.identifier || null,
      status: "success",
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
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-VEHICLE-CHALLAN",
      referenceId: vehicleNumber,
      status: "success",
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
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-ABHA-CARD",
      referenceId: uidNumber,
      status: "success",
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
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-VOTER-VERIFY",
      referenceId: epic,
      status: "success",
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
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-VOTER-PDF",
      referenceId: epicNumber,
      status: "success",
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
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-VOTER-MOBILE-LINK",
      referenceId: epic,
      status: "success",
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
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-LL-PDF",
      referenceId: idNumber,
      status: "success",
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
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-CHASSIS-TO-RC",
      referenceId: chassisNumber,
      status: "success",
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
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-RC-TO-MOBILE",
      referenceId: vehicleNumber,
      status: "success",
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
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-ESHRAM-CARD",
      referenceId: uidNumber,
      status: "success",
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
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-AADHAAR-PVC",
      referenceId: txId,
      status: "success",
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
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-AGRISTACK-FARMER",
      referenceId: uidNumber,
      status: "success",
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

  // 16. POST /api/apinice/udyog-aadhaar
  if (pathName === "/api/apinice/udyog-aadhaar" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-UDYOG-AADHAAR",
      15,
      "Udyog Aadhaar (MSME) Details",
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

    const uan = String(input.uan || input.uam || "").trim().toUpperCase()

    if (!uan) {
      return respond(400, { error: "Valid Udyam Registration Number (UAN) is required (e.g. UDYAM-XX-00-0000000)." })
    }

    let result
    try {
      result = await apiniceProvider.fetchUdyogAadhaar({ uan })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to find Udyog Aadhaar registration record",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `Udyog Aadhaar Verification (${result.enterpriseName ? result.enterpriseName + ", " : ""}UAN: ${uan})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    const ledgerEntry = {
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-UDYOG-AADHAAR",
      referenceId: uan,
      status: "success",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-UDYOG-AADHAAR",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: uan,
      enterpriseName: result.enterpriseName,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-UDYOG-AADHAAR",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      data: result,
      uan,
      enterpriseName: result.enterpriseName,
      certificateUrl: result.certificateUrl,
      mainDetails: result.mainDetails,
      plants: result.plants,
      nicCode: result.nicCode,
      ledgerId: txId,
      transactionId: txId,
      message: "Udyog Aadhaar enterprise details retrieved successfully",
    })
  }

  // 17. POST /api/apinice/npci-status
  if (pathName === "/api/apinice/npci-status" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-NPCI-STATUS",
      20,
      "NPCI Aadhaar-Bank Link Status",
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

    const aadhaar = String(input.aadhaar || input.aadhar || input.uidNumber || "").trim().replace(/[\s-]/g, "")

    if (!aadhaar || aadhaar.length !== 12) {
      return respond(400, { error: "Valid 12-digit Aadhaar number is required." })
    }

    let result
    try {
      result = await apiniceProvider.checkNpciAadhaarStatus({ aadhaar })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to check NPCI Aadhaar bank link status",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `NPCI Aadhaar Link Status (${result.bank ? result.bank + ", " : ""}UID: ${aadhaar.slice(0, 4)}XXXX${aadhaar.slice(8)})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    const ledgerEntry = {
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-NPCI-STATUS",
      referenceId: aadhaar,
      status: "success",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-NPCI-STATUS",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: aadhaar,
      bank: result.bank,
      linkStatus: result.status,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-NPCI-STATUS",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      data: result,
      aadhaar,
      bank: result.bank,
      status: result.status,
      lastUpdate: result.lastUpdate,
      ledgerId: txId,
      transactionId: txId,
      message: "NPCI Aadhaar bank mapping status retrieved successfully",
    })
  }

  // 18. POST /api/apinice/gst-details
  if (pathName === "/api/apinice/gst-details" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-GST-DETAILS",
      10,
      "GST Number Details Verification",
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

    const gst = String(input.gst || input.gstin || "").trim().toUpperCase()

    if (!gst || gst.length !== 15) {
      return respond(400, { error: "Valid 15-character GSTIN number is required (e.g. 24AAACC1206D1ZM)." })
    }

    let result
    try {
      result = await apiniceProvider.fetchGstDetails({ gst })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to find GST details",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `GST Verification (${result.details?.legalName ? result.details.legalName + ", " : ""}GSTIN: ${gst})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    const ledgerEntry = {
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-GST-DETAILS",
      referenceId: gst,
      status: "success",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-GST-DETAILS",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: gst,
      legalName: result.details?.legalName,
      tradeName: result.details?.tradeName,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-GST-DETAILS",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      data: result,
      gst,
      details: result.details,
      legalName: result.details?.legalName,
      tradeName: result.details?.tradeName,
      status: result.details?.status,
      ledgerId: txId,
      transactionId: txId,
      message: "GSTIN registration details retrieved successfully",
    })
  }

  // 19. POST /api/apinice/passport-verify
  if (pathName === "/api/apinice/passport-verify" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-PASSPORT-VERIFY",
      20,
      "Passport Details Verification",
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

    const fileNo = String(input.fileNo || input.file_no || input.fileNumber || "").trim().toUpperCase()
    const dob = String(input.dob || input.dateOfBirth || "").trim()

    if (!fileNo) {
      return respond(400, { error: "Valid Passport File Number is required (e.g. CA1073849182390)." })
    }
    if (!dob) {
      return respond(400, { error: "Citizen Date of Birth (DD-MM-YYYY) is required." })
    }

    let result
    try {
      result = await apiniceProvider.verifyPassport({ fileNo, dob })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to verify passport details",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `Passport Verification (${result.holderName ? result.holderName + ", " : ""}File: ${fileNo})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    const ledgerEntry = {
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-PASSPORT-VERIFY",
      referenceId: fileNo,
      status: "success",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-PASSPORT-VERIFY",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: fileNo,
      holderName: result.holderName,
      passportNumber: result.passportNumber,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-PASSPORT-VERIFY",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      data: result,
      fileNo,
      holderName: result.holderName,
      passportNumber: result.passportNumber,
      dob: result.dob,
      applicationDate: result.applicationDate,
      ledgerId: txId,
      transactionId: txId,
      message: "Passport details verified successfully",
    })
  }

  // 20. POST /api/apinice/ifsc-details
  if (pathName === "/api/apinice/ifsc-details" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-IFSC-DETAILS",
      5,
      "Bank IFSC Code Details",
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

    const ifsc = String(input.ifsc || input.ifscCode || input.ifsc_code || "").trim().toUpperCase()

    if (!ifsc || ifsc.length !== 11) {
      return respond(400, { error: "Valid 11-character Bank IFSC Code is required (e.g. SBIN0001234)." })
    }

    let result
    try {
      result = await apiniceProvider.lookupIfscDetails({ ifsc })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to lookup bank IFSC details",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `Bank IFSC Lookup (${result.bank || "Bank"}, ${result.branch || "Branch"} - IFSC: ${ifsc})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    const ledgerEntry = {
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-IFSC-DETAILS",
      referenceId: ifsc,
      status: "success",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-IFSC-DETAILS",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: ifsc,
      bank: result.bank,
      branch: result.branch,
      city: result.city,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-IFSC-DETAILS",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      data: result,
      ifsc,
      bank: result.bank,
      branch: result.branch,
      city: result.city,
      district: result.district,
      state: result.state,
      address: result.address,
      contact: result.contact,
      micr: result.micr,
      imps: result.imps,
      neft: result.neft,
      rtgs: result.rtgs,
      upi: result.upi,
      ledgerId: txId,
      transactionId: txId,
      message: "Bank IFSC details fetched successfully",
    })
  }

  // 21. POST /api/apinice/electric-bill-pdf
  if (pathName === "/api/apinice/electric-bill-pdf" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-ELECTRIC-BILL",
      15,
      "Electricity Bill PDF Download",
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

    const caNumber = String(
      input.caNumber || input.ca_number || input.consumerNumber || input.consumer_no || "",
    ).trim().toUpperCase()

    if (!caNumber) {
      return respond(400, { error: "Valid Consumer / CA Number is required." })
    }

    let result
    try {
      result = await apiniceProvider.downloadElectricBillPdf({ caNumber })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to download electricity bill PDF",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `Electricity Bill PDF Download (CA No: ${caNumber})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    const ledgerEntry = {
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-ELECTRIC-BILL",
      referenceId: caNumber,
      status: "success",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-ELECTRIC-BILL",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: caNumber,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-ELECTRIC-BILL",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      caNumber,
      pdf: result.pdf,
      data: result,
      ledgerId: txId,
      transactionId: txId,
      message: "Electricity bill PDF downloaded successfully",
    })
  }

  // 22. POST /api/apinice/find-pan
  if (pathName === "/api/apinice/find-pan" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-PAN-FIND",
      20,
      "PAN Find by Aadhaar",
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

    const aadhaarNo = String(
      input.aadhaarNo || input.aadhaar_no || input.aadhaar || "",
    ).replace(/\s+/g, "")

    if (!aadhaarNo || aadhaarNo.length !== 12 || !/^\d{12}$/.test(aadhaarNo)) {
      return respond(400, { error: "Valid 12-digit Aadhaar number is required." })
    }

    let result
    try {
      result = await apiniceProvider.findPanByAadhaar({ aadhaarNo, provider: input.provider || "zone" })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to find PAN by Aadhaar",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const maskedAadhaar = `XXXX-XXXX-${aadhaarNo.slice(-4)}`
    const description = `Instant PAN Find (${result.panNumber ? result.panNumber + " - " : ""}${maskedAadhaar})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    const ledgerEntry = {
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-PAN-FIND",
      referenceId: result.panNumber || aadhaarNo,
      status: "success",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-PAN-FIND",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: maskedAadhaar,
      panNumber: result.panNumber,
      fullName: result.fullName,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-PAN-FIND",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      panNumber: result.panNumber,
      fullName: result.fullName,
      maskedAadhaar,
      aadhaar: maskedAadhaar,
      data: result,
      ledgerId: txId,
      transactionId: txId,
      message: "PAN found successfully",
    })
  }

  // 23. POST /api/apinice/pan-details
  if (pathName === "/api/apinice/pan-details" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-PAN-DETAILS",
      15,
      "PAN Details Verification",
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

    const panNo = String(
      input.panNo || input.pan_no || input.pan || input.panno || "",
    ).trim().toUpperCase()

    if (!panNo || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNo)) {
      return respond(400, { error: "Valid 10-character PAN number is required (e.g. ABCDE1234F)." })
    }

    let result
    try {
      result = await apiniceProvider.verifyPanDetails({ panNo })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to verify PAN details",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `PAN Details Verification (${result.name ? result.name + ", " : ""}${panNo})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    const ledgerEntry = {
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-PAN-DETAILS",
      referenceId: panNo,
      status: "success",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-PAN-DETAILS",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: panNo,
      name: result.name,
      fatherName: result.fatherName,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-PAN-DETAILS",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      panNumber: result.panNumber,
      name: result.name,
      fatherName: result.fatherName,
      dob: result.dob,
      gender: result.gender,
      data: result,
      ledgerId: txId,
      transactionId: txId,
      message: "PAN details verified successfully",
    })
  }

  // 23. POST /api/apinice/voter-manual-pdf
  if (pathName === "/api/apinice/voter-manual-pdf" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-VOTER-MANUAL-PDF",
      25,
      "Voter Manual PDF Instant (v2)"
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

    const epicNo = String(input.epic_no || input.epic || "").trim().toUpperCase()
    const name = String(input.name || "").trim().toUpperCase()
    const gender = String(input.gender || "").trim().toUpperCase()
    const fatherName = String(input.father_name || input.fatherName || "").trim()
    const tahshil = String(input.tahshil || "").trim()
    const address = String(input.address || "").trim()
    const language = String(input.language || "HI").trim().toUpperCase()
    const photoBase64 = String(input.photoBase64 || input.imageBase64 || input.photo || "").trim()

    if (!epicNo) {
      return respond(400, { error: "Voter EPIC / ID Number is required." })
    }
    if (!name) {
      return respond(400, { error: "Voter full name in English is required." })
    }
    if (!gender) {
      return respond(400, { error: "Gender is required (MALE, FEMALE, or OTHER)." })
    }
    if (!fatherName) {
      return respond(400, { error: "Father or Husband name in English is required." })
    }
    if (!tahshil) {
      return respond(400, { error: "Tahshil / Block name is required." })
    }
    if (!address) {
      return respond(400, { error: "Full address in English is required." })
    }
    if (!photoBase64) {
      return respond(400, { error: "Applicant photo is required (JPEG/PNG, max 2MB)." })
    }

    let result
    try {
      result = await apiniceProvider.generateVoterManualPdf({
        epic_no: epicNo,
        name,
        gender,
        father_name: fatherName,
        tahshil,
        address,
        language,
        photoBase64,
        name_local: input.name_local,
        age: input.age,
        gender_local: input.gender_local,
        father_type: input.father_type,
        father_name_local: input.father_name_local,
        dob_local: input.dob_local,
        district: input.district,
        assembly_no_name: input.assembly_no_name,
        assembly_no_name_local: input.assembly_no_name_local,
        part_no: input.part_no,
        part_name: input.part_name,
        part_name_local: input.part_name_local,
        address_local: input.address_local,
      })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to generate Voter ID manual card PDF.",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `Voter Manual PDF Instant (${epicNo})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    const ledgerEntry = {
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-VOTER-MANUAL-PDF",
      referenceId: epicNo,
      status: "success",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-VOTER-MANUAL-PDF",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: epicNo,
      name,
      language,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-VOTER-MANUAL-PDF",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      epicNo,
      name,
      pdfUrl: result.pdfUrl,
      pdfBase64: result.pdfBase64,
      data: result,
      ledgerId: txId,
      transactionId: txId,
      message: "Voter card manual PDF generated successfully",
    })
  }

  // 24. POST /api/apinice/aadhar-manual
  if (pathName === "/api/apinice/aadhar-manual" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-AADHAAR-MANUAL",
      25,
      "Aadhaar Manual Print (v2)"
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

    const aadharno = String(input.aadharno || input.aadhaar || "").trim().replace(/\D/g, "")
    const name = String(input.name || "").trim()
    const fathername = String(input.fathername || input.father_name || "").trim()
    const dobadhar = String(input.dobadhar || input.dob || "").trim()
    const gender = String(input.gender || "Male").trim()
    const houseno = String(input.houseno || "").trim()
    const streetlocality = String(input.streetlocality || input.street || "").trim()
    const vtcandpost = String(input.vtcandpost || input.vtc || "").trim()
    const city = String(input.city || "").trim()
    const state = String(input.state || "").trim()
    const pincode = String(input.pincode || "").trim().replace(/\D/g, "")
    const language = String(input.language || "HI").trim().toUpperCase()
    const namelocal = String(input.namelocal || "").trim()
    const addresslocal = String(input.addresslocal || "").trim()
    const photoBase64 = String(input.photoBase64 || input.imageBase64 || input.photo || "").trim()

    if (!aadharno || aadharno.length !== 12) {
      return respond(400, { error: "Valid 12-digit Aadhaar number is required." })
    }
    if (!name) {
      return respond(400, { error: "Full name in English is required." })
    }
    if (!fathername) {
      return respond(400, { error: "Father/Guardian name in English is required." })
    }
    if (!dobadhar) {
      return respond(400, { error: "Date of birth is required." })
    }
    if (!houseno) {
      return respond(400, { error: "House/Building number is required." })
    }
    if (!streetlocality) {
      return respond(400, { error: "Street/Locality name is required." })
    }
    if (!vtcandpost) {
      return respond(400, { error: "Village/Town/Post Office is required." })
    }
    if (!city) {
      return respond(400, { error: "City or District name is required." })
    }
    if (!state) {
      return respond(400, { error: "State name is required." })
    }
    if (!pincode || pincode.length !== 6) {
      return respond(400, { error: "Valid 6-digit PIN code is required." })
    }
    if (!namelocal) {
      return respond(400, { error: "Name in local language script is required." })
    }
    if (!addresslocal) {
      return respond(400, { error: "Full address in local language script is required." })
    }
    if (!photoBase64) {
      return respond(400, { error: "Applicant photo is required (JPEG/PNG, max 2MB)." })
    }

    let result
    try {
      result = await apiniceProvider.generateAadhaarManual({
        aadharno,
        name,
        fathername,
        dobadhar,
        gender,
        houseno,
        streetlocality,
        vtcandpost,
        city,
        state,
        pincode,
        address: input.address,
        language,
        namelocal,
        birththithilocal: input.birththithilocal,
        genderlocal: input.genderlocal,
        addresslocal,
        photoBase64,
      })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to generate Aadhaar card manual print PDF.",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `Aadhaar Manual Print (XXXX-XXXX-${aadharno.slice(-4)})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    const ledgerEntry = {
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-AADHAAR-MANUAL",
      referenceId: aadharno,
      status: "success",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-AADHAAR-MANUAL",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: `XXXX-XXXX-${aadharno.slice(-4)}`,
      name,
      language,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-AADHAAR-MANUAL",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      aadhaarNo: aadharno,
      name,
      pdfUrl: result.pdfUrl,
      pdfBase64: result.pdfBase64,
      image: result.image,
      data: result,
      ledgerId: txId,
      transactionId: txId,
      message: "Aadhaar card manual print PDF generated successfully",
    })
  }

  // 25. POST /api/apinice/pan-print-v2
  if (pathName === "/api/apinice/pan-print-v2" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    const svcConfig = getServiceConfig(
      db,
      "SVC-PAN-PRINT-V2",
      25,
      "PAN Card High-Res Manual Print (v2)"
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

    const pan = String(input.pan || input.panno || "").trim().toUpperCase().replace(/\s+/g, "")
    const name = String(input.name || "").trim()
    const father_name = String(input.father_name || input.fatherName || "").trim()
    const dob = String(input.dob || "").trim()
    const gender = String(input.gender || "Male").trim()
    const pan_type = String(input.pan_type || "UTI-NONMINOR").trim().toUpperCase()
    const photoBase64 = String(input.photoBase64 || input.photo || "").trim()
    const signatureBase64 = String(input.signatureBase64 || input.signature || "").trim()

    if (!pan || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      return respond(400, { error: "Valid 10-character PAN number is required (e.g. ABCDE1234F)." })
    }
    if (!name) {
      return respond(400, { error: "Full name on PAN Card is required." })
    }
    if (!father_name) {
      return respond(400, { error: "Father's name on PAN Card is required." })
    }
    if (!dob) {
      return respond(400, { error: "Date of birth is required." })
    }
    if (!photoBase64) {
      return respond(400, { error: "Applicant photo is required." })
    }

    const isMinor = pan_type.includes("MINOR") && !pan_type.includes("NONMINOR")
    if (!isMinor && !signatureBase64) {
      return respond(400, { error: "Applicant signature is required for adult / NONMINOR cards." })
    }

    let result
    try {
      result = await apiniceProvider.generatePanCardPrintV2({
        pan,
        name,
        father_name,
        dob,
        gender,
        pan_type,
        photoBase64,
        signatureBase64,
      })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to generate PAN card manual print.",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `PAN Card Manual Print (${pan} - ${pan_type})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    const ledgerEntry = {
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-PAN-PRINT-V2",
      referenceId: pan,
      status: "success",
      createdAt: now(),
    }
    db.walletLedger.unshift(ledgerEntry)

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-PAN-PRINT-V2",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: pan,
      name,
      pan_type,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-PAN-PRINT-V2",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      panNumber: pan,
      name,
      panType: pan_type,
      pdfUrl: result.pdfUrl,
      pdfBase64: result.pdfBase64,
      data: result,
      ledgerId: txId,
      transactionId: txId,
      message: "High-resolution PAN card print generated successfully",
    })
  }

  // 25. POST /api/apinice/gst-to-pan
  if (pathName === "/api/apinice/gst-to-pan" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    let input = {}
    try {
      input = await parseJson(req)
    } catch {
      input = {}
    }

    const gst = String(input.gst || input.gstin || "").trim().toUpperCase().replace(/\s+/g, "")
    if (!gst || gst.length !== 15) {
      return respond(400, { error: "Valid 15-character GSTIN number is required (e.g. 24AAACC1206D1ZM)." })
    }

    const svcConfig = getServiceConfig(
      db,
      "SVC-GST-TO-PAN",
      15,
      "GST to PAN Verification"
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

    let result
    try {
      result = await apiniceProvider.fetchGstToPan({ gst })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to find linked PAN from GST number.",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `GST to PAN Verification (GSTIN: ${gst}, PAN: ${result.pan})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    db.walletLedger.unshift({
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-GST-TO-PAN",
      referenceId: gst,
      status: "success",
      createdAt: now(),
    })

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-GST-TO-PAN",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: gst,
      pan: result.pan,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-GST-TO-PAN",
      serviceId: "SVC-GST-TO-PAN",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      gst,
      pan: result.pan,
      data: result,
      ledgerId: txId,
      transactionId: txId,
      message: "GST to PAN linked record retrieved successfully",
    })
  }

  // 26. POST /api/apinice/pan-to-gst
  if (pathName === "/api/apinice/pan-to-gst" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    let input = {}
    try {
      input = await parseJson(req)
    } catch {
      input = {}
    }

    const pan = String(input.pan || input.panno || "").trim().toUpperCase().replace(/\s+/g, "")
    if (!pan || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      return respond(400, { error: "Valid 10-character PAN number is required (e.g. ABCDE1234F)." })
    }

    const svcConfig = getServiceConfig(
      db,
      "SVC-PAN-TO-GST",
      10,
      "PAN to GST Verification"
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

    let result
    try {
      result = await apiniceProvider.fetchPanToGst({ pan })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to find registered GST numbers for this PAN.",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `PAN to GST Verification (PAN: ${pan}, ${result.count || 0} GSTINs found)`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    db.walletLedger.unshift({
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-PAN-TO-GST",
      referenceId: pan,
      status: "success",
      createdAt: now(),
    })

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-PAN-TO-GST",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: pan,
      gstCount: result.count,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-PAN-TO-GST",
      serviceId: "SVC-PAN-TO-GST",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      pan,
      count: result.count,
      items: result.items,
      data: result,
      ledgerId: txId,
      transactionId: txId,
      message: `Found ${result.count} registered GSTIN records for PAN ${pan}`,
    })
  }

  // 27. POST /api/apinice/pan-to-aadhaar
  if (pathName === "/api/apinice/pan-to-aadhaar" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    let input = {}
    try {
      input = await parseJson(req)
    } catch {
      input = {}
    }

    const pan = String(input.pan || input.panno || "").trim().toUpperCase().replace(/\s+/g, "")
    if (!pan || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      return respond(400, { error: "Valid 10-character PAN number is required (e.g. ABCDE1234F)." })
    }

    const svcConfig = getServiceConfig(
      db,
      "SVC-PAN-TO-AADHAAR",
      20,
      "PAN to Aadhaar Find"
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

    let result
    try {
      result = await apiniceProvider.fetchPanToAadhaar({ pan })
    } catch (apiErr) {
      return respond(400, {
        error: apiErr.message || "Failed to find linked Aadhaar number for this PAN.",
      })
    }

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    const txId = createId("TXN")
    const description = `PAN to Aadhaar Number Find (PAN: ${pan})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    db.walletLedger.unshift({
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-PAN-TO-AADHAAR",
      referenceId: pan,
      status: "success",
      createdAt: now(),
    })

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-PAN-TO-AADHAAR",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: pan,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-PAN-TO-AADHAAR",
      serviceId: "SVC-PAN-TO-AADHAAR",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      pan,
      aadhaar: result.aadhaar,
      maskedAadhaar: result.maskedAadhaar || result.aadhaar,
      name: result.name,
      data: result,
      ledgerId: txId,
      transactionId: txId,
      message: "Linked Aadhaar number retrieved successfully",
    })
  }

  // 28. Mobile to RC Find
  if ((pathName === "/api/apinice/mobile-to-rc" || pathName === "/api/apinice/mobile_to_rc") && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    let payload = {}
    try {
      payload = await parseJson(req)
    } catch {
      payload = {}
    }

    const mobile = String(payload.mobile || payload.mobileNumber || payload.contact || "").replace(/\D/g, "")
    if (!mobile || mobile.length !== 10) {
      return respond(400, { error: "Valid 10-digit mobile number is required (e.g. 9876543210)." })
    }

    const svcConfig = getServiceConfig(db, "SVC-MOBILE-TO-RC", 20, "Mobile to RC Find")
    if (svcConfig.status === "disabled") {
      return respond(403, { error: `${svcConfig.name} is temporarily disabled by admin. Please try again later.` })
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

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    let result
    try {
      result = await apiniceProvider.lookupMobileToRc({ mobile })
    } catch (apiErr) {
      wallet.balance = balanceBefore
      wallet.updatedAt = now()
      return respond(400, {
        error: apiErr.message || "No vehicle RC records found for this mobile number.",
      })
    }

    const txId = createId("TXN")
    const description = `Mobile to RC Find (Mobile: ${mobile})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    db.walletLedger.unshift({
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-MOBILE-TO-RC",
      referenceId: mobile,
      status: "success",
      createdAt: now(),
    })

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-MOBILE-TO-RC",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: mobile,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-MOBILE-TO-RC",
      serviceId: "SVC-MOBILE-TO-RC",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      mobile,
      count: result.count,
      rcNumbers: result.rcNumbers,
      data: result,
      ledgerId: txId,
      transactionId: txId,
      message: `Found ${result.count} registered vehicles for mobile ${mobile}`,
    })
  }

  // 29. PAN Card Address Details
  if ((pathName === "/api/apinice/pan-address-details" || pathName === "/api/apinice/pan_address_details") && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    let payload = {}
    try {
      payload = await parseJson(req)
    } catch {
      payload = {}
    }

    const pan = String(payload.pan || payload.panno || payload.panNumber || "").replace(/[\s-]/g, "").toUpperCase()
    if (!pan || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      return respond(400, { error: "Valid 10-character PAN number is required (e.g. ABCDE1234F)." })
    }

    const svcConfig = getServiceConfig(db, "SVC-PAN-ADDRESS-DETAILS", 15, "PAN Card Address Details")
    if (svcConfig.status === "disabled") {
      return respond(403, { error: `${svcConfig.name} is temporarily disabled by admin. Please try again later.` })
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

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    let result
    try {
      result = await apiniceProvider.fetchPanAddressDetails({ pan })
    } catch (apiErr) {
      wallet.balance = balanceBefore
      wallet.updatedAt = now()
      return respond(400, {
        error: apiErr.message || "Failed to retrieve address details for this PAN card.",
      })
    }

    const txId = createId("TXN")
    const description = `PAN Card Address Details (PAN: ${pan})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    db.walletLedger.unshift({
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-PAN-ADDRESS-DETAILS",
      referenceId: pan,
      status: "success",
      createdAt: now(),
    })

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-PAN-ADDRESS-DETAILS",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: pan,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-PAN-ADDRESS-DETAILS",
      serviceId: "SVC-PAN-ADDRESS-DETAILS",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      pan,
      fullName: result.fullName,
      dob: result.dob,
      category: result.category,
      aadhaarLinked: result.aadhaarLinked,
      maskedAadhaar: result.maskedAadhaar,
      email: result.email,
      phone: result.phone,
      address: result.address,
      data: result,
      ledgerId: txId,
      transactionId: txId,
      message: "PAN address details retrieved successfully",
    })
  }

  // 30. PAN Card Details by PAN Image (OCR)
  if ((pathName === "/api/apinice/pan-ocr" || pathName === "/api/apinice/pan_ocr") && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true

    let payload = {}
    try {
      payload = await parseJson(req)
    } catch {
      payload = {}
    }

    const photoBase64 = String(payload.photoBase64 || payload.image || payload.pan_image || "").trim()
    if (!photoBase64) {
      return respond(400, { error: "PAN card photo image (JPEG/PNG) is required." })
    }

    const svcConfig = getServiceConfig(db, "SVC-PAN-OCR", 15, "PAN Card Details by PAN Image")
    if (svcConfig.status === "disabled") {
      return respond(403, { error: `${svcConfig.name} is temporarily disabled by admin. Please try again later.` })
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

    const balanceBefore = Number(wallet.balance)
    const balanceAfter = Number((balanceBefore - requiredPrice).toFixed(2))
    wallet.balance = balanceAfter
    wallet.updatedAt = now()

    let result
    try {
      result = await apiniceProvider.extractPanFromImage({
        photoBase64,
        mimeType: payload.mimeType || "image/jpeg",
      })
    } catch (apiErr) {
      wallet.balance = balanceBefore
      wallet.updatedAt = now()
      return respond(400, {
        error: apiErr.message || "Failed to extract PAN card details from the uploaded image.",
      })
    }

    const txId = createId("TXN")
    const description = `PAN Details by Image OCR (${result.panNumber || "Extracted"})`

    if (!Array.isArray(db.walletLedger)) {
      db.walletLedger = []
    }

    db.walletLedger.unshift({
      id: txId,
      userId: auth.user.id,
      type: "debit",
      reference: txId,
      amount: requiredPrice,
      balanceBefore,
      balanceAfter,
      description,
      serviceId: "SVC-PAN-OCR",
      referenceId: result.panNumber || txId,
      status: "success",
      createdAt: now(),
    })

    audit(db, auth.user, "SERVICE_PURCHASE", "wallet", txId, {
      serviceId: "SVC-PAN-OCR",
      serviceName: svcConfig.name,
      amount: requiredPrice,
      balanceAfter,
      identifier: result.panNumber,
    })

    await saveDb(db)

    return respond(200, {
      ok: true,
      service: "SVC-PAN-OCR",
      serviceId: "SVC-PAN-OCR",
      serviceName: svcConfig.name,
      debited: requiredPrice,
      balance: balanceAfter,
      panNumber: result.panNumber,
      name: result.name,
      fatherName: result.fatherName,
      dob: result.dob,
      confidence: result.confidence,
      data: result,
      ledgerId: txId,
      transactionId: txId,
      message: "PAN card details extracted from image successfully",
    })
  }

  return false
}
