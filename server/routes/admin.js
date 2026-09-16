import { parseJson } from "../lib/http.js"
import { createId, now } from "../lib/ids.js"
import { sanitizeUser } from "../lib/security.js"

export async function handleAdminRoutes(context) {
  const { req, res, pathName, db, send, saveDb, audit, requireAuth, ensureWallet } = context
  if (!pathName.startsWith("/api/admin/")) return false

  const auth = requireAuth(req, res, db, "admin")
  if (!auth) return true
  const respond = (status, payload) => {
    send(res, status, payload)
    return true
  }

  if (pathName === "/api/admin/commissions" && req.method === "GET") {
    const rows = db.commissionLedger
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return respond(200, {
      totalProviderCommission: rows.reduce(
        (total, row) => total + Number(row.providerCommission || 0),
        0,
      ),
      totalAdminCommission: rows.reduce(
        (total, row) => total + Number(row.adminCommission || 0),
        0,
      ),
      totalUserCommission: rows.reduce(
        (total, row) => total + Number(row.userCommission || 0),
        0,
      ),
      rows,
    })
  }

  if (pathName === "/api/admin/transactions" && req.method === "GET") {
    const rechargeTransactions = db.rechargeTransactions.map((row) => ({
      id: row.id,
      userId: row.userId,
      service: row.type === "DTH" ? "DTH Recharge" : "Mobile Recharge",
      customer: row.mobile,
      amount: row.amount,
      commission: row.adminCommission || 0,
      date: row.createdAt,
      status: row.status,
      operator: row.operator,
    }))
    const applications = db.applications.map((row) => ({
      id: row.applicationId,
      userId: row.userId,
      service: row.serviceName,
      customer: row.applicant?.name || row.applicant?.fullName || "",
      amount: row.customerPrice,
      commission: row.adminCommission || 0,
      date: row.createdAt,
      status: row.status,
      operator: "",
    }))
    return respond(200, {
      transactions: [...rechargeTransactions, ...applications].sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      ),
    })
  }

  if (pathName === "/api/admin/stats" && req.method === "GET") {
    const allTransactions = [...db.applications, ...db.rechargeTransactions]
    const statusCounts = allTransactions.reduce((counts, row) => {
      counts[row.status] = (counts[row.status] || 0) + 1
      return counts
    }, {})
    const revenue = [
      ...db.applications.filter(
        (row) => row.paymentId && row.status !== "payment_pending",
      ),
      ...db.rechargeTransactions.filter((row) => row.status === "success"),
    ].reduce(
      (total, row) => total + Number(row.customerPrice || row.amount || 0),
      0,
    )
    return respond(200, {
      users: db.users.length,
      retailers: db.users.filter((user) => user.role === "retailer").length,
      applications: db.applications.length,
      payments: db.payments.filter((payment) => payment.status === "paid")
        .length,
      pending:
        (statusCounts.submitted || 0) +
        (statusCounts.processing || 0) +
        (statusCounts.pending || 0),
      revenue,
      statusCounts,
    })
  }

  if (pathName === "/api/admin/users" && req.method === "GET") {
    return respond(200, {
      users: db.users.map((user) => ({
        ...sanitizeUser(user),
        wallet: ensureWallet(user.id).balance,
      })),
    })
  }

  if (pathName === "/api/admin/wallet/adjust" && req.method === "POST") {
    const input = await parseJson(req)
    const { userId, type, amount, reason, note } = input || {}
    const targetUser = db.users.find((u) => u.id === userId)
    if (!targetUser) return respond(404, { error: "User not found" })
    const numAmount = Number(amount || 0)
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return respond(400, { error: "Amount must be greater than zero" })
    }
    if (type !== "credit" && type !== "debit") {
      return respond(400, { error: "Adjustment type must be 'credit' or 'debit'" })
    }
    const wallet = ensureWallet(targetUser.id)
    if (type === "debit" && Number(wallet.balance) < numAmount) {
      return respond(400, {
        error: `Insufficient balance for debit. Current balance is ₹${Number(wallet.balance).toFixed(2)}`,
      })
    }

    if (type === "credit") {
      wallet.balance = Number((wallet.balance + numAmount).toFixed(2))
    } else {
      wallet.balance = Number((wallet.balance - numAmount).toFixed(2))
    }
    wallet.updatedAt = now()

    const adjRef = `ADJ-${Date.now()}`
    const ledgerEntry = {
      id: createId("WL"),
      userId: targetUser.id,
      type,
      amount: numAmount,
      reference: adjRef,
      description: `Admin adjustment: ${reason || (type === "credit" ? "Credit" : "Debit")}${note ? ` (${note})` : ""}`,
      status: "success",
      createdAt: now(),
      balanceAfter: wallet.balance,
    }
    db.walletLedger.unshift(ledgerEntry)

    if (audit) {
      audit(db, auth.user, "ADMIN_WALLET_ADJUST", "wallet", targetUser.id, {
        type,
        amount: numAmount,
        reason,
        balanceAfter: wallet.balance,
      })
    }
    if (saveDb) {
      await saveDb(db)
    }

    return respond(200, {
      ok: true,
      message: `Wallet ${type === "credit" ? "credited" : "debited"} successfully`,
      wallet,
      ledgerEntry,
    })
  }

  if (pathName === "/api/admin/audit" && req.method === "GET") {
    return respond(200, { logs: db.auditLogs.slice(0, 300) })
  }

  return false
}
