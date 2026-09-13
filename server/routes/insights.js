const DAY_MS = 86_400_000
const SUCCESS_STATUSES = new Set(["success", "completed", "accepted"])

export async function handleInsightRoutes(context) {
  const { req, res, pathName, url, db, send, requireAuth } = context
  if (pathName !== "/api/analytics/summary" && pathName !== "/api/customers") {
    return false
  }

  const auth = requireAuth(req, res, db)
  if (!auth) return true

  if (pathName === "/api/customers" && req.method === "GET") {
    const transactions = [
      ...db.rechargeTransactions.filter((row) => row.userId === auth.user.id),
      ...db.applications.filter((row) => row.userId === auth.user.id),
    ]
    const customers = {}
    for (const transaction of transactions) {
      const mobile = String(
        transaction.mobile ||
          transaction.applicant?.mobile ||
          transaction.applicant?.phone ||
          "",
      )
      if (!mobile) continue
      const customer = (customers[mobile] ||= {
        id: `C-${mobile}`,
        name: String(
          transaction.customerName ||
            transaction.applicant?.name ||
            transaction.applicant?.fullName ||
            "Customer",
        ),
        mobile,
        servicesUsed: 0,
        totalSpend: 0,
        lastTxn: null,
        status: "active",
      })
      customer.servicesUsed += 1
      customer.totalSpend += Number(
        transaction.amount || transaction.customerPrice || 0,
      )
      if (
        !customer.lastTxn ||
        new Date(transaction.createdAt) > new Date(customer.lastTxn)
      ) {
        customer.lastTxn = transaction.createdAt
      }
    }
    send(res, 200, {
      customers: Object.values(customers).sort(
        (a, b) => new Date(b.lastTxn || 0) - new Date(a.lastTxn || 0),
      ),
    })
    return true
  }

  if (pathName !== "/api/analytics/summary" || req.method !== "GET") {
    return false
  }

  const days = url.searchParams.get("range") === "30d" ? 30 : 7
  const start = Date.now() - days * DAY_MS
  const rechargeRows = db.rechargeTransactions
    .filter(
      (row) =>
        row.userId === auth.user.id &&
        new Date(row.createdAt).getTime() >= start,
    )
    .map((row) => ({
      date: row.createdAt,
      revenue: row.amount,
      commission: row.userCommission || 0,
      service: row.type === "DTH" ? "DTH Recharge" : "Mobile Recharge",
      status: row.status,
    }))
  const applicationRows = db.applications
    .filter(
      (row) =>
        row.userId === auth.user.id &&
        new Date(row.createdAt).getTime() >= start &&
        row.status !== "payment_pending",
    )
    .map((row) => ({
      date: row.createdAt,
      revenue: Number(row.customerPrice || 0),
      commission: Number(row.commissionCredited ? row.userCommission || 0 : 0),
      service: row.serviceName,
      status: row.status,
    }))
  const rows = [...rechargeRows, ...applicationRows]

  const buckets = {}
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - offset)
    const key = date.toISOString().slice(0, 10)
    buckets[key] = { date: key, revenue: 0, transactions: 0, commission: 0 }
  }
  for (const row of rows) {
    const bucket = buckets[new Date(row.date).toISOString().slice(0, 10)]
    if (!bucket) continue
    bucket.revenue += row.revenue
    bucket.commission += row.commission
    bucket.transactions += 1
  }

  const serviceMap = {}
  for (const row of rows) {
    const service = (serviceMap[row.service] ||= {
      name: row.service,
      transactions: 0,
      revenue: 0,
      commission: 0,
      success: 0,
    })
    service.transactions += 1
    service.revenue += row.revenue
    service.commission += row.commission
    if (SUCCESS_STATUSES.has(row.status)) service.success += 1
  }
  const servicePerformance = Object.values(serviceMap).map((service) => ({
    ...service,
    successRate: service.transactions
      ? Number(((service.success / service.transactions) * 100).toFixed(1))
      : 0,
  }))

  const allTransactions = [
    ...db.rechargeTransactions.filter((row) => row.userId === auth.user.id),
    ...db.applications.filter(
      (row) => row.userId === auth.user.id && row.status !== "payment_pending",
    ),
  ]
  const todayKey = new Date().toISOString().slice(0, 10)
  const monthPrefix = new Date().toISOString().slice(0, 7)
  const today = allTransactions.filter((row) =>
    String(row.createdAt).startsWith(todayKey),
  )
  const month = allTransactions.filter((row) =>
    String(row.createdAt).startsWith(monthPrefix),
  )
  const customers = new Set(
    allTransactions
      .map((row) => row.mobile || row.applicant?.mobile || row.applicant?.phone)
      .filter(Boolean),
  )
  const successful = allTransactions.filter((row) =>
    SUCCESS_STATUSES.has(row.status),
  )

  send(res, 200, {
    range: `${days}d`,
    trend: Object.values(buckets),
    servicePerformance,
    kpis: {
      todaySales: today.reduce(
        (total, row) => total + Number(row.amount || row.customerPrice || 0),
        0,
      ),
      todayEarnings: today.reduce(
        (total, row) =>
          total +
          Number(
            row.userCommission ||
              (row.commissionCredited ? row.userCommission : 0) ||
              0,
          ),
        0,
      ),
      transactions: allTransactions.length,
      successRate: allTransactions.length
        ? Number(
            ((successful.length / allTransactions.length) * 100).toFixed(1),
          )
        : 0,
      customers: customers.size,
      monthCommission: month.reduce(
        (total, row) => total + Number(row.userCommission || 0),
        0,
      ),
      totalEarned: allTransactions.reduce(
        (total, row) => total + Number(row.userCommission || 0),
        0,
      ),
    },
  })
  return true
}
