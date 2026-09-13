import crypto from "node:crypto"
import { parseJson } from "../lib/http.js"
import { now } from "../lib/ids.js"
import { sanitizeUser } from "../lib/security.js"

const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
])
const REQUIRED_DOCUMENTS = ["panCard", "aadhaarCard", "selfie", "bankProof"]
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024

function isKycStorageName(storageName, userId) {
  const match = String(storageName || "").match(/^(local|supabase):(.+)$/)
  if (!match) return false
  const key = match[2]
  return (
    key.startsWith(`kyc/${userId}/`) &&
    !key.includes("\\") &&
    !key.split("/").some((part) => !part || part === "." || part === "..")
  )
}

export async function handleKycRoutes(context) {
  const {
    req,
    res,
    pathName,
    db,
    send,
    saveDb,
    requireAuth,
    audit,
    encrypt,
    decrypt,
    storePrivateFile,
    readPrivateFile,
    syncUser,
  } = context

  const isUserKyc = pathName === "/api/kyc"
  const isAdminKyc = pathName.startsWith("/api/admin/kyc")
  if (!isUserKyc && !isAdminKyc) return false

  const respond = (status, payload) => {
    send(res, status, payload)
    return true
  }

  if (isUserKyc && req.method === "GET") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    const kyc = auth.user.kyc || {}
    return respond(200, {
      kyc: {
        ...kyc,
        aadhaar: decrypt(kyc.aadhaar),
        pan: decrypt(kyc.pan),
        bankAccount: decrypt(kyc.bankAccount),
      },
    })
  }

  if (isUserKyc && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    if (auth.user.kycStatus === "verified") {
      return respond(409, {
        error: "KYC is already verified. Contact admin to request changes.",
      })
    }

    const input = await parseJson(req)
    const fullName = String(input.fullName || "").trim()
    const dob = String(input.dob || "").trim()
    const pan = String(input.pan || "")
      .trim()
      .toUpperCase()
    const aadhaar = String(input.aadhaar || "").replace(/\D/g, "")
    const address = String(input.address || "").trim()
    const city = String(input.city || "").trim()
    const state = String(input.state || "").trim()
    const pincode = String(input.pincode || "").trim()
    const bankAccount = String(input.bankAccount || "").replace(/\s/g, "")
    const ifsc = String(input.ifsc || "")
      .trim()
      .toUpperCase()
    const accountHolder = String(input.accountHolder || "").trim()
    if (
      !fullName ||
      !dob ||
      !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan) ||
      !/^\d{12}$/.test(aadhaar) ||
      !address ||
      !city ||
      !state ||
      !/^\d{6}$/.test(pincode) ||
      !bankAccount ||
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc) ||
      !accountHolder
    ) {
      return respond(400, {
        error:
          "Please complete all required KYC fields with valid PAN, Aadhaar, PIN and IFSC details",
      })
    }

    const documents =
      input.documents && typeof input.documents === "object"
        ? input.documents
        : {}
    const decodedDocuments = new Map()
    for (const name of REQUIRED_DOCUMENTS) {
      const document = documents[name]
      if (!document?.data || !ALLOWED_DOCUMENT_TYPES.has(document.mimeType)) {
        return respond(400, { error: `${name} document is required` })
      }
      const raw = String(document.data).replace(/^data:[^;]+;base64,/, "")
      const buffer = Buffer.from(raw, "base64")
      if (buffer.length > MAX_DOCUMENT_BYTES) {
        return respond(413, {
          error: "Each KYC document must be 5 MB or smaller",
        })
      }
      decodedDocuments.set(name, buffer)
    }

    const storedDocuments = {}
    for (const name of REQUIRED_DOCUMENTS) {
      const document = documents[name]
      const fileName = String(document.fileName || name).replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
      )
      const buffer = decodedDocuments.get(name)
      const storageName = await storePrivateFile(
        `kyc/${auth.user.id}/${crypto.randomBytes(6).toString("hex")}-${fileName}`,
        buffer,
        document.mimeType,
      )
      storedDocuments[name] = {
        fileName,
        storageName,
        mimeType: document.mimeType,
        size: buffer.length,
        uploadedAt: now(),
      }
    }

    auth.user.kyc = {
      fullName,
      dob,
      aadhaar: encrypt(aadhaar),
      pan: encrypt(pan),
      address,
      city,
      state,
      pincode,
      bankAccount: encrypt(bankAccount),
      ifsc,
      accountHolder,
      documents: storedDocuments,
      submittedAt: now(),
      reviewedAt: null,
      adminNote: "",
    }
    auth.user.kycStatus = "pending"
    auth.user.updatedAt = now()
    audit(db, auth.user, "KYC_SUBMITTED", "user", auth.user.id)
    await saveDb(db)
    syncUser(auth.user)
    return respond(201, {
      kyc: {
        ...auth.user.kyc,
        aadhaar: aadhaar.replace(/\d(?=\d{4})/g, "*"),
        pan: `*****${pan.slice(-1)}`,
        bankAccount: `******${bankAccount.slice(-4)}`,
      },
      message:
        "KYC submitted successfully. Your documents are now under review.",
    })
  }

  if (pathName === "/api/admin/kyc" && req.method === "GET") {
    const auth = requireAuth(req, res, db, "admin")
    if (!auth) return true
    const rows = db.users
      .filter((user) => user.role === "retailer")
      .map((user) => ({
        id: user.id,
        name: user.name,
        businessName: user.businessName,
        email: user.email,
        mobile: user.mobile,
        kycStatus: user.kycStatus || "pending",
        kyc: user.kyc
          ? {
              ...user.kyc,
              aadhaar: decrypt(user.kyc.aadhaar),
              pan: decrypt(user.kyc.pan),
              bankAccount: decrypt(user.kyc.bankAccount),
            }
          : null,
      }))
    return respond(200, { kyc: rows })
  }

  if (
    /^\/api\/admin\/kyc\/[^/]+\/documents\/[^/]+$/.test(pathName) &&
    req.method === "GET"
  ) {
    const auth = requireAuth(req, res, db, "admin")
    if (!auth) return true
    const user = db.users.find(
      (candidate) => candidate.id === pathName.split("/")[4],
    )
    const documentName = decodeURIComponent(pathName.split("/")[6])
    const document = user?.kyc?.documents?.[documentName]
    if (!document || !isKycStorageName(document.storageName, user.id)) {
      return respond(404, { error: "Document not found" })
    }
    const file = await readPrivateFile(document.storageName)
    if (!file) return respond(404, { error: "Document not found" })
    const safeName = document.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
    res.writeHead(200, {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    })
    res.end(file)
    return true
  }

  if (/^\/api\/admin\/kyc\/[^/]+$/.test(pathName) && req.method === "PATCH") {
    const auth = requireAuth(req, res, db, "admin")
    if (!auth) return true
    const userId = pathName.split("/").pop()
    const user = db.users.find(
      (candidate) => candidate.id === userId && candidate.role === "retailer",
    )
    if (!user) return respond(404, { error: "User not found" })
    const input = await parseJson(req)
    if (!user.kyc?.submittedAt) {
      return respond(400, { error: "No KYC submission to review" })
    }
    if (!["verified", "rejected", "pending"].includes(input.status)) {
      return respond(400, { error: "Invalid KYC status" })
    }
    user.kycStatus = input.status
    user.kyc.reviewedAt = now()
    user.kyc.adminNote = String(input.adminNote || "")
    audit(
      db,
      auth.user,
      `KYC_${String(input.status).toUpperCase()}`,
      "user",
      user.id,
      { adminNote: user.kyc.adminNote },
    )
    await saveDb(db)
    syncUser(user)
    return respond(200, { user: sanitizeUser(user) })
  }

  return false
}
