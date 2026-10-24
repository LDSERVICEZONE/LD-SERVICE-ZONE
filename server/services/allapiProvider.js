export function createAllApiClient(config = {}) {
  const token = config.token || process.env.ALLAPI_TOKEN || ""
  const baseUrl = config.baseUrl || process.env.ALLAPI_BASE_URL || "https://allapi.in"
  const isConfigured = Boolean(token)

  return {
    isConfigured,
    token,
    baseUrl,

    async createOrder({
      orderId,
      amount,
      note,
      productName,
      customerName,
      customerMobile,
      customerEmail,
      redirectUrl,
    }) {
      if (!isConfigured) {
        return {
          status: false,
          isSimulated: true,
          message: "AllAPI token is not configured",
        }
      }

      const payload = {
        token,
        order_id: String(orderId),
        txn_amount: Number(amount),
        txn_note: String(note || "Wallet Topup"),
        product_name: String(productName || "Wallet Recharge"),
        customer_name: String(customerName || "Retailer"),
        customer_mobile: String(customerMobile || "9999999999"),
        customer_email: String(customerEmail || "customer@ldservicezone.in"),
        redirect_url: String(
          redirectUrl ||
            process.env.ALLAPI_CALLBACK_URL ||
            `${process.env.PUBLIC_APP_URL || "https://ldservicezone.in"}/dashboard/wallet`
        ),
      }

      const response = await fetch(`${baseUrl}/order/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      return data
    },

    async checkStatus(orderId, utr) {
      if (!isConfigured) {
        return { status: false, message: "AllAPI token is not configured" }
      }

      const payload = {
        token,
        order_id: String(orderId),
      }
      if (utr) {
        payload.utr = String(utr).trim()
      }

      const response = await fetch(`${baseUrl}/order/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      return data
    },

    verifyCallback(body) {
      if (!body) return false
      const status = String(body.status || body.STATUS || "").toLowerCase()
      return status === "success"
    },
  }
}
