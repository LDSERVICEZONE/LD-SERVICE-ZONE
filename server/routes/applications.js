import crypto from "node:crypto"
import { parseJson, readRawBody } from "../lib/http.js"
import { createId, now } from "../lib/ids.js"
import { safeEqual } from "../lib/security.js"

const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
])
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024

export async function handleApplicationRoutes(context) {
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
    updateApplicationByAdmin,
    ensureWallet,
    razorpayRequest,
    syncApplication,
    syncPayment,
    config,
  } = context
  if (
    !pathName.startsWith("/api/applications") &&
    !pathName.startsWith("/api/payments")
  ) {
    return false
  }

  const respond = (status, payload) => {
    send(res, status, payload)
    return true
  }
  const publicApplication = (application) => ({
    ...application,
    applicant: Object.fromEntries(
      Object.entries(application.applicant || {}).map(([key, value]) => [
        key,
        decrypt(value),
      ]),
    ),
  })

  if (pathName === "/api/applications" && req.method === "GET") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    const applications =
      auth.user.role === "admin"
        ? db.applications
        : db.applications.filter(
            (application) => application.userId === auth.user.id,
          )
    return respond(200, {
      applications: applications.map(publicApplication),
    })
  }

  if (pathName === "/api/applications" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    const input = await parseJson(req)
    const service = db.services.find(
      (candidate) =>
        candidate.id === input.serviceId && candidate.active !== false,
    )
    if (
      !service ||
      !input.applicant ||
      typeof input.applicant !== "object" ||
      Array.isArray(input.applicant) ||
      !Object.keys(input.applicant).length
    ) {
      return respond(400, {
        error: "A valid service and applicant details are required",
      })
    }
    const applicant = Object.fromEntries(
      Object.entries(input.applicant).map(([key, value]) => [
        key,
        typeof value === "string" && /aadhaar/i.test(key)
          ? encrypt(value)
          : value,
      ]),
    )
    const application = {
      applicationId: createId("APP"),
      userId: auth.user.id,
      retailerName: auth.user.name,
      serviceId: service.id,
      serviceName: service.name,
      category: service.category,
      customerPrice: Number(service.customerPrice),
      commission: Number(service.commission || 0),
      applicant,
      documents: (service.documents || []).map((name) => ({ name })),
      status: "payment_pending",
      adminNote: "",
      createdAt: now(),
      updatedAt: now(),
      paymentId: null,
      orderId: null,
    }
    db.applications.unshift(application)
    audit(
      db,
      auth.user,
      "APPLICATION_CREATED",
      "application",
      application.applicationId,
    )
    await saveDb(db)
    syncApplication(application)
    return respond(201, { application: publicApplication(application) })
  }

  if (
    /^\/api\/applications\/[^/]+\/documents$/.test(pathName) &&
    req.method === "POST"
  ) {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    const applicationId = pathName.split("/")[3]
    const application = db.applications.find(
      (candidate) => candidate.applicationId === applicationId,
    )
    if (
      !application ||
      (auth.user.role !== "admin" && application.userId !== auth.user.id)
    ) {
      return respond(404, { error: "Application not found" })
    }
    const input = await parseJson(req)
    if (
      !input.documentName ||
      !input.fileName ||
      !input.data ||
      !ALLOWED_DOCUMENT_TYPES.has(input.mimeType)
    ) {
      return respond(400, {
        error:
          "Document name, filename, supported MIME type and file data are required",
      })
    }
    const fileName = String(input.fileName).replace(/[^a-zA-Z0-9._-]/g, "_")
    const raw = String(input.data).replace(/^data:[^;]+;base64,/, "")
    const buffer = Buffer.from(raw, "base64")
    if (buffer.length > MAX_DOCUMENT_BYTES) {
      return respond(413, { error: "Each document must be 5 MB or smaller" })
    }
    const document = (application.documents || []).find(
      (candidate) => candidate.name === input.documentName,
    )
    if (!document) {
      return respond(400, {
        error: "Document is not required for this application",
      })
    }
    const storageKey = `applications/${application.applicationId}/${crypto
      .randomBytes(4)
      .toString("hex")}-${fileName}`
    const storageName = await storePrivateFile(
      storageKey,
      buffer,
      input.mimeType,
    )
    Object.assign(document, {
      fileName,
      storageName,
      mimeType: input.mimeType,
      size: buffer.length,
      uploadedAt: now(),
    })
    application.updatedAt = now()
    audit(
      db,
      auth.user,
      "DOCUMENT_UPLOADED",
      "application",
      application.applicationId,
      { documentName: input.documentName },
    )
    await saveDb(db)
    return respond(201, {
      document: { name: input.documentName, fileName, size: buffer.length },
    })
  }

  if (
    /^\/api\/applications\/[^/]+\/documents\/[^/]+$/.test(pathName) &&
    req.method === "GET"
  ) {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    const parts = pathName.split("/")
    const application = db.applications.find(
      (candidate) => candidate.applicationId === parts[3],
    )
    if (
      !application ||
      (auth.user.role !== "admin" && application.userId !== auth.user.id)
    ) {
      return respond(404, { error: "Application not found" })
    }
    const documentName = decodeURIComponent(parts[5] || "")
    const document = (application.documents || []).find(
      (candidate) => candidate.name === documentName && candidate.storageName,
    )
    if (!document) return respond(404, { error: "Document not found" })
    const file = await readPrivateFile(document.storageName)
    if (!file) return respond(404, { error: "Stored file not found" })
    res.writeHead(200, {
      "Content-Type": document.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${document.fileName}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    })
    res.end(file)
    return true
  }

  if (/^\/api\/applications\/[^/]+$/.test(pathName) && req.method === "PATCH") {
    const auth = requireAuth(req, res, db, "admin")
    if (!auth) return true
    const applicationId = pathName.split("/").pop()
    const application = db.applications.find(
      (candidate) => candidate.applicationId === applicationId,
    )
    if (!application) return respond(404, { error: "Application not found" })
    const input = await parseJson(req)
    try {
      updateApplicationByAdmin(db, application, input, auth.user)
    } catch (error) {
      return respond(400, { error: error.message })
    }
    await saveDb(db)
    syncApplication(application)
    return respond(200, { application: publicApplication(application) })
  }

  if (pathName === "/api/payments/create-order" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    const input = await parseJson(req)
    const application = db.applications.find(
      (candidate) =>
        candidate.applicationId === input.applicationId &&
        candidate.userId === auth.user.id,
    )
    if (!application) return respond(404, { error: "Application not found" })
    if (application.status !== "payment_pending") {
      return respond(409, { error: "Application has already been submitted" })
    }
    if (application.documents.some((document) => !document.storageName)) {
      return respond(400, {
        error: "Upload all required documents before payment",
      })
    }
    const amount = Math.round(Number(application.customerPrice) * 100)
    if (amount <= 0) {
      application.status = "submitted"
      application.updatedAt = now()
      await saveDb(db)
      return respond(200, {
        mode: "free",
        application: publicApplication(application),
      })
    }
    if (String(process.env.DEMO_MODE).toLowerCase() === "true") {
      application.status = "submitted"
      application.paymentId = `DEMO-${createId("PAY")}`
      application.updatedAt = now()
      audit(
        db,
        auth.user,
        "DEMO_APPLICATION_SUBMITTED",
        "application",
        application.applicationId,
      )
      await saveDb(db)
      return respond(200, {
        mode: "demo",
        application: publicApplication(application),
        message: "Demo submission completed. Payment is disabled.",
      })
    }
    if (!config.razorpayKeyId || !config.razorpayKeySecret) {
      return respond(503, { error: "Razorpay is not configured" })
    }
    const order = await razorpayRequest("orders", "POST", {
      amount,
      currency: "INR",
      receipt: application.applicationId,
      notes: {
        applicationId: application.applicationId,
        userId: auth.user.id,
      },
    })
    const payment = {
      paymentId: createId("PAY"),
      applicationId: application.applicationId,
      userId: auth.user.id,
      amount: Number(application.customerPrice),
      mode: "razorpay",
      status: "created",
      orderId: order.id,
      createdAt: now(),
    }
    db.payments.unshift(payment)
    syncPayment(payment)
    application.orderId = order.id
    await saveDb(db)
    return respond(200, {
      mode: "razorpay",
      keyId: config.razorpayKeyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      application: publicApplication(application),
    })
  }

  if (pathName === "/api/payments/verify" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    if (!config.razorpayKeySecret) {
      return respond(503, { error: "Razorpay is not configured" })
    }
    const input = await parseJson(req)
    const application = db.applications.find(
      (candidate) =>
        candidate.applicationId === input.applicationId &&
        candidate.userId === auth.user.id,
    )
    if (
      !application ||
      !input.razorpay_order_id ||
      !input.razorpay_payment_id ||
      !input.razorpay_signature
    ) {
      return respond(400, { error: "Payment verification data is incomplete" })
    }
    const payment = db.payments.find(
      (candidate) =>
        candidate.orderId === input.razorpay_order_id &&
        candidate.applicationId === application.applicationId &&
        candidate.userId === auth.user.id &&
        candidate.mode === "razorpay",
    )
    if (
      !payment ||
      Number(payment.amount) !== Number(application.customerPrice)
    ) {
      return respond(400, {
        error: "Payment order does not match this application",
      })
    }
    const expectedSignature = crypto
      .createHmac("sha256", config.razorpayKeySecret)
      .update(`${payment.orderId}|${input.razorpay_payment_id}`)
      .digest("hex")
    if (!safeEqual(expectedSignature, input.razorpay_signature)) {
      return respond(400, { error: "Invalid payment signature" })
    }
    if (payment.status === "paid") {
      return respond(200, {
        application: publicApplication(application),
        message: "Payment already verified",
      })
    }
    Object.assign(application, {
      status: "submitted",
      paymentId: input.razorpay_payment_id,
      orderId: input.razorpay_order_id,
      updatedAt: now(),
    })
    Object.assign(payment, {
      status: "paid",
      gatewayPaymentId: input.razorpay_payment_id,
      paidAt: now(),
    })
    audit(
      db,
      auth.user,
      "PAYMENT_SUCCESS",
      "application",
      application.applicationId,
    )
    await saveDb(db)
    syncPayment(payment)
    syncApplication(application)
    return respond(200, {
      application: publicApplication(application),
      message: "Payment verified successfully",
    })
  }

  if (pathName === "/api/payments/webhook" && req.method === "POST") {
    if (!config.razorpayWebhookSecret) {
      return respond(503, { error: "Payment webhook is not configured" })
    }
    const rawBody = await readRawBody(req)
    const webhookSignature = req.headers["x-razorpay-signature"] || ""
    const expectedSignature = crypto
      .createHmac("sha256", config.razorpayWebhookSecret)
      .update(rawBody)
      .digest("hex")
    if (!safeEqual(expectedSignature, webhookSignature)) {
      return respond(400, { error: "Invalid webhook signature" })
    }
    const event = JSON.parse(rawBody || "{}")
    if (
      event.event !== "payment.captured" ||
      !event.payload?.payment?.entity?.order_id
    ) {
      return respond(200, { received: true })
    }

    const entity = event.payload.payment.entity
    const payment = db.payments.find(
      (candidate) => candidate.orderId === entity.order_id,
    )
    if (
      payment &&
      (entity.currency !== "INR" ||
        Number(entity.amount) !== Math.round(Number(payment.amount) * 100))
    ) {
      return respond(400, { error: "Payment amount or currency mismatch" })
    }
    if (!payment || payment.status === "paid") {
      return respond(200, { received: true })
    }

    payment.status = "paid"
    payment.gatewayPaymentId = entity.id
    payment.paidAt = now()
    if (payment.applicationId) {
      const application = db.applications.find(
        (candidate) => candidate.applicationId === payment.applicationId,
      )
      if (application) {
        application.status = "submitted"
        application.paymentId = entity.id
        application.updatedAt = now()
        syncApplication(application)
      }
    }
    if (payment.mode === "razorpay_wallet") {
      const wallet = ensureWallet(payment.userId)
      wallet.balance = Number(
        (wallet.balance + Number(payment.amount)).toFixed(2),
      )
      wallet.updatedAt = now()
      db.walletLedger.unshift({
        id: createId("WL"),
        userId: payment.userId,
        type: "credit",
        amount: Number(payment.amount),
        reference: payment.paymentId,
        description: "Razorpay wallet top-up (webhook)",
        status: "success",
        createdAt: now(),
        balanceAfter: wallet.balance,
      })
      audit(
        db,
        { id: payment.userId, name: "Webhook" },
        "WALLET_TOPUP_WEBHOOK",
        "wallet",
        payment.userId,
        { amount: payment.amount },
      )
    }
    await saveDb(db)
    syncPayment(payment)
    return respond(200, { received: true })
  }

  return false
}
