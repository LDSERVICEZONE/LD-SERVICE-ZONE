import crypto from "node:crypto"

const BASE_URL = String(
  process.env.PAY2ALL_BASE_URL || "https://pay2all.in/api/v1",
).replace(/\/$/, "")

const API_KEY = String(process.env.PAY2ALL_API_KEY || "").trim()

const PLANS_PATH = String(process.env.PAY2ALL_PLANS_PATH || "").trim()

const STATUS_PATH = String(process.env.PAY2ALL_STATUS_PATH || "").trim()

const DETECT_PATH = String(process.env.PAY2ALL_DETECT_PATH || "").trim()

const FALLBACK_DETECT_URL = String(
  process.env.RECHARGE_DETECT_URL ||
    "https://open-api.plansinfo.com/mobile/operator-circle",
).trim()

export function configured() {
  return Boolean(API_KEY && BASE_URL)
}

function requireConfigured() {
  if (!configured())
    throw new Error(
      "Pay2All recharge service is not configured. Check PAY2ALL_API_KEY and PAY2ALL_BASE_URL in .env, then restart the backend.",
    )
}

async function request(path, method = "GET", body) {
  requireConfigured()

  const response = await fetch(`${BASE_URL}${path}`, {
    method,

    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },

    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await response.text()

  let data = {}

  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { message: text }
  }

  if (!response.ok)
    throw new Error(
      data?.message ||
        data?.error ||
        `Pay2All request failed (${response.status})`,
    )

  if (Number(data?.status_id) === 2)
    throw new Error(data.message || "Pay2All rejected the request")

  return data
}

export async function detectOperatorCircle(mobile) {
  const number = String(mobile || "").replace(/\D/g, "")

  if (!/^\d{10}$/.test(number))
    throw new Error("Enter a valid 10-digit mobile number")

  // If Pay2All gives this account a lookup endpoint, prefer it.

  if (DETECT_PATH) {
    const result = await request(DETECT_PATH, "POST", {
      mobile_number: number,
      number,
    })

    const d = result?.data?.result || result?.data || result?.result || result

    return normalizeDetection(d, number)
  }

  // Pay2All's published API docs currently document /providers and /recharge,

  // but not a public operator/circle lookup endpoint. Use the configured

  // lookup service as a server-side fallback rather than guessing from prefixes.

  const url = `${FALLBACK_DETECT_URL}?number=${encodeURIComponent(number)}`

  const response = await fetch(url, { headers: { Accept: "application/json" } })

  const text = await response.text()

  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { message: text }
  }

  if (!response.ok)
    throw new Error(
      data?.message || `Operator lookup failed (${response.status})`,
    )

  const d = data?.data || data?.result || data

  return normalizeDetection(d, number)
}

function normalizeDetection(d, number) {
  const operator =
    d?.operator ||
    d?.Operator ||
    d?.provider ||
    d?.operator_name ||
    d?.operatorName

  const circle = d?.circle || d?.Circle || d?.circle_name || d?.circleName

  const operatorCode =
    d?.opid ||
    d?.operator_code ||
    d?.OpCode ||
    d?.operatorId ||
    d?.operator_id ||
    ""

  const circleCode =
    d?.circle_code || d?.CircleCode || d?.circleId || d?.circle_id || ""

  if (!operator || !circle)
    throw new Error(
      d?.message || "Operator/circle could not be detected for this number",
    )

  return {
    number,
    operator: String(operator),
    circle: String(circle),
    operatorCode: String(operatorCode),
    circleCode: String(circleCode),
    source: DETECT_PATH ? "pay2all" : "lookup",
  }
}

export async function getProviders() {
  return request("/providers")
}

export async function getPlans(operator, circle) {
  requireConfigured()

  if (!PLANS_PATH)
    return {
      status_id: 1,
      data: { plans: [] },
      message: "Plans unavailable from Pay2All. Enter an amount manually.",
    }

  const query = new URLSearchParams({
    operator: String(operator || ""),
    circle: String(circle || ""),
  })

  return request(`${PLANS_PATH}${PLANS_PATH.includes("?") ? "&" : "?"}${query}`)
}

export async function initiateRecharge(
  mobile,
  operator,
  circle,
  amount,
  providerId,
  type = "MOBILE",
  customerMobile = "",
) {
  requireConfigured()

  const clientId = `RC-${Date.now()}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`

  const payload = {
    client_id: clientId,
    provider_id: Number(providerId),
    number: String(mobile).replace(/\D/g, ""),
    amount: Number(amount),
    type: type === "DTH" ? "DTH" : "MOBILE",
  }

  if (customerMobile)
    payload.customer_mobile = String(customerMobile).replace(/\D/g, "")

  const result = await request("/recharge", "POST", payload)

  return { ...result, clientId, operator, circle }
}

export async function checkRechargeStatus(transactionId) {
  requireConfigured()

  if (!STATUS_PATH)
    return {
      status_id: 3,
      message:
        "Status polling unavailable; final status is reconciled by webhook.",
    }

  return request(
    STATUS_PATH.replace(":transactionId", encodeURIComponent(transactionId)),
  )
}
