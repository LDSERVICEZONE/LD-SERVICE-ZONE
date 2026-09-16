const DEFAULT_BASE_URL = "https://panmitra.com/apiekyc"

function clean(value) {
  return String(value ?? "").trim()
}

export function createPanMitraClient({
  apiKey = process.env.PANMITRA_API_KEY,
  baseUrl = process.env.PANMITRA_BASE_URL || DEFAULT_BASE_URL,
} = {}) {
  const key = clean(apiKey)
  const base = clean(baseUrl).replace(/\/$/, "")

  function configured() {
    return Boolean(key && base)
  }

  async function request(endpoint, params = {}) {
    if (!configured()) {
      throw Object.assign(
        new Error("Pan Mitra API is not configured. Set PANMITRA_API_KEY and PANMITRA_BASE_URL."),
        { status: 503 },
      )
    }

    const query = new URLSearchParams({ api_key: key })
    for (const [name, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && String(value) !== "") {
        query.set(name, String(value))
      }
    }

    const response = await fetch(`${base}/${endpoint}?${query}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    })
    const text = await response.text()
    let data
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { message: text }
    }
    if (!response.ok) {
      throw Object.assign(
        new Error(data?.message || `Pan Mitra request failed (${response.status})`),
        { status: 502 },
      )
    }
    return data
  }

  return {
    configured,
    createVle: (input) =>
      request("add_vle", {
        vle_id: clean(input.vleId),
        vle_name: clean(input.vleName),
        vle_mob: clean(input.vleMobile),
        vle_email: clean(input.vleEmail),
        vle_shop: clean(input.vleShop),
        vle_loc: clean(input.vleLocation),
        vle_state: clean(input.vleState),
        vle_pin: clean(input.vlePin),
        vle_uid: clean(input.vleAadhaar),
        vle_pan: clean(input.vlePan).toUpperCase(),
      }),
    getVleStatus: (vleId) => request("vle_status", { vle_id: clean(vleId) }),
    resetPassword: (vleId) => request("pass_reset", { vle_id: clean(vleId) }),
    getBalance: () => request("balance"),
    requestCoupons: (vleId, type, quantity) =>
      request("coupon_req", {
        vle_id: clean(vleId),
        type: clean(type || "1"),
        qty: quantity,
      }),
  }
}

