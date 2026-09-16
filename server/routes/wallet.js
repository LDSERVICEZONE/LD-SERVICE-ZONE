import crypto from "node:crypto"
import { parseJson } from "../lib/http.js"
import { createId, now } from "../lib/ids.js"
import { safeEqual } from "../lib/security.js"

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

  const auth = requireAuth(req, res, db)
  if (!auth) return true
  const respond = (status, payload) => {
    send(res, status, payload)
    return true
  }

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

  if (pathName === "/api/wallet/create-order" && req.method === "POST") {
    const input = await parseJson(req)
    const amount = Math.round(Number(input.amount || 0) * 100)
    if (!Number.isSafeInteger(amount) || amount < 100) {
      return respond(400, { error: "Minimum wallet top-up is ₹1" })
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
