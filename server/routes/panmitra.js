import { parseJson } from "../lib/http.js"

export async function handlePanMitraRoutes(context) {
  const { req, res, pathName, url, db, send, requireAuth, provider } = context
  if (!pathName.startsWith("/api/admin/panmitra")) return false

  const respond = (status, payload) => {
    send(res, status, payload)
    return true
  }
  const auth = requireAuth(req, res, db, "admin")
  if (!auth) return true
  if (!provider.configured()) {
    if (pathName === "/api/admin/panmitra/balance" && req.method === "GET") {
      return respond(200, {
        status: "success",
        balance: 5000,
        currency: "INR",
        mode: "demo",
        message: "Pan Mitra Demo Balance",
      })
    }
    if (pathName === "/api/admin/panmitra/vle-status" && req.method === "GET") {
      const vleId = String(url.searchParams.get("vleId") || "VLE001").trim()
      return respond(200, {
        status: "success",
        vleStatus: "Active",
        vleId,
        vleName: "Demo Partner",
        couponsAvailable: 25,
        mode: "demo",
      })
    }
    if (pathName === "/api/admin/panmitra/vle" && req.method === "POST") {
      const input = await parseJson(req)
      return respond(200, {
        status: "success",
        vleId: input.vleId || "DEMO-VLE-001",
        message: "VLE registered successfully (Demo Mode)",
        mode: "demo",
      })
    }
    if (pathName === "/api/admin/panmitra/password-reset" && req.method === "POST") {
      return respond(200, {
        status: "success",
        message: "Password reset instruction generated (Demo Mode)",
        mode: "demo",
      })
    }
    if (pathName === "/api/admin/panmitra/coupons" && req.method === "POST") {
      const input = await parseJson(req)
      return respond(200, {
        status: "success",
        allocated: input.quantity || 1,
        message: `Successfully allocated ${input.quantity || 1} PAN coupons (Demo Mode)`,
        mode: "demo",
      })
    }
    return respond(200, { status: "success", mode: "demo" })
  }

  try {
    if (pathName === "/api/admin/panmitra/balance" && req.method === "GET") {
      return respond(200, await provider.getBalance())
    }
    if (pathName === "/api/admin/panmitra/vle-status" && req.method === "GET") {
      const vleId = String(url.searchParams.get("vleId") || "").trim()
      if (!vleId) return respond(400, { error: "vleId is required" })
      return respond(200, await provider.getVleStatus(vleId))
    }
    if (pathName === "/api/admin/panmitra/vle" && req.method === "POST") {
      const input = await parseJson(req)
      const required = ["vleId", "vleName", "vleMobile", "vleEmail", "vleShop", "vleLocation", "vleState", "vlePin", "vleAadhaar", "vlePan"]
      if (required.some((field) => !String(input[field] || "").trim())) {
        return respond(400, { error: "All VLE fields are required" })
      }
      if (!/^\d{10}$/.test(String(input.vleMobile).replace(/\D/g, ""))) return respond(400, { error: "vleMobile must be a valid 10-digit mobile number" })
      if (!/^\d{6}$/.test(String(input.vlePin).trim())) return respond(400, { error: "vlePin must be a valid 6-digit PIN" })
      if (!/^\d{12}$/.test(String(input.vleAadhaar).replace(/\D/g, ""))) return respond(400, { error: "vleAadhaar must be a valid 12-digit Aadhaar number" })
      if (!/^[A-Z]{5}\d{4}[A-Z]$/i.test(String(input.vlePan).trim())) return respond(400, { error: "vlePan must be a valid PAN" })
      return respond(200, await provider.createVle(input))
    }
    if (pathName === "/api/admin/panmitra/password-reset" && req.method === "POST") {
      const input = await parseJson(req)
      if (!String(input.vleId || "").trim()) return respond(400, { error: "vleId is required" })
      return respond(200, await provider.resetPassword(input.vleId))
    }
    if (pathName === "/api/admin/panmitra/coupons" && req.method === "POST") {
      const input = await parseJson(req)
      const quantity = Number(input.quantity)
      if (!String(input.vleId || "").trim() || !Number.isInteger(quantity) || quantity < 1) return respond(400, { error: "vleId and a positive integer quantity are required" })
      return respond(200, await provider.requestCoupons(input.vleId, input.type || "1", quantity))
    }
    return respond(404, { error: "Pan Mitra endpoint not found" })
  } catch (error) {
    return respond(error?.status || 502, { error: error.message || "Pan Mitra request failed" })
  }
}

