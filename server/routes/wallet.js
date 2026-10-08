import crypto from "node:crypto"
import { parseJson } from "../lib/http.js"
import { createId, now } from "../lib/ids.js"
import { safeEqual } from "../lib/security.js"
import { createPaytmClient } from "../services/paytmProvider.js"

export async function handleWalletRoutes(context) {
  const {
    req,
    res,
    pathName,
    url,
    db,
    send,
    saveDb,
    requireAuth,
    audit,
    ensureWallet,
    razorpayRequest,
    syncPayment,
    config,
  } = context
  if (!pathName.startsWith("/api/wallet")) return false

  const paytmClient = createPaytmClient()
  const respond = (status, payload) => {
    send(res, status, payload)
    return true
  }

  // Handle unauthenticated Paytm gateway callback / webhook
  if (pathName === "/api/wallet/paytm-callback" && req.method === "POST") {
    let body = {}
    try {
      const contentType = req.headers["content-type"] || ""
      if (contentType.includes("application/json")) {
        body = await parseJson(req)
      } else {
        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        const raw = Buffer.concat(chunks).toString("utf8")
        const params = new URLSearchParams(raw)
        for (const [k, v] of params.entries()) {
          body[k] = v
        }
      }
    } catch {
      return respond(400, { error: "Failed to parse Paytm callback payload" })
    }

    const orderId = body.ORDERID || body.orderId
    const checksum = body.CHECKSUMHASH || body.checksum || ""
    if (!orderId) return respond(400, { error: "Missing ORDERID in callback" })

    if (paytmClient.isConfigured) {
      const isValid = await paytmClient.verifyCallback(body, checksum)
      if (!isValid) {
        return respond(400, { error: "Invalid Paytm checksum signature" })
      }
    }

    const payment = db.payments.find((p) => p.orderId === orderId)
    if (!payment) return respond(404, { error: "Payment record not found" })

    const status = body.STATUS || body.status
    if (status === "TXN_SUCCESS" && payment.status !== "paid") {
      payment.status = "paid"
      payment.gatewayPaymentId = body.TXNID || body.txnId || `PAYTM-${Date.now()}`
      payment.paidAt = now()
      const wallet = ensureWallet(payment.userId)
      wallet.balance = Number((wallet.balance + Number(payment.amount)).toFixed(2))
      wallet.updatedAt = now()
      db.walletLedger.unshift({
        id: createId("WL"),
        userId: payment.userId,
        type: "credit",
        amount: Number(payment.amount),
        reference: payment.paymentId,
        description: `Paytm Dynamic UPI Top-Up (${orderId.slice(-6)})`,
        status: "success",
        createdAt: now(),
        balanceAfter: wallet.balance,
      })
      audit(db, { id: payment.userId, name: "Paytm Gateway" }, "WALLET_TOPUP_PAYTM", "wallet", payment.userId, {
        amount: payment.amount,
        paymentId: payment.paymentId,
        orderId,
      })
      await saveDb(db)
      syncPayment(payment)
    }

    if (req.headers.accept?.includes("text/html")) {
      res.writeHead(302, { Location: "/dashboard/wallet" })
      res.end()
      return true
    }
    return respond(200, { status: "OK", paymentStatus: payment.status })
  }

  const auth = requireAuth(req, res, db)
  if (!auth) return true

  if (pathName === "/api/wallet" && req.method === "GET") {
    const wallet = ensureWallet(auth.user.id)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const ledger = db.walletLedger.filter(
      (entry) => entry.userId === auth.user.id,
    )
    const todayInflow = ledger
      .filter(
        (entry) =>
          entry.type === "credit" && new Date(entry.createdAt) >= today,
      )
      .reduce((total, entry) => total + Number(entry.amount || 0), 0)
    const todayOutflow = ledger
      .filter(
        (entry) => entry.type === "debit" && new Date(entry.createdAt) >= today,
      )
      .reduce((total, entry) => total + Number(entry.amount || 0), 0)
    return respond(200, { wallet: { ...wallet, todayInflow, todayOutflow } })
  }

  if (pathName === "/api/wallet/ledger" && req.method === "GET") {
    const page = Math.max(1, Number(url.searchParams.get("page") || 1))
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit") || 25)),
    )
    const rows = db.walletLedger
      .filter((entry) => entry.userId === auth.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return respond(200, {
      ledger: rows.slice((page - 1) * limit, page * limit),
      page,
      limit,
      total: rows.length,
    })
  }

  if (pathName === "/api/wallet/check-status" && req.method === "GET") {
    const orderId = url.searchParams.get("orderId")
    if (!orderId) return respond(400, { error: "orderId is required" })
    const payment = db.payments.find(
      (p) => p.orderId === orderId && p.userId === auth.user.id,
    )
    if (!payment) return respond(404, { error: "Payment order not found" })

    // Check Paytm live gateway status if configured and payment is not yet paid
    if (payment.status !== "paid" && payment.mode === "upi_qr" && paytmClient.isConfigured) {
      try {
        const txnStatus = await paytmClient.checkStatus(payment.orderId)
        if (
          txnStatus?.resultInfo?.resultStatus === "TXN_SUCCESS" ||
          txnStatus?.STATUS === "TXN_SUCCESS"
        ) {
          payment.status = "paid"
          payment.gatewayPaymentId = txnStatus.txnId || txnStatus.TXNID || `PAYTM-${Date.now()}`
          payment.paidAt = now()
          const wallet = ensureWallet(auth.user.id)
          wallet.balance = Number((wallet.balance + Number(payment.amount)).toFixed(2))
          wallet.updatedAt = now()
          db.walletLedger.unshift({
            id: createId("WL"),
            userId: auth.user.id,
            type: "credit",
            amount: Number(payment.amount),
            reference: payment.paymentId,
            description: `Dynamic UPI Payment Verified (${payment.orderId.slice(-6)})`,
            status: "success",
            createdAt: now(),
            balanceAfter: wallet.balance,
          })
          audit(db, auth.user, "WALLET_TOPUP_UPI", "wallet", auth.user.id, {
            amount: payment.amount,
            paymentId: payment.paymentId,
            orderId: payment.orderId,
            gatewayPaymentId: payment.gatewayPaymentId,
          })
          await saveDb(db)
          syncPayment(payment)
        }
      } catch {
        // Continue if gateway check is in-flight
      }
    }

    return respond(200, {
      status: payment.status,
      paidAt: payment.paidAt,
      amount: payment.amount,
      wallet: payment.status === "paid" ? ensureWallet(auth.user.id) : undefined,
    })
  }

  if (pathName === "/api/wallet/create-order" && req.method === "POST") {
    const input = await parseJson(req)
    const amount = Math.round(Number(input.amount || 0) * 100)
    if (!Number.isSafeInteger(amount) || amount < 100) {
      return respond(400, { error: "Minimum wallet top-up is ₹1" })
    }

    // Support Dynamic UPI QR mode
    if (input.mode === "upi_qr" || input.method === "upi_qr") {
      const orderId = `LD-ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
      const vpa = process.env.PAYTM_UPI_VPA || process.env.MERCHANT_UPI_VPA || "paytmqr2810050501011@paytm"
      const merchantName = "LD SERVICE ZONE"
      const note = `WALLET-${auth.user.username || auth.user.id}-${orderId.slice(-6)}`
      const amountRupees = (amount / 100).toFixed(2)
      const upiString = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(merchantName)}&am=${amountRupees}&cu=INR&tn=${encodeURIComponent(note)}&tr=${orderId}`
      const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes

      const payment = {
        paymentId: createId("PAY"),
        applicationId: null,
        userId: auth.user.id,
        amount: amount / 100,
        mode: "upi_qr",
        status: "created",
        orderId,
        vpa,
        upiString,
        expiresAt,
        createdAt: now(),
      }
      db.payments.unshift(payment)
      await saveDb(db)
      syncPayment(payment)

      const isTestMode =
        String(process.env.DEMO_MODE).toLowerCase() === "true" ||
        !paytmClient.isConfigured

      return respond(200, {
        mode: "upi_qr",
        orderId,
        paymentId: payment.paymentId,
        amount,
        amountRupees: Number(amountRupees),
        currency: "INR",
        upiString,
        merchantVpa: vpa,
        merchantName,
        expiresAt,
        isTestMode,
      })
    }

    if (
      String(process.env.DEMO_MODE).toLowerCase() === "true" ||
      (!config.razorpayKeyId || !config.razorpayKeySecret)
    ) {
      const orderId = `DEMO-WALLET-${createId("ORD")}`
      const payment = {
        paymentId: createId("PAY"),
        applicationId: null,
        userId: auth.user.id,
        amount: amount / 100,
        mode: "demo_wallet",
        status: "created",
        orderId,
        createdAt: now(),
      }
      db.payments.unshift(payment)
      await saveDb(db)
      syncPayment(payment)
      return respond(200, {
        mode: "demo",
        orderId,
        amount,
        currency: "INR",
        paymentId: payment.paymentId,
        message: "Demo top-up ready",
      })
    }

    const order = await razorpayRequest("orders", "POST", {
      amount,
      currency: "INR",
      receipt: `WALLET-${auth.user.id}-${Date.now()}`,
      notes: {
        userId: auth.user.id,
        memberId: auth.user.username || auth.user.id,
        type: "wallet_topup",
      },
    })
    const payment = {
      paymentId: createId("PAY"),
      applicationId: null,
      userId: auth.user.id,
      amount: amount / 100,
      mode: "razorpay_wallet",
      status: "created",
      orderId: order.id,
      createdAt: now(),
    }
    db.payments.unshift(payment)
    await saveDb(db)
    syncPayment(payment)
    return respond(200, {
      mode: "razorpay",
      keyId: config.razorpayKeyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment.paymentId,
    })
  }

  if (pathName === "/api/wallet/verify" && req.method === "POST") {
    const input = await parseJson(req)

    // Handle demo/test verification
    if (
      input.mode === "demo" ||
      (typeof input.razorpay_order_id === "string" &&
        input.razorpay_order_id.startsWith("DEMO-"))
    ) {
      const payment = db.payments.find(
        (candidate) =>
          candidate.orderId === input.razorpay_order_id &&
          candidate.userId === auth.user.id &&
          candidate.mode === "demo_wallet",
      )
      if (!payment) return respond(404, { error: "Demo wallet payment not found" })
      if (payment.status !== "paid") {
        payment.status = "paid"
        payment.gatewayPaymentId = `DEMO-GW-${createId("GW")}`
        payment.paidAt = now()
        const wallet = ensureWallet(auth.user.id)
        wallet.balance = Number((wallet.balance + Number(payment.amount)).toFixed(2))
        wallet.updatedAt = now()
        db.walletLedger.unshift({
          id: createId("WL"),
          userId: auth.user.id,
          type: "credit",
          amount: Number(payment.amount),
          reference: payment.paymentId,
          description: "Demo wallet top-up",
          status: "success",
          createdAt: now(),
          balanceAfter: wallet.balance,
        })
        audit(db, auth.user, "WALLET_TOPUP_DEMO", "wallet", auth.user.id, {
          amount: payment.amount,
          paymentId: payment.paymentId,
        })
        await saveDb(db)
        syncPayment(payment)
      }
      return respond(200, {
        ok: true,
        wallet: ensureWallet(auth.user.id),
        payment,
      })
    }

    // Handle Dynamic UPI QR verification (Test/Manual Confirmation or Webhook)
    if (
      input.mode === "upi_qr" ||
      (typeof input.orderId === "string" && input.orderId.startsWith("LD-ORD-")) ||
      (typeof input.razorpay_order_id === "string" && input.razorpay_order_id.startsWith("LD-ORD-"))
    ) {
      const targetOrderId = input.orderId || input.razorpay_order_id
      const payment = db.payments.find(
        (candidate) =>
          candidate.orderId === targetOrderId &&
          candidate.userId === auth.user.id &&
          candidate.mode === "upi_qr",
      )
      if (!payment) return respond(404, { error: "UPI wallet payment not found" })

      if (paytmClient.isConfigured && String(process.env.DEMO_MODE).toLowerCase() !== "true") {
        try {
          const txnStatus = await paytmClient.checkStatus(payment.orderId)
          if (
            txnStatus?.resultInfo?.resultStatus !== "TXN_SUCCESS" &&
            txnStatus?.STATUS !== "TXN_SUCCESS"
          ) {
            return respond(400, {
              error: "Payment has not been confirmed by the UPI gateway yet",
            })
          }
        } catch (err) {
          return respond(502, {
            error: err.message || "Failed to verify transaction with payment provider",
          })
        }
      } else if (
        String(process.env.DEMO_MODE).toLowerCase() !== "true" &&
        config.razorpayKeySecret
      ) {
        return respond(400, {
          error: "Manual simulation is disabled in live mode. Payment must be verified via gateway callback.",
        })
      }

      if (payment.status !== "paid") {
        payment.status = "paid"
        payment.gatewayPaymentId = input.transactionId || `UPI-TXN-${Date.now()}`
        payment.paidAt = now()
        const wallet = ensureWallet(auth.user.id)
        wallet.balance = Number((wallet.balance + Number(payment.amount)).toFixed(2))
        wallet.updatedAt = now()
        db.walletLedger.unshift({
          id: createId("WL"),
          userId: auth.user.id,
          type: "credit",
          amount: Number(payment.amount),
          reference: payment.paymentId,
          description: `Instant Dynamic UPI Top-Up (${payment.orderId.slice(-6)})`,
          status: "success",
          createdAt: now(),
          balanceAfter: wallet.balance,
        })
        audit(db, auth.user, "WALLET_TOPUP_UPI", "wallet", auth.user.id, {
          amount: payment.amount,
          paymentId: payment.paymentId,
          orderId: payment.orderId,
        })
        await saveDb(db)
        syncPayment(payment)
      }
      return respond(200, {
        ok: true,
        wallet: ensureWallet(auth.user.id),
        payment,
      })
    }

    if (!config.razorpayKeySecret) {
      return respond(503, { error: "Razorpay is not configured" })
    }
    if (
      !input.razorpay_order_id ||
      !input.razorpay_payment_id ||
      !input.razorpay_signature
    ) {
      return respond(400, { error: "Payment verification data is incomplete" })
    }
    const expectedSignature = crypto
      .createHmac("sha256", config.razorpayKeySecret)
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
      .digest("hex")
    if (!safeEqual(expectedSignature, input.razorpay_signature)) {
      return respond(400, { error: "Invalid payment signature" })
    }
    const payment = db.payments.find(
      (candidate) =>
        candidate.orderId === input.razorpay_order_id &&
        candidate.userId === auth.user.id &&
        candidate.mode === "razorpay_wallet",
    )
    if (!payment) return respond(404, { error: "Wallet payment not found" })
    if (payment.status !== "paid") {
      payment.status = "paid"
      payment.gatewayPaymentId = input.razorpay_payment_id
      payment.paidAt = now()
      const wallet = ensureWallet(auth.user.id)
      wallet.balance = Number((wallet.balance + Number(payment.amount)).toFixed(2))
      wallet.updatedAt = now()
      db.walletLedger.unshift({
        id: createId("WL"),
        userId: auth.user.id,
        type: "credit",
        amount: Number(payment.amount),
        reference: payment.paymentId,
        description: "Razorpay wallet top-up",
        status: "success",
        createdAt: now(),
        balanceAfter: wallet.balance,
      })
      audit(db, auth.user, "WALLET_TOPUP", "wallet", auth.user.id, {
        amount: payment.amount,
        paymentId: payment.paymentId,
      })
      await saveDb(db)
      syncPayment(payment)
    }
    return respond(200, {
      ok: true,
      wallet: ensureWallet(auth.user.id),
      payment,
    })
  }

  return false
}
