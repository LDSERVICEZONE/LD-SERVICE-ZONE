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

  async downloadAbhaCard({ uidNumber, dob }) {
    const cleanUid = clean(uidNumber).replace(/[\s-]/g, "")
    const cleanDob = clean(dob)

    if (!cleanUid || cleanUid.length !== 12) {
      throw new Error("Valid 12-digit Aadhaar / UID number is required")
    }
    if (!cleanDob) {
      throw new Error("Date of Birth is required (format: DD-MM-YYYY)")
    }

    // Normalize DOB if YYYY-MM-DD
    let formattedDob = cleanDob
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDob)) {
      const [yyyy, mm, dd] = cleanDob.split("-")
      formattedDob = `${dd}-${mm}-${yyyy}`
    }

    const response = await this.request("abha_card_download", {
      method: "POST",
      body: {
        uidNumber: cleanUid,
        dob: formattedDob,
      },
      timeoutMs: 60000,
    })

    if (
      response.success === false ||
      response.status === "101" ||
      (!response.data && !response.pdf && !response.image_base64)
    ) {
      throw new Error(response.message || "Failed to download ABHA Health Card")
    }

    const data = response.data || {}
    const imageBase64 = data.image_base64 || response.image_base64 || null
    const pdf = data.pdf || response.pdf || null

    return {
      success: true,
      service: "ABHA_CARD",
      uidNumber: cleanUid,
      dob: formattedDob,
      imageBase64,
      pdf,
      fields: data.fields || null,
      balanceRemaining: response.balance_remaining || response.balance,
      raw: response,
    }
  }

  async verifyVoterId({ epic, stateId = "" }) {
    const cleanEpic = clean(epic).replace(/\s+/g, "").toUpperCase()
    if (!cleanEpic) {
      throw new Error("Valid Voter ID / EPIC number is required")
    }

    const body = {
      epic: cleanEpic,
    }
    if (stateId) body.state_id = clean(stateId).toUpperCase()

    const response = await this.request("voter_id_verification", {
      method: "POST",
      body,
      timeoutMs: 45000,
    })

    if (response.status === false || response.success === false || !response.data) {
      throw new Error(response.message || "No voter record found for this EPIC number.")
    }

    return {
      success: true,
      service: "VOTER_VERIFICATION",
      epic: cleanEpic,
      data: response.data,
      balanceRemaining: response.balance || response.balance_remaining,
      raw: response,
    }
  }

  async downloadVoterPdf({ epicNumber, state, name = "", partnerRef = "" }) {
    const cleanEpic = clean(epicNumber).replace(/\s+/g, "").toUpperCase()
    const cleanState = clean(state).toUpperCase()

    if (!cleanEpic) {
      throw new Error("Valid Voter ID / EPIC number is required")
    }
    if (!cleanState) {
      throw new Error("State code (e.g. BR, UP, OD, MH) is required")
    }

    const body = {
      epic_number: cleanEpic,
      state: cleanState,
    }
    if (name) body.name = clean(name)
    if (partnerRef) body.partner_ref = clean(partnerRef)

    const response = await this.request("voter_pdf_download", {
      method: "POST",
      body,
      timeoutMs: 60000,
    })

    if (response.status === false || response.success === false) {
      throw new Error(response.message || "Failed to initiate Voter Card PDF download")
    }

    return {
      success: true,
      service: "VOTER_PDF",
      epic: cleanEpic,
      state: cleanState,
      orderId: response.order_id || response.ref_id || response.id,
      pdfUrl: response.pdf_url || response.url || response.data?.pdf || null,
      status: response.status || "PENDING",
      balanceRemaining: response.balance_remaining || response.balance,
      raw: response,
    }
  }

  async linkVoterMobile({ epic, mobile }) {
    const cleanEpic = clean(epic).replace(/\s+/g, "").toUpperCase()
    const cleanMobile = clean(mobile).replace(/\D/g, "")

    if (!cleanEpic) {
      throw new Error("Valid Voter ID / EPIC number is required")
    }
    if (!cleanMobile || cleanMobile.length !== 10) {
      throw new Error("Valid 10-digit mobile number is required")
    }

    const response = await this.request("voter_link_instant", {
      method: "POST",
      body: {
        epic: cleanEpic,
        mobile: cleanMobile,
      },
      timeoutMs: 45000,
    })

    if (
      response.status === false ||
      response.status === 400 ||
      (response.status !== "200" && response.status !== 200 && response.success !== true)
    ) {
      throw new Error(response.message || "Failed to initiate Voter Mobile linking")
    }

    return {
      success: true,
      service: "VOTER_MOBILE_LINK",
      epic: cleanEpic,
      mobile: cleanMobile,
      refId: response.ref_id || response.reference_id,
      applicationNo: response.application_no || response.order_id,
      amount: response.amount,
      message: response.message || "Number linked pending. Complete within 5 minutes.",
      balanceRemaining: response.balance_left || response.balance,
      raw: response,
    }
  }

  async fetchLearningLicencePdf({ idNumber }) {
    const cleanId = clean(idNumber).replace(/\s+/g, "").toUpperCase()
    if (!cleanId) {
      throw new Error("Learning Licence (LL) Number / ID is required")
    }

    const key = this.getApiKey()
    const endpoint = `ll_pdf?apiKey=${encodeURIComponent(key)}&idNumber=${encodeURIComponent(cleanId)}`

    const response = await this.request(endpoint, {
      method: "GET",
      timeoutMs: 60000,
    })

    if (response.success === false || response.status === "101" || (!response.data && !response.pdf_base64 && !response.pdf)) {
      throw new Error(response.message || "Failed to download Learning Licence PDF")
    }

    const pdfBase64 = response.data?.pdf_base64 || response.pdf_base64 || response.pdf || null

    return {
      success: true,
      service: "LL_PDF",
      idNumber: cleanId,
      pdfBase64,
      balanceRemaining: response.balance_remaining || response.balance,
      raw: response,
    }
  }

  async lookupChassisToRc({ chassisNumber }) {
    const cleanChassis = clean(chassisNumber).replace(/\s+/g, "").toUpperCase()
    if (!cleanChassis) {
      throw new Error("Vehicle Chassis Number is required")
    }

    const key = this.getApiKey()
    const endpoint = `chassis_to_rc_p4p?apiKey=${encodeURIComponent(key)}&chassisNumber=${encodeURIComponent(cleanChassis)}`

    const response = await this.request(endpoint, {
      method: "GET",
      timeoutMs: 45000,
    })

    if (response.status === false || response.StatusCode === 404 || !response.plate) {
      throw new Error(response.message || "Vehicle not found for this chassis number")
    }

    const queryResult = response.data?.query_result || {}
    const location = response.data?.location || {}

    return {
      success: true,
      service: "CHASSIS_TO_RC",
      chassisNumber: cleanChassis,
      plate: response.plate,
      fullName: response.full_name || "",
      relationName: response.relation_name || "",
      queryResult,
      location,
      raw: response,
    }
  }

  async lookupRcToMobile({ vehicleNumber }) {
    const cleanVehicle = clean(vehicleNumber).replace(/[\s-]/g, "").toUpperCase()
    if (!cleanVehicle) {
      throw new Error("Vehicle Registration Number is required")
    }

    const key = this.getApiKey()
    const endpoint = `rc_to_mobile?apiKey=${encodeURIComponent(key)}&vehicalNumber=${encodeURIComponent(cleanVehicle)}`

    const response = await this.request(endpoint, {
      method: "GET",
      timeoutMs: 45000,
    })

    if (response.status === false || response.StatusCode === 422 || !response.holder) {
      throw new Error(response.error || response.message || "RC contact mobile number not found")
    }

    const holder = response.holder || {}

    return {
      success: true,
      service: "RC_TO_MOBILE",
      vehicleNumber: cleanVehicle,
      holder,
      fullName: holder.full_name || "",
      relationName: holder.relation_name || "",
      contact: holder.contact || "",
      raw: response,
    }
  }
}

export const apiniceProvider = new ApiniceProvider()
