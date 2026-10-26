const DEFAULT_BASE_URL = "https://apinice.in/api/v1"

function clean(value) {
  return String(value ?? "").trim()
}

export class ApiniceProvider {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.APINICE_API_KEY || ""
    this.baseUrl = (options.baseUrl || process.env.APINICE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "")
  }

  getApiKey() {
    return this.apiKey || process.env.APINICE_API_KEY || ""
  }

  configured() {
    return Boolean(this.getApiKey())
  }

  async request(endpoint, options = {}) {
    const key = this.getApiKey()
    const url = `${this.baseUrl}/${endpoint.replace(/^\/+/, "")}`
    const method = options.method || "GET"
    const headers = {
      "X-API-Key": key,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    }

    let body
    if (options.body && typeof options.body === "object") {
      body = JSON.stringify({
        apiKey: key,
        ...options.body,
      })
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), options.timeoutMs || 45000)

    try {
      const res = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      })

      const text = await res.text()
      let json
      try {
        json = JSON.parse(text)
      } catch {
        json = null
      }

      if (!res.ok) {
        const errorMsg = json?.message || json?.error || `HTTP ${res.status}: ${res.statusText}`
        throw new Error(errorMsg)
      }

      return json || { raw: text }
    } finally {
      clearTimeout(timer)
    }
  }

  async checkBalance() {
    if (!this.configured()) {
      return { configured: false, balance: 0, message: "APINICE API key is not configured" }
    }

    try {
      const data = await this.request("balance.php")
      const balance = Number(data.balance || 0)
      return {
        configured: true,
        success: data.success || data.status === "success",
        balance: Number.isFinite(balance) ? balance : 0,
        currency: data.currency || "INR",
        username: data.username || "APINICE19",
        message: data.message || "Balance retrieved successfully",
      }
    } catch (err) {
      return {
        configured: true,
        success: false,
        balance: 0,
        error: err.message,
      }
    }
  }

  async printRc({ rcno, cardtype = "2", chiptype = "1" }) {
    const cleanRc = clean(rcno).replace(/[\s-]/g, "").toUpperCase()
    if (!cleanRc) {
      throw new Error("Vehicle Registration Number (RC Number) is required")
    }

    const response = await this.request("rc_print", {
      method: "POST",
      body: {
        rcno: cleanRc,
        cardtype: String(cardtype || "2"),
        chiptype: String(chiptype || "1"),
      },
      timeoutMs: 60000,
    })

    if (response.status === "error" || response.status === 400 || !response.data) {
      throw new Error(response.message || response.data?.message || "Failed to generate RC print")
    }

    return {
      success: true,
      service: "RC_PRINT",
      rcno: cleanRc,
      pdf: response.data.pdf || response.data.url || null,
      balanceRemaining: response.balance_remaining,
    }
  }

  async printDl({ dlno, dob, cardtype = "1" }) {
    const cleanDl = clean(dlno).replace(/\s+/g, "").toUpperCase()
    const cleanDob = clean(dob)

    if (!cleanDl) throw new Error("Driving Licence Number is required")
    if (!cleanDob) throw new Error("Date of Birth is required (format: DD-MM-YYYY)")

    // Normalize DOB if format is YYYY-MM-DD
    let formattedDob = cleanDob
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDob)) {
      const [yyyy, mm, dd] = cleanDob.split("-")
      formattedDob = `${dd}-${mm}-${yyyy}`
    }

    const response = await this.request("dl_print", {
      method: "POST",
      body: {
        dlno: cleanDl,
        dob: formattedDob,
        cardtype: String(cardtype || "1"),
      },
      timeoutMs: 60000,
    })

    if (response.status === "error" || response.status === 400 || !response.data) {
      throw new Error(response.message || response.data?.message || "Failed to generate Driving Licence print")
    }

    return {
      success: true,
      service: "DL_PRINT",
      dlno: cleanDl,
      pdf: response.data.pdf || response.data.url || null,
      balanceRemaining: response.balance_remaining,
    }
  }

  async printRation({ rationno, card_type = "1" }) {
    const cleanRation = clean(rationno).replace(/\s+/g, "")
    if (!cleanRation) throw new Error("Ration Card Number is required")

    const response = await this.request("ration_print", {
      method: "POST",
      body: {
        rationno: cleanRation,
        card_type: String(card_type || "1"),
      },
      timeoutMs: 60000,
    })

    if (response.status === "error" || response.status === 400 || !response.data) {
      throw new Error(response.message || response.data?.message || "Failed to generate Ration Card print")
    }

    return {
      success: true,
      service: "RATION_PRINT",
      rationno: cleanRation,
      pdf: response.data.pdf || response.data.url || null,
      balanceRemaining: response.balance_remaining,
    }
  }

  async checkVehicleChallan(vehicleNumber) {
    const cleanVehicle = clean(vehicleNumber).replace(/[\s-]/g, "").toUpperCase()
    if (!cleanVehicle) {
      throw new Error("Vehicle Registration Number is required")
    }

    const response = await this.request("challan_by_vehicle", {
      method: "POST",
      body: {
        vehicle: cleanVehicle,
      },
      timeoutMs: 45000,
    })

    if (response.status === false && !response.data) {
      throw new Error(response.message || "Failed to fetch vehicle challan records")
    }

    const data = response.data || {}
    return {
      success: true,
      service: "VEHICLE_CHALLAN",
      vehicleNumber: cleanVehicle,
      challanCount: data.challan_count ?? (Array.isArray(data.challans) ? data.challans.length : 0),
      totalAmount: data.total_amount ?? 0,
      challans: Array.isArray(data.challans) ? data.challans : [],
      message: response.message || "Vehicle challan lookup completed",
      balanceRemaining: response.balance || response.balance_remaining,
    }
  }
}

export const apiniceProvider = new ApiniceProvider()
