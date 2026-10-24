import PaytmChecksum from "paytmchecksum"

export function createPaytmClient(config = {}) {
  const mid = config.mid || process.env.PAYTM_MID || ""
  const key = config.key || process.env.PAYTM_MERCHANT_KEY || ""
  const env = (config.env || process.env.PAYTM_ENV || "staging").toLowerCase()
  const website =
    config.website ||
    process.env.PAYTM_WEBSITE ||
    (env === "production" ? "DEFAULT" : "WEBSTAGING")
  const channelId = config.channelId || process.env.PAYTM_CHANNEL_ID || "WEB"
  const industryType =
    config.industryType || process.env.PAYTM_INDUSTRY_TYPE_ID || "Retail"
  const vpa =
    config.vpa ||
    process.env.ALLAPI_MERCHANT_VPA ||
    process.env.PAYTM_UPI_VPA ||
    process.env.MERCHANT_UPI_VPA ||
    "BHARATPE.8Q0A0L4F5K89444@fbpe"
  const merchantName =
    config.merchantName ||
    process.env.PAYTM_MERCHANT_NAME ||
    "LD SERVICE ZONE"

  const baseUrl =
    env === "production"
      ? "https://securegw.paytm.in"
      : "https://securegw-stage.paytm.in"

  const isConfigured = Boolean(mid && key)

  return {
    isConfigured,
    mid,
    key,
    env,
    baseUrl,
    vpa,
    merchantName,
    website,
    channelId,
    industryType,

    async initiateTransaction({ orderId, amount, customerId, callbackUrl }) {
      if (!isConfigured) {
        return {
          txnToken: `TEST_TOKEN_${Date.now()}`,
          orderId,
          isSimulated: true,
          amount,
        }
      }

      const body = {
        requestType: "Payment",
        mid,
        websiteName: website,
        orderId,
        txnAmount: {
          value: Number(amount).toFixed(2),
          currency: "INR",
        },
        userInfo: {
          custId: customerId || "CUST_DEFAULT",
        },
        callbackUrl:
          callbackUrl ||
          `${process.env.PUBLIC_APP_URL || "https://ldservicezone.in"}/api/wallet/paytm-callback`,
      }

      const signature = await PaytmChecksum.generateSignature(
        JSON.stringify(body),
        key,
      )
      const payload = {
        body,
        head: { signature },
      }

      const response = await fetch(
        `${baseUrl}/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )

      const data = await response.json()
      if (data?.body?.resultInfo?.resultStatus !== "S") {
        throw new Error(
          data?.body?.resultInfo?.resultMsg || "Paytm initiation failed",
        )
      }

      return {
        txnToken: data.body.txnToken,
        orderId,
        isSimulated: false,
        amount,
      }
    },

    async checkStatus(orderId) {
      if (!isConfigured) return { status: "PENDING", isSimulated: true }

      const body = { mid, orderId }
      const signature = await PaytmChecksum.generateSignature(
        JSON.stringify(body),
        key,
      )

      const response = await fetch(`${baseUrl}/v2/order/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, head: { signature } }),
      })

      const data = await response.json()
      return data?.body || {}
    },

    async verifyCallback(body, signature) {
      if (!isConfigured) return true
      return PaytmChecksum.verifySignature(body, key, signature)
    },
  }
}
