import { parseJson } from "../lib/http.js"
import { createId, now } from "../lib/ids.js"

const activeRecharges = new Set()

function providerMatches(provider, operator) {
  const wanted = String(operator)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
  const name = String(provider.name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
  const code = String(provider.code || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
  return name === wanted || code === wanted
}

function providerNameContains(provider, operator) {
  const escapedOperator = String(operator)
    .toLowerCase()
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  if (!escapedOperator) return false
  return new RegExp(`\\b${escapedOperator}\\b`, "i").test(
    String(provider.name || ""),
  )
}

export async function handleRechargeRoutes(context) {
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
    provider,
  } = context
  if (!pathName.startsWith("/api/recharge")) return false

  const respond = (status, payload) => {
    send(res, status, payload)
    return true
  }

  if (pathName === "/api/recharge/providers" && req.method === "GET") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    if (!provider.configured()) {
      return respond(503, {
        error: "Pay2All recharge service is not configured",
      })
    }
    return respond(200, await provider.getProviders())
  }

  if (pathName === "/api/recharge/plans" && req.method === "GET") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    const result = await provider.getPlans(
      url.searchParams.get("operator"),
      url.searchParams.get("circle"),
    )
    return respond(200, result)
  }

  if (pathName === "/api/recharge/detect" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    if (!provider.configured()) {
      return respond(503, {
        error: "Pay2All recharge service is not configured",
      })
    }
    const input = await parseJson(req)
    try {
      const detected = await provider.detectOperatorCircle(input.mobile)
      const providersResult = await provider.getProviders()
      const providers = (providersResult.data?.services || []).flatMap(
        (service) =>
          (service.providers || []).map((candidate) => ({
            ...candidate,
            service: service.service,
            code: candidate.code || service.code,
          })),
      )
      const selected =
        providers.find((candidate) =>
          providerMatches(candidate, detected.operator),
        ) ||
        providers.find((candidate) =>
          providerNameContains(candidate, detected.operator),
        )
      if (!selected) {
        return respond(422, {
          error: `Detected operator "${detected.operator}" but it is not available in your Pay2All provider catalogue. Please select manually.`,
          detected,
        })
      }
      return respond(200, {
        detected,
        provider: {
          provider_id: selected.provider_id,
          name: selected.name,
          code: selected.code,
        },
      })
    } catch (error) {
      return respond(422, {
        error: error?.message || "Could not auto-detect operator and circle",
      })
    }
  }

  if (pathName === "/api/recharge" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    if (!provider.configured()) {
      return respond(503, {
        error: "Recharge service is not configured — contact admin",
      })
    }
    const input = await parseJson(req)
    const mobile = String(input.mobile || "").replace(/\D/g, "")
    const amount = Number(input.amount || 0)
    const providerId = Number(input.providerId || 0)
    if (!/^\d{10,18}$/.test(mobile)) {
      return respond(400, {
        error: "Enter a valid mobile or DTH subscriber number",
      })
    }
    if (
      !Number.isSafeInteger(providerId) ||
      providerId <= 0 ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return respond(400, {
        error: "Operator and a valid recharge amount are required",
      })
    }
    if (activeRecharges.has(auth.user.id)) {
      return respond(409, {
        error: "Another recharge is in progress. Please wait.",
      })
    }

    activeRecharges.add(auth.user.id)
    try {
      const wallet = ensureWallet(auth.user.id)
      if (Number(wallet.balance) < amount) {
        return respond(400, { error: "Insufficient wallet balance" })
      }
      const providerResult = await provider.initiateRecharge(
        mobile,
        input.operator,
        input.circle,
        amount,
        providerId,
        input.type,
        input.customerMobile,
      )
      const statusId = Number(providerResult.status_id)
      const status =
        statusId === 1 ? "success" : statusId === 2 ? "failed" : "pending"
      const providerCommission = Number(
        providerResult.data?.commission || providerResult.commission || 0,
      )
      const userCommission =
        status === "success" ? Number((providerCommission / 2).toFixed(2)) : 0
      const adminCommission =
        status === "success"
          ? Number((providerCommission - userCommission).toFixed(2))
          : 0
      const transaction = {
        id: createId("RC"),
        clientId: providerResult.clientId,
        providerTxnId: providerResult.data?.txn_id || null,
        userId: auth.user.id,
        mobile,
        operator: String(input.operator || ""),
        circle: String(input.circle || ""),
        providerId,
        type: input.type === "DTH" ? "DTH" : "MOBILE",
        amount,
        providerCommission,
        userCommission,
        adminCommission,
        commission: providerCommission,
        commissionCredited: false,
        status,
        message: providerResult.message || "",
        createdAt: now(),
        updatedAt: now(),
      }
      db.rechargeStatusHistory.unshift({
        id: createId("RSH"), transactionId: transaction.id, status, payload: providerResult, createdAt: now(),
      })
      if (status === "success" || status === "pending") {
        wallet.balance -= amount
        wallet.updatedAt = now()
        db.walletLedger.unshift({
          id: createId("WL"),
          userId: auth.user.id,
          type: "debit",
          amount,
          reference: transaction.id,
          description: `${transaction.type} recharge - ${transaction.operator || "provider"}`,
          status,
          createdAt: now(),
          balanceAfter: wallet.balance,
        })
      }
      if (status === "success" && providerCommission > 0) {
        wallet.balance += userCommission
        wallet.updatedAt = now()
        db.walletLedger.unshift({
          id: createId("WL"),
          userId: auth.user.id,
          type: "credit",
          amount: userCommission,
          reference: transaction.id,
          description: "50% recharge commission",
          status: "success",
          createdAt: now(),
          balanceAfter: wallet.balance,
        })
        db.commissionLedger.unshift({
          id: createId("CM"),
          rechargeId: transaction.id,
          userId: auth.user.id,
          providerCommission,
          userCommission,
          adminCommission,
          createdAt: now(),
        })
        transaction.commissionCredited = true
      }
      if (status === "failed") transaction.refunded = true
      db.rechargeTransactions.unshift(transaction)
      audit(db, auth.user, "RECHARGE_INITIATED", "recharge", transaction.id, {
        status,
        operator: transaction.operator,
        amount,
      })
      await saveDb(db)
      return respond(200, { transaction, provider: providerResult, wallet })
    } finally {
      activeRecharges.delete(auth.user.id)
    }
  }

  if (
    /^\/api\/recharge\/status\/[^/]+$/.test(pathName) &&
    req.method === "GET"
  ) {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    const clientId = decodeURIComponent(pathName.split("/").pop())
    const transaction = db.rechargeTransactions.find(
      (candidate) =>
        candidate.clientId === clientId && candidate.userId === auth.user.id,
    )
    if (!transaction) {
      return respond(404, { error: "Recharge transaction not found" })
    }
    if (transaction.status !== "pending") {
      return respond(200, { transaction })
    }
    try {
      const providerStatus = await provider.checkRechargeStatus(clientId)
      return respond(200, { transaction, provider: providerStatus })
    } catch (error) {
      return respond(200, {
        transaction,
        provider: {
          status_id: 3,
          message: error.message || "Final status will arrive by webhook",
        },
      })
    }
  }

  if (pathName === "/api/recharge/webhook" && req.method === "POST") {
    const notification = await parseJson(req)
    const clientId = String(notification.client_id || "")
    if (!clientId) return respond(400, { error: "client_id is required" })
    const transaction = db.rechargeTransactions.find(
      (candidate) => candidate.clientId === clientId,
    )
    if (!transaction || transaction.status !== "pending") {
      return respond(200, { received: true })
    }
    if (!process.env.PAY2ALL_STATUS_PATH) {
      return respond(503, {
        error:
          "Configure authenticated provider status verification before processing recharge callbacks",
      })
    }
    const verified = await provider.checkRechargeStatus(clientId)
    const input = {
      ...(verified.data || {}),
      status_id: verified.status_id,
      message: verified.message,
    }
    const nextStatus =
      Number(input.status_id) === 1
        ? "success"
        : Number(input.status_id) === 2
          ? "failed"
          : "pending"
    if (nextStatus === "pending") return respond(200, { received: true })

    transaction.status = nextStatus
    transaction.updatedAt = now()
    transaction.providerTxnId = input.txn_id || transaction.providerTxnId
    transaction.message = input.message || transaction.message
    db.rechargeStatusHistory.unshift({
      id: createId("RSH"), transactionId: transaction.id, status: nextStatus, payload: input, createdAt: now(),
    })
    if (nextStatus === "failed" && !transaction.refunded) {
      const wallet = ensureWallet(transaction.userId)
      wallet.balance += transaction.amount
      wallet.updatedAt = now()
      transaction.refunded = true
      db.walletLedger.unshift({
        id: createId("WL"),
        userId: transaction.userId,
        type: "credit",
        amount: transaction.amount,
        reference: transaction.id,
        description: "Recharge refund",
        status: "success",
        createdAt: now(),
        balanceAfter: wallet.balance,
      })
    }
    if (nextStatus === "success" && !transaction.commissionCredited) {
      const providerCommission = Number(
        input.commission ?? transaction.providerCommission ?? 0,
      )
      const userCommission = Number((providerCommission / 2).toFixed(2))
      const adminCommission = Number(
        (providerCommission - userCommission).toFixed(2),
      )
      Object.assign(transaction, {
        providerCommission,
        userCommission,
        adminCommission,
        commission: providerCommission,
      })
      if (userCommission > 0) {
        const wallet = ensureWallet(transaction.userId)
        wallet.balance += userCommission
        wallet.updatedAt = now()
        db.walletLedger.unshift({
          id: createId("WL"),
          userId: transaction.userId,
          type: "credit",
          amount: userCommission,
          reference: transaction.id,
          description: "50% recharge commission",
          status: "success",
          createdAt: now(),
          balanceAfter: wallet.balance,
        })
        db.commissionLedger.unshift({
          id: createId("CM"),
          rechargeId: transaction.id,
          userId: transaction.userId,
          providerCommission,
          userCommission,
          adminCommission,
          createdAt: now(),
        })
      }
      transaction.commissionCredited = true
    }
    await saveDb(db)
    return respond(200, { received: true })
  }

  return false
}
