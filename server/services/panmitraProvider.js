const DEFAULT_BASE_URL = "https://panmitra.com/apiekyc"

export const STATE_CODE_MAP = {
  "jammu and kashmir": "01", "jammu & kashmir": "01", "jk": "01",
  "himachal pradesh": "02", "hp": "02",
  "punjab": "03", "pb": "03",
  "chandigarh": "04", "ch": "04",
  "uttarakhand": "05", "uk": "05", "ua": "05",
  "haryana": "06", "hr": "06",
  "delhi": "07", "delhi ncr": "07", "dl": "07", "nct of delhi": "07",
  "rajasthan": "08", "rj": "08",
  "uttar pradesh": "09", "up": "09",
  "bihar": "10", "br": "10",
  "sikkim": "11", "sk": "11",
  "arunachal pradesh": "12", "ar": "12",
  "nagaland": "13", "nl": "13",
  "manipur": "14", "mn": "14",
  "mizoram": "15", "mz": "15",
  "tripura": "16", "tr": "16",
  "meghalaya": "17", "ml": "17",
  "assam": "18", "as": "18",
  "west bengal": "19", "wb": "19",
  "jharkhand": "20", "jh": "20",
  "odisha": "21", "orissa": "21", "or": "21", "od": "21",
  "chhattisgarh": "22", "cg": "22", "ct": "22",
  "madhya pradesh": "23", "mp": "23",
  "gujarat": "24", "gj": "24",
  "daman and diu": "25", "dd": "25",
  "dadra and nagar haveli": "26", "dn": "26",
  "maharashtra": "27", "mh": "27",
  "andhra pradesh": "28", "ap": "28",
  "karnataka": "29", "ka": "29",
  "goa": "30", "ga": "30",
  "lakshadweep": "31", "ld": "31",
  "kerala": "32", "kl": "32",
  "tamil nadu": "33", "tn": "33",
  "puducherry": "34", "pondicherry": "34", "py": "34",
  "andaman and nicobar islands": "35", "an": "35",
  "telangana": "36", "ts": "36", "tg": "36",
  "ladakh": "38", "la": "38",
}

export function normalizeStateCode(input) {
  const val = String(input ?? "").trim().toLowerCase()
  if (/^\d{1,2}$/.test(val)) {
    return val.padStart(2, "0")
  }
  return STATE_CODE_MAP[val] || "21" // default 21 (Odisha)
}

function clean(value) {
  return String(value ?? "").trim()
}

function cleanVleId(value) {
  // Strip any LDSZ- or PANM- prefix when interacting with PanMitra
  return clean(value).replace(/^(PANM|LDSZ)[-_]/i, "")
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
    normalizeStateCode,
    createVle: async (input) => {
      const rawVleId = cleanVleId(input.vleId)
      const stateCode = normalizeStateCode(input.vleState)
      const cleanMobile = clean(input.vleMobile).replace(/\D/g, "").slice(-10)
      const cleanAadhaar = clean(input.vleAadhaar).replace(/\D/g, "")
      const cleanPan = clean(input.vlePan).toUpperCase()
      if (cleanAadhaar.length !== 12) {
        throw Object.assign(
          new Error("A valid 12-digit Aadhaar number is required for UTI PSA registration"),
          { status: 400 },
        )
      }
      if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(cleanPan)) {
        throw Object.assign(
          new Error("A valid PAN number (e.g. ABCDE1234F) is required for UTI PSA registration"),
          { status: 400 },
        )
      }

      const res = await request("add_vle", {
        vle_id: rawVleId,
        vle_name: clean(input.vleName),
        vle_mob: cleanMobile,
        vle_email: clean(input.vleEmail),
        vle_shop: clean(input.vleShop),
        vle_loc: clean(input.vleLocation) || "Bhubaneswar",
        vle_state: stateCode,
        vle_pin: clean(input.vlePin).slice(0, 6) || "751001",
        vle_uid: cleanAadhaar,
        vle_pan: cleanPan,
      })

      if (res.status === "FAILED") {
        const msg = String(res.message || "")
        if (msg.toLowerCase().includes("already exist")) {
          // If already exists, return with the existing VLE ID and registration code
          const existingId = res.vle_id
            ? `LDSZ-${cleanVleId(res.vle_id)}`
            : `LDSZ-${rawVleId}`
          return {
            status: "SUCCESS",
            vleId: existingId,
            code: res.psa_otp || res.code || null,
            message: "VLE already registered and active on PanMitra / UTI PSA.",
            alreadyExists: true,
            raw: res,
          }
        }
        throw Object.assign(
          new Error(res.message || "Failed to create VLE on PanMitra"),
          { status: 400, details: res },
        )
      }

      const assignedVleId = res.vle_id
        ? `LDSZ-${cleanVleId(res.vle_id)}`
        : `LDSZ-${rawVleId}`
      return {
        status: "SUCCESS",
        vleId: assignedVleId,
        code: res.code || res.psa_otp || null,
        message: res.message || "Vle Created Successfully",
        raw: res,
      }
    },
    getVleStatus: (vleId) => request("vle_status", { vle_id: clean(vleId) }),
    resetPassword: (vleId) => request("pass_reset", { vle_id: clean(vleId) }),
    getBalance: () => request("balance"),
    requestCoupons: async (vleId, type, quantity) => {
      const res = await request("coupon_req", {
        vle_id: clean(vleId),
        type: clean(type || "1"),
        qty: quantity,
      })
      if (res.status === "FAILED") {
        throw Object.assign(
          new Error(res.message || "Coupon allocation failed on PanMitra"),
          { status: 400, details: res },
        )
      }
      return res
    },
  }
}
