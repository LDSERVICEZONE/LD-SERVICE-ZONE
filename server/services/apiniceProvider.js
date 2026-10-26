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
    let url
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      url = endpoint
    } else if (endpoint.startsWith("v2/") || endpoint.startsWith("/v2/")) {
      url = `${this.baseUrl.replace(/\/api\/v1\/?$/, "")}/api/${endpoint.replace(/^\/+/, "")}`
    } else {
      url = `${this.baseUrl}/${endpoint.replace(/^\/+/, "")}`
    }
    const method = options.method || "GET"
    const headers = {
      "X-API-Key": key,
      ...(options.headers || {}),
    }

    let body
    if (typeof FormData !== "undefined" && options.body instanceof FormData) {
      body = options.body
    } else if (options.body && typeof options.body === "object") {
      headers["Content-Type"] = "application/json"
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

  async downloadEshramCard({ uidNumber, dob }) {
    const cleanUid = clean(uidNumber).replace(/[\s-]/g, "")
    const cleanDob = clean(dob)

    if (!cleanUid || cleanUid.length !== 12) {
      throw new Error("Valid 12-digit Aadhaar (UID) number is required")
    }
    if (!cleanDob) {
      throw new Error("Date of Birth is required (format: DD-MM-YYYY)")
    }

    let formattedDob = cleanDob
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDob)) {
      const [yyyy, mm, dd] = cleanDob.split("-")
      formattedDob = `${dd}-${mm}-${yyyy}`
    }

    const key = this.getApiKey()

    // 1. Try eshram_verification (low rate, reliable)
    let response
    try {
      const endpoint = `eshram_verification?apiKey=${encodeURIComponent(key)}&uidNumber=${encodeURIComponent(cleanUid)}&dob=${encodeURIComponent(formattedDob)}`
      response = await this.request(endpoint, {
        method: "GET",
        timeoutMs: 45000,
      })
    } catch (err) {
      // Fallback to eshram_pdf
      const fallbackEndpoint = `eshram_pdf?apiKey=${encodeURIComponent(key)}&uidNumber=${encodeURIComponent(cleanUid)}&dob=${encodeURIComponent(formattedDob)}`
      response = await this.request(fallbackEndpoint, {
        method: "GET",
        timeoutMs: 45000,
      })
    }

    if (
      response.success === false ||
      response.status === "101" ||
      (!response.data && !response.pdf_base64 && !response.pdf)
    ) {
      throw new Error(response.message || "Failed to download e-Shram card PDF. Please verify Aadhaar & DOB.")
    }

    const pdfBase64 =
      response.data?.pdf_base64 ||
      response.pdf_base64 ||
      response.pdf ||
      (typeof response.data === "string" ? response.data : null)

    return {
      success: true,
      service: "ESHRAM_CARD",
      uidNumber: cleanUid,
      dob: formattedDob,
      pdfBase64,
      balanceRemaining: response.balance_remaining || response.balance,
      raw: response,
    }
  }

  async convertAadhaarPvc({ pdfBase64, password, mobilePrint = "Yes", cardColor = "White" }) {
    if (!pdfBase64) {
      throw new Error("Aadhaar PDF file or base64 stream is required")
    }
    const cleanPassword = clean(password)
    if (!cleanPassword) {
      throw new Error("e-Aadhaar PDF password is required")
    }

    const key = this.getApiKey()
    const cleanB64 = String(pdfBase64).replace(/^data:application\/pdf;base64,/, "").trim()
    const buffer = Buffer.from(cleanB64, "base64")
    const blob = new Blob([buffer], { type: "application/pdf" })

    const fd = new FormData()
    fd.append("apiKey", key)
    fd.append("file", blob, "aadhaar.pdf")
    fd.append("password", cleanPassword)
    fd.append("mobilePrint", mobilePrint || "Yes")
    fd.append("cardColor", cardColor || "White")

    const response = await this.request("aadhar_pvc_convert", {
      method: "POST",
      body: fd,
      timeoutMs: 60000,
    })

    if (
      response.success === false ||
      response.status === "101" ||
      (!response.data && !response.pdf_base64 && !response.pdf)
    ) {
      throw new Error(response.message || "Failed to convert Aadhaar to PVC card. Please check PDF password.")
    }

    const resultPdf = response.data?.pdf_base64 || response.pdf_base64 || response.pdf || null

    return {
      success: true,
      service: "AADHAAR_PVC_CONVERT",
      pdfBase64: resultPdf,
      cardColor: cardColor || "White",
      mobilePrint: mobilePrint || "Yes",
      balanceRemaining: response.balance_remaining || response.balance,
      raw: response,
    }
  }

  async fetchAgristackFarmerPdf({ uidNumber, state }) {
    const cleanUid = clean(uidNumber).replace(/[\s-]/g, "")
    const cleanState = clean(state).toUpperCase()

    if (!cleanUid || cleanUid.length !== 12) {
      throw new Error("Valid 12-digit Aadhaar (UID) of the farmer is required")
    }
    if (!cleanState) {
      throw new Error("State code (e.g. UP, BR, MH, OD, RJ) is required")
    }

    const key = this.getApiKey()
    const endpoint = `agristack_approved_farmers_pdf?apiKey=${encodeURIComponent(key)}&uidNumber=${encodeURIComponent(cleanUid)}&state=${encodeURIComponent(cleanState)}`

    const response = await this.request(endpoint, {
      method: "GET",
      timeoutMs: 45000,
    })

    if (response.status !== 100 && response.status !== "100" && response.statusMessage !== "success") {
      throw new Error(response.message || "Farmer record not found or not approved in AgriStack registry")
    }

    const farmerData = response.data || {}
    const pdf = farmerData.pdf || response.pdf || null

    return {
      success: true,
      service: "AGRISTACK_FARMER",
      uidNumber: cleanUid,
      state: cleanState,
      name: farmerData.name || "",
      applicationNo: response.application_no || "",
      pdfBase64: pdf,
      raw: response,
    }
  }

  async fetchUdyogAadhaar({ uan }) {
    const cleanUan = clean(uan).replace(/\s+/g, "").toUpperCase()
    if (!cleanUan) {
      throw new Error("Valid Udyam Registration Number (UAN) is required (e.g. UDYAM-XX-00-0000000)")
    }

    const key = this.getApiKey()
    const body = {
      apiKey: key,
      uan: cleanUan,
    }

    const response = await this.request("udyog_aadhaar", {
      method: "POST",
      body,
      timeoutMs: 45000,
    })

    if (response.status === false || (response.data === undefined && !response.name_of_enterprise)) {
      throw new Error(response.message || "Udyog Aadhaar / Udyam registration not found")
    }

    const details = response.data || response
    return {
      success: true,
      service: "UDYOG_AADHAAR",
      uan: cleanUan,
      enterpriseName: details.name_of_enterprise || details.enterprise_name || "",
      certificateUrl: details.certificate_url || null,
      mainDetails: details.main_details || {},
      plants: details.plants || [],
      nicCode: details.nic_code || [],
      balanceRemaining: response.balance || response.balance_remaining,
      raw: response,
    }
  }

  async checkNpciAadhaarStatus({ aadhaar }) {
    const cleanAadhaar = clean(aadhaar).replace(/[\s-]/g, "")
    if (!cleanAadhaar || cleanAadhaar.length !== 12) {
      throw new Error("Valid 12-digit Aadhaar number is required")
    }

    const key = this.getApiKey()
    const endpoint = `npci-aadhaar-link-status?apiKey=${encodeURIComponent(key)}&aadhaar=${encodeURIComponent(cleanAadhaar)}`

    const response = await this.request(endpoint, {
      method: "GET",
      timeoutMs: 45000,
    })

    if (response.status === false || (response.StatusCode !== 100 && response.StatusCode !== "100" && !response.data)) {
      throw new Error(response.message || "NPCI record not found for this Aadhaar")
    }

    const npciData = response.data || response
    return {
      success: true,
      service: "NPCI_STATUS",
      aadhaar: cleanAadhaar,
      bank: npciData.bank || npciData.bank_name || "Linked Bank",
      status: npciData.status || "ACTIVE",
      lastUpdate: npciData.last_update || npciData.date || null,
      balanceRemaining: response.balance || response.balance_remaining,
      raw: response,
    }
  }

  async fetchGstDetails({ gst }) {
    const cleanGst = clean(gst).replace(/[\s-]/g, "").toUpperCase()
    if (!cleanGst || cleanGst.length !== 15) {
      throw new Error("Valid 15-character GSTIN number is required")
    }

    const key = this.getApiKey()
    const endpoint = `gst_details?api_key=${encodeURIComponent(key)}&gst=${encodeURIComponent(cleanGst)}`

    const response = await this.request(endpoint, {
      method: "GET",
      timeoutMs: 45000,
    })

    if (response.status === false || (response.status !== "200" && response.status !== 200 && !response.details)) {
      throw new Error(response.message || "GSTIN record not found or invalid")
    }

    const details = response.details || response.data || response
    return {
      success: true,
      service: "GST_DETAILS",
      gst: cleanGst,
      details: {
        legalName: details.legal_name || details.lgnm || "",
        tradeName: details.trade_name || details.tradeNam || details.legal_name || "",
        status: details.status || details.sts || "Active",
        constitution: details.constitution || details.ctb || "",
        taxPayerType: details.tax_payer_type || details.dty || "",
        registrationDate: details.registration_date || details.rgdt || "",
        address: details.principal_address || details.pradr || details.address || "",
        stateJurisdiction: details.state_jurisdiction || details.stj || "",
      },
      balanceRemaining: response.balance || response.balance_remaining,
      raw: response,
    }
  }

  async verifyPassport({ fileNo, dob }) {
    const cleanFileNo = clean(fileNo).replace(/\s+/g, "").toUpperCase()
    let cleanDob = clean(dob).trim()
    if (cleanDob.includes("/")) {
      cleanDob = cleanDob.replace(/\//g, "-")
    }

    if (!cleanFileNo) {
      throw new Error("Valid Passport File Number is required (e.g. CA1073849182390)")
    }
    if (!cleanDob) {
      throw new Error("Citizen Date of Birth (DD-MM-YYYY) is required")
    }

    const key = this.getApiKey()
    const body = {
      apiKey: key,
      file_no: cleanFileNo,
      dob: cleanDob,
    }

    const response = await this.request("passport_verification", {
      method: "POST",
      body,
      timeoutMs: 45000,
    })

    if (response.status === false || (!response.data && !response.holder_name)) {
      throw new Error(response.message || "Passport record not found or details mismatched")
    }

    const data = response.data || response
    return {
      success: true,
      service: "PASSPORT_VERIFY",
      fileNo: cleanFileNo,
      holderName: data.holder_name || data.name || "",
      dob: data.dob || cleanDob,
      passportNumber: data.passport_number || data.passport_no || "",
      applicationDate: data.application_date || "",
      fileNumber: data.file_number || cleanFileNo,
      balanceRemaining: response.balance || response.balance_remaining,
      raw: response,
    }
  }

  async lookupIfscDetails({ ifsc }) {
    const cleanIfsc = clean(ifsc).replace(/\s+/g, "").toUpperCase()

    if (!cleanIfsc || cleanIfsc.length !== 11) {
      throw new Error("Valid 11-character Bank IFSC Code is required (e.g. SBIN0001234)")
    }

    const key = this.getApiKey()
    const endpoint = `ifsc_details?api_key=${encodeURIComponent(key)}&ifsc=${encodeURIComponent(cleanIfsc)}`

    const response = await this.request(endpoint, {
      method: "GET",
      timeoutMs: 30000,
    })

    if (
      response.status === false ||
      response.status === "404" ||
      (!response.data && !response.BANK && !response.bank)
    ) {
      throw new Error(response.message || "Invalid IFSC code or bank branch details not found")
    }

    const data = response.data || response
    return {
      success: true,
      service: "IFSC_DETAILS",
      ifsc: cleanIfsc,
      bank: data.BANK || data.bank || data.bank_name || "",
      branch: data.BRANCH || data.branch || "",
      city: data.CITY || data.city || "",
      district: data.DISTRICT || data.district || "",
      state: data.STATE || data.state || "",
      address: data.ADDRESS || data.address || "",
      contact: data.CONTACT || data.contact || "",
      micr: data.MICR || data.micr || "",
      imps: Boolean(data.IMPS ?? data.imps),
      neft: Boolean(data.NEFT ?? data.neft),
      rtgs: Boolean(data.RTGS ?? data.rtgs),
      upi: Boolean(data.UPI ?? data.upi),
      balanceRemaining: response.balance || response.balance_remaining,
      raw: response,
    }
  }

  async downloadElectricBillPdf({ caNumber }) {
    const cleanCa = clean(caNumber).replace(/\s+/g, "").toUpperCase()

    if (!cleanCa) {
      throw new Error("Valid Consumer / CA Number is required (e.g. 102938475)")
    }

    const key = this.getApiKey()
    const endpoint = `electric_bill_pdf?apiKey=${encodeURIComponent(key)}&caNumber=${encodeURIComponent(cleanCa)}`

    const response = await this.request(endpoint, {
      method: "GET",
      timeoutMs: 45000,
    })

    if (
      response.status === false ||
      response.status === 0 ||
      response.StatusCode === 0 ||
      (!response.pdf_base64 && !response.pdf && !response.data?.pdf_base64 && !response.data?.pdf && !response.pdf_url)
    ) {
      throw new Error(response.message || "Failed to generate electricity bill PDF or CA number not found")
    }

    let pdfData =
      response.pdf_base64 ||
      response.pdf ||
      response.data?.pdf_base64 ||
      response.data?.pdf ||
      response.pdf_url ||
      ""

    if (pdfData && !pdfData.startsWith("http") && !pdfData.startsWith("data:")) {
      pdfData = `data:application/pdf;base64,${pdfData}`
    }

    return {
      success: true,
      service: "ELECTRIC_BILL_PDF",
      caNumber: cleanCa,
      pdf: pdfData,
      balanceRemaining: response.balance || response.balance_remaining,
      raw: response,
    }
  }

  async findPanByAadhaar({ aadhaarNo, provider = "zone" }) {
    const cleanAadhaar = clean(aadhaarNo).replace(/\s+/g, "")

    if (!cleanAadhaar || cleanAadhaar.length !== 12 || !/^\d{12}$/.test(cleanAadhaar)) {
      throw new Error("Valid 12-digit Aadhaar number is required")
    }

    const key = this.getApiKey()
    const body = {
      api_key: key,
      aadhaar_no: cleanAadhaar,
      provider: provider || "zone",
    }

    const response = await this.request("find_pan", {
      method: "POST",
      body,
      timeoutMs: 45000,
    })

    if (
      response.status === "error" ||
      response.status === false ||
      (!response.data && !response.pan_number)
    ) {
      throw new Error(response.message || "PAN record not found for this Aadhaar number")
    }

    const data = response.data || response
    return {
      success: true,
      service: "PAN_FIND",
      panNumber: (data.pan_number || data.pan || "").toUpperCase(),
      fullName: data.full_name || data.name || "",
      aadhaar: cleanAadhaar,
      applicationNo: data.application_no || "",
      balanceRemaining: data.balance_remaining || response.balance,
      raw: response,
    }
  }

  async verifyPanDetails({ panNo }) {
    const cleanPan = clean(panNo).replace(/\s+/g, "").toUpperCase()

    if (!cleanPan || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      throw new Error("Valid 10-character PAN number is required (e.g. ABCDE1234F)")
    }

    const key = this.getApiKey()
    const body = {
      api_key: key,
      panno: cleanPan,
    }

    const response = await this.request("pan_details", {
      method: "POST",
      body,
      timeoutMs: 45000,
    })

    if (
      response.status === "error" ||
      response.status === false ||
      (!response.data && !response.name && !response.pan_no)
    ) {
      throw new Error(response.message || "PAN details not found or invalid PAN number")
    }

    const data = response.data || response
    return {
      success: true,
      service: "PAN_DETAILS",
      panNumber: (data.pan_no || data.pan || cleanPan).toUpperCase(),
      name: data.name || data.full_name || "",
      fatherName: data.father || data.father_name || "",
      dob: data.dob || "",
      gender: data.gender || "",
      balanceRemaining: data.balance_remaining || response.balance,
      raw: response,
    }
  }

  async generateVoterManualPdf({
    epic_no,
    name,
    gender,
    father_name,
    tahshil,
    address,
    language = "HI",
    photoBase64,
    // Optional
    name_local,
    age,
    gender_local,
    father_type,
    father_name_local,
    dob_local,
    district,
    assembly_no_name,
    assembly_no_name_local,
    part_no,
    part_name,
    part_name_local,
    address_local,
  }) {
    const cleanEpic = clean(epic_no).replace(/\s+/g, "").toUpperCase()
    const cleanName = clean(name).toUpperCase()
    const cleanGender = clean(gender).toUpperCase()
    const cleanFather = clean(father_name)
    const cleanTahshil = clean(tahshil)
    const cleanAddress = clean(address)
    const cleanLang = clean(language || "HI").toUpperCase()

    if (!cleanEpic) throw new Error("Voter EPIC / ID Number is required")
    if (!cleanName) throw new Error("Voter full name in English is required")
    if (!cleanGender) throw new Error("Gender is required (MALE, FEMALE, or OTHER)")
    if (!cleanFather) throw new Error("Father or Husband name in English is required")
    if (!cleanTahshil) throw new Error("Tahshil / Block name is required")
    if (!cleanAddress) throw new Error("Full address in English is required")
    if (!photoBase64) throw new Error("Applicant photo is required (JPEG/PNG, max 2MB)")

    const key = this.getApiKey()
    const cleanB64 = String(photoBase64).replace(/^data:image\/[a-zA-Z]+;base64,/, "").trim()
    const buffer = Buffer.from(cleanB64, "base64")
    const blob = new Blob([buffer], { type: "image/jpeg" })

    const fd = new FormData()
    fd.append("api_key", key)
    fd.append("epic_no", cleanEpic)
    fd.append("name", cleanName)
    fd.append("gender", cleanGender)
    fd.append("father_name", cleanFather)
    fd.append("tahshil", cleanTahshil)
    fd.append("address", cleanAddress)
    fd.append("language", cleanLang)
    fd.append("imagefile", blob, "photo.jpg")

    if (name_local) fd.append("name_local", clean(name_local))
    if (age) fd.append("age", clean(age))
    if (gender_local) fd.append("gender_local", clean(gender_local))
    if (father_type) fd.append("father_type", clean(father_type))
    if (father_name_local) fd.append("father_name_local", clean(father_name_local))
    if (dob_local) fd.append("dob_local", clean(dob_local))
    if (district) fd.append("district", clean(district))
    if (assembly_no_name) fd.append("assembly_no_name", clean(assembly_no_name))
    if (assembly_no_name_local) fd.append("assembly_no_name_local", clean(assembly_no_name_local))
    if (part_no) fd.append("part_no", clean(part_no))
    if (part_name) fd.append("part_name", clean(part_name))
    if (part_name_local) fd.append("part_name_local", clean(part_name_local))
    if (address_local) fd.append("address_local", clean(address_local))

    const response = await this.request("v2/voter-manual-pdf", {
      method: "POST",
      body: fd,
      timeoutMs: 60000,
    })

    if (
      response.status === "error" ||
      response.status === false ||
      response.status === "101" ||
      (!response.data && !response.pdf_url)
    ) {
      throw new Error(response.message || "Failed to generate Voter ID manual card PDF")
    }

    const data = response.data || response
    return {
      success: true,
      service: "VOTER_MANUAL_PDF",
      epicNo: cleanEpic,
      name: cleanName,
      pdfUrl: data.pdf_url || response.pdf_url || null,
      pdfBase64: data.pdf_base64 || response.pdf_base64 || null,
      balanceRemaining: response.balance_remaining || response.balance,
      data,
      raw: response,
    }
  }
}

export const apiniceProvider = new ApiniceProvider()



