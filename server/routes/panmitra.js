import { parseJson } from "../lib/http.js"
import { createId, now } from "../lib/ids.js"

export async function handlePanMitraRoutes(context) {
  const {
    req,
    res,
    pathName,
    url,
    db,
    send,
    saveDb,
    audit,
    requireAuth,
    ensureWallet,
    decrypt,
    provider,
  } = context

  if (
    !pathName.startsWith("/api/admin/panmitra") &&
    !pathName.startsWith("/api/panmitra")
  ) {
    return false
  }

  const respond = (status, payload) => {
    send(res, status, payload)
    return true
  }

  // -------------------------------------------------------------
  // RETAILER ENDPOINTS (/api/panmitra/*)
  // -------------------------------------------------------------
  if (pathName.startsWith("/api/panmitra")) {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    const user = auth.user

    // GET /api/panmitra/vle-profile
    if (pathName === "/api/panmitra/vle-profile" && req.method === "GET") {
      const vleId = user.panmitraVleId || user.panMitraVleId || null
      let vleStatus = null
      if (vleId && provider.configured()) {
        try {
          vleStatus = await provider.getVleStatus(vleId)
        } catch {
          vleStatus = {
            status: "unknown",
            message: "Could not fetch live VLE status",
          }
        }
      }
      return respond(200, {
        configured: provider.configured(),
        hasVle: Boolean(vleId),
        vleId,
        vleStatus,
        registrationCode: user.panMitraRegistrationCode || null,
        psaLoginUrl: "https://www.psaonline.utiitsl.com/psapanservices/forms/login.html/loginHome",
        kycStatus: user.kycStatus || "pending",
        vleRequested: Boolean(user.vleRequested),
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          email: user.email,
          businessName: user.businessName,
        },
      })
    }

    // POST /api/panmitra/request-vle
    if (pathName === "/api/panmitra/request-vle" && req.method === "POST") {
      const existingVleId = user.panmitraVleId || user.panMitraVleId
      if (existingVleId) {
        return respond(200, {
          status: "active",
          hasVle: true,
          vleId: existingVleId,
          vleRequested: false,
          registrationCode: user.panMitraRegistrationCode || null,
          psaLoginUrl: "https://www.psaonline.utiitsl.com/psapanservices/forms/login.html/loginHome",
          message: `You already have an authorized UTI PSA ID (${existingVleId}).`,
        })
      }

      const cleanMobile = String(user.mobile || "")
        .replace(/\D/g, "")
        .slice(-10)
      const requestedVleId = `LD${cleanMobile.slice(-6) || Math.floor(100000 + Math.random() * 900000)}`

      const submittedKyc = user.kyc || {}
      const rawAadhaar = submittedKyc.aadhaar
        ? (decrypt ? decrypt(submittedKyc.aadhaar) : submittedKyc.aadhaar)
        : user.aadhaarNumber || ""
      const cleanAadhaar = String(rawAadhaar).replace(/\D/g, "")
      const rawPan = submittedKyc.pan
        ? (decrypt ? decrypt(submittedKyc.pan) : submittedKyc.pan)
        : user.panNumber || ""
      const cleanPan = String(rawPan).toUpperCase().trim()

      const payload = {
        vleId: requestedVleId,
        vleName: user.name || "Retail Partner",
        vleMobile: cleanMobile,
        vleEmail: user.email || "",
        vleShop: user.businessName || `${user.name} Services`,
        vleLocation: submittedKyc.city || user.city || "Bhubaneswar",
        vleState: submittedKyc.state || user.state || "Odisha",
        vlePin: String(submittedKyc.pincode || user.pincode || "751001").trim().slice(0, 6),
        vleAadhaar: cleanAadhaar.length === 12 ? cleanAadhaar : "123456789012",
        vlePan: /^[A-Z]{5}\d{4}[A-Z]$/i.test(cleanPan) ? cleanPan : "ABCDE1234F",
      }

      let realVleId = `PANM-${requestedVleId}`
      let registrationCode = null
      let providerRes = null

      if (provider.configured()) {
        if (cleanAadhaar.length !== 12 || !/^[A-Z]{5}\d{4}[A-Z]$/.test(cleanPan)) {
          return respond(400, {
            error:
              "A valid 12-digit Aadhaar number and PAN are required to register your official UTI PSA ID. Please submit your KYC details first.",
          })
        }
        try {
          providerRes = await provider.createVle(payload)
          realVleId = providerRes.vleId || `PANM-${requestedVleId}`
          registrationCode = providerRes.code || null
        } catch (err) {
          return respond(err?.status || 502, {
            error: err.message || "Failed to create UTI PSA ID on PanMitra",
          })
        }
      } else {
        providerRes = { status: "local", vleId: realVleId }
      }

      user.panmitraVleId = realVleId
      user.panMitraVleId = realVleId
      user.panMitraRegistrationCode = registrationCode
      user.panMitraRegisteredAt = now()
      user.vleRequested = true
      user.vleRequestedAt = now()
      user.vleStatus = "APPROVED"
      user.updatedAt = now()
      if (saveDb) await saveDb(db)

      if (audit) {
        audit(db, user.id, "panmitra_vle_created", "user", user.id, {
          vleId: realVleId,
          registrationCode,
          email: user.email,
          name: user.name,
        })
      }

      return respond(200, {
        status: "success",
        vleRequested: true,
        hasVle: true,
        vleId: realVleId,
        registrationCode,
        psaLoginUrl: "https://www.psaonline.utiitsl.com/psapanservices/forms/login.html/loginHome",
        message: `Your official UTI PSA ID (${realVleId}) has been successfully created and approved! Login credentials have been sent to ${user.email}.`,
      })
    }

    // POST /api/panmitra/buy-coupons
    if (pathName === "/api/panmitra/buy-coupons" && req.method === "POST") {
      const activeVleId = user.panmitraVleId || user.panMitraVleId
      if (!activeVleId) {
        return respond(400, {
          error:
            "You must be an active PanMitra VLE to purchase coupons. Contact Admin or activate PAN agency.",
        })
      }
      const input = await parseJson(req)
      const quantity = Math.max(1, parseInt(input.quantity, 10) || 1)
      const type = String(input.type || "1") // 1: Physical coupon, 2: Electronic coupon
      const couponRate = type === "2" ? 72 : 107
      const totalCost = quantity * couponRate

      const wallet = ensureWallet(user.id)
      if (Number(wallet.balance) < totalCost) {
        return respond(400, {
          error: `Insufficient wallet balance. Available: ₹${Number(wallet.balance).toFixed(2)}, Required: ₹${totalCost.toFixed(2)}`,
          available: wallet.balance,
          required: totalCost,
        })
      }

      let providerResult = { status: "success", mode: "demo" }
      if (provider.configured()) {
        try {
          providerResult = await provider.requestCoupons(
            activeVleId,
            type,
            quantity,
          )
        } catch (err) {
          return respond(err?.status || 502, {
            error: err.message || "Failed to allocate coupons on PanMitra",
          })
        }
      }

      wallet.balance = Number((wallet.balance - totalCost).toFixed(2))
      wallet.updatedAt = now()

      if (!Array.isArray(db.walletLedger)) db.walletLedger = []
      const txn = {
        id: createId("WL"),
        userId: user.id,
        type: "debit",
        amount: totalCost,
        reference: `COUPON-${Date.now()}`,
        description: `PanMitra PAN Coupons Purchase (${quantity} ${type === "2" ? "Electronic" : "Physical"} Coupons)`,
        status: "success",
        createdAt: now(),
      }
      db.walletLedger.unshift(txn)

      if (audit) {
        audit(
          db,
          user.id,
          "pan_coupons_purchased",
          "wallet",
          wallet.id || user.id,
          {
            vleId: activeVleId,
            quantity,
            type,
            cost: totalCost,
            balance: wallet.balance,
          },
        )
      }
      if (saveDb) await saveDb(db)

      return respond(200, {
        status: "success",
        message: `Successfully allocated ${quantity} PAN coupon(s)`,
        walletBalance: wallet.balance,
        providerResult,
      })
    }

    return respond(404, { error: "Retailer PanMitra endpoint not found" })
  }

  // -------------------------------------------------------------
  // ADMIN ENDPOINTS (/api/admin/panmitra/*)
  // -------------------------------------------------------------
  const auth = requireAuth(req, res, db, "admin")
  if (!auth) return true

  // GET /api/admin/panmitra/balance
  if (pathName === "/api/admin/panmitra/balance" && req.method === "GET") {
    if (!provider.configured()) {
      return respond(200, {
        status: "success",
        balance: 5000,
        currency: "INR",
        mode: "demo",
        message: "Pan Mitra Demo Balance",
        configured: false,
      })
    }
    try {
      const live = await provider.getBalance()
      return respond(200, {
        status: live.status || "success",
        balance: live.balance !== undefined ? Number(live.balance) : 0,
        raw: live,
        configured: true,
      })
    } catch (err) {
      return respond(err?.status || 502, {
        error: err.message || "Failed to fetch PanMitra balance",
        configured: true,
      })
    }
  }

  // GET /api/admin/panmitra/vles
  if (pathName === "/api/admin/panmitra/vles" && req.method === "GET") {
    const vles = (db.users || [])
      .filter((u) => u.panmitraVleId || u.panMitraVleId)
      .map((u) => ({
        id: u.id,
        vleId: u.panmitraVleId || u.panMitraVleId,
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        businessName: u.businessName,
        kycStatus: u.kycStatus,
      }))
    return respond(200, { vles })
  }

  // GET /api/admin/panmitra/vle-status
  if (pathName === "/api/admin/panmitra/vle-status" && req.method === "GET") {
    const vleId = String(url.searchParams.get("vleId") || "").trim()
    if (!vleId) return respond(400, { error: "vleId is required" })
    if (!provider.configured()) {
      return respond(200, {
        status: "success",
        vleStatus: "Active",
        vleId,
        vleName: "Demo Partner",
        couponsAvailable: 25,
        mode: "demo",
      })
    }
    try {
      return respond(200, await provider.getVleStatus(vleId))
    } catch (err) {
      return respond(err?.status || 502, { error: err.message })
    }
  }

  // POST /api/admin/panmitra/vle
  if (pathName === "/api/admin/panmitra/vle" && req.method === "POST") {
    const input = await parseJson(req)
    const required = [
      "vleId",
      "vleName",
      "vleMobile",
      "vleEmail",
      "vleShop",
      "vleLocation",
      "vleState",
      "vlePin",
      "vleAadhaar",
      "vlePan",
    ]
    if (required.some((field) => !String(input[field] || "").trim())) {
      return respond(400, { error: "All VLE fields are required" })
    }
    if (!/^\d{10}$/.test(String(input.vleMobile).replace(/\D/g, ""))) {
      return respond(400, {
        error: "vleMobile must be a valid 10-digit mobile number",
      })
    }
    if (!/^\d{6}$/.test(String(input.vlePin).trim())) {
      return respond(400, { error: "vlePin must be a valid 6-digit PIN" })
    }
    if (!/^\d{12}$/.test(String(input.vleAadhaar).replace(/\D/g, ""))) {
      return respond(400, {
        error: "vleAadhaar must be a valid 12-digit Aadhaar number",
      })
    }
    if (!/^[A-Z]{5}\d{4}[A-Z]$/i.test(String(input.vlePan).trim())) {
      return respond(400, { error: "vlePan must be a valid PAN" })
    }

    let providerRes = { status: "success", mode: "demo", vleId: input.vleId }
    let realVleId = input.vleId
    let registrationCode = null
    if (provider.configured()) {
      try {
        providerRes = await provider.createVle(input)
        realVleId = providerRes.vleId || input.vleId
        registrationCode = providerRes.code || null
      } catch (err) {
        return respond(err?.status || 502, {
          error: err.message || "Failed to register VLE on PanMitra",
        })
      }
    }

    const matchedUser = db.users.find(
      (u) =>
        u.id === input.userId ||
        u.mobile === input.vleMobile ||
        u.email?.toLowerCase() === input.vleEmail?.toLowerCase(),
    )
    if (matchedUser) {
      matchedUser.panmitraVleId = realVleId
      matchedUser.panMitraVleId = realVleId
      matchedUser.panMitraRegistrationCode = registrationCode
      matchedUser.vleStatus = "APPROVED"
      matchedUser.updatedAt = now()
      if (saveDb) await saveDb(db)
    }

    if (audit) {
      audit(db, auth.user.id, "panmitra_vle_created", "vle", realVleId, {
        userId: matchedUser?.id || null,
        vleId: realVleId,
        vleName: input.vleName,
        registrationCode,
      })
    }

    return respond(200, {
      status: "success",
      message: `VLE registered successfully as ${realVleId}`,
      vleId: realVleId,
      registrationCode,
      psaLoginUrl: "https://www.psaonline.utiitsl.com/psapanservices/forms/login.html/loginHome",
      result: providerRes,
    })
  }

  // POST /api/admin/panmitra/register-user/:userId
  if (
    pathName.startsWith("/api/admin/panmitra/register-user/") &&
    req.method === "POST"
  ) {
    const targetUserId = pathName.split("/").pop()
    const targetUser = (db.users || []).find((u) => u.id === targetUserId)
    if (!targetUser) return respond(404, { error: "User not found" })

    const kyc = (db.kycRecords || []).find((k) => k.userId === targetUser.id)
    const submittedKyc = targetUser.kyc || {}
    const rawAadhaar = submittedKyc.aadhaar
      ? (decrypt ? decrypt(submittedKyc.aadhaar) : submittedKyc.aadhaar)
      : kyc?.aadhaarNumber
      ? (decrypt ? decrypt(kyc.aadhaarNumber) : kyc.aadhaarNumber)
      : targetUser.aadhaarNumber || ""
    const cleanAadhaar = String(rawAadhaar).replace(/\D/g, "")
    const rawPan = submittedKyc.pan
      ? (decrypt ? decrypt(submittedKyc.pan) : submittedKyc.pan)
      : kyc?.panNumber || targetUser.panNumber || ""
    const cleanPan = String(rawPan)
      .toUpperCase()
      .trim()

    const cleanMobile = String(targetUser.mobile || "")
      .replace(/\D/g, "")
      .slice(-10)
    const requestedVleId = `LD${cleanMobile.slice(-6) || Math.floor(100000 + Math.random() * 900000)}`
    const payload = {
      vleId: requestedVleId,
      vleName: targetUser.name || "Retail Partner",
      vleMobile: cleanMobile,
      vleEmail: targetUser.email || "",
      vleShop: targetUser.businessName || `${targetUser.name} Services`,
      vleLocation: submittedKyc.city || kyc?.city || targetUser.city || "Headquarters",
      vleState: submittedKyc.state || kyc?.state || targetUser.state || "Odisha",
      vlePin: String(submittedKyc.pincode || kyc?.pincode || targetUser.pincode || "751001")
        .trim()
        .slice(0, 6),
      vleAadhaar: cleanAadhaar.length === 12 ? cleanAadhaar : "123456789012",
      vlePan: /^[A-Z]{5}\d{4}[A-Z]$/i.test(cleanPan) ? cleanPan : "ABCDE1234F",
    }

    let realVleId = `PANM-${requestedVleId}`
    let registrationCode = null
    let providerRes = null
    if (provider.configured()) {
      if (cleanAadhaar.length !== 12 || !/^[A-Z]{5}\d{4}[A-Z]$/.test(cleanPan)) {
        return respond(400, {
          error:
            "User must have a verified 12-digit Aadhaar and PAN before registering on PanMitra / UTI PSA.",
        })
      }
      try {
        providerRes = await provider.createVle(payload)
        realVleId = providerRes.vleId || `PANM-${requestedVleId}`
        registrationCode = providerRes.code || null
      } catch (err) {
        return respond(err?.status || 502, {
          error: err.message || "Failed to create UTI PSA ID on PanMitra",
        })
      }
    } else {
      providerRes = { status: "success", mode: "demo", vleId: realVleId }
    }

    targetUser.panmitraVleId = realVleId
    targetUser.panMitraVleId = realVleId
    targetUser.panMitraRegistrationCode = registrationCode
    targetUser.vleRequested = false
    targetUser.vleStatus = "APPROVED"
    targetUser.updatedAt = now()
    if (saveDb) await saveDb(db)

    if (audit) {
      audit(
        db,
        auth.user.id,
        "panmitra_vle_registered_user",
        "user",
        targetUser.id,
        {
          vleId: realVleId,
          name: targetUser.name,
          registrationCode,
        },
      )
    }

    return respond(200, {
      status: "success",
      message: `User ${targetUser.name} successfully registered with official UTI PSA ID ${realVleId}`,
      vleId: realVleId,
      registrationCode,
      psaLoginUrl: "https://www.psaonline.utiitsl.com/psapanservices/forms/login.html/loginHome",
      result: providerRes,
    })
  }

  // POST /api/admin/panmitra/password-reset
  if (
    pathName === "/api/admin/panmitra/password-reset" &&
    req.method === "POST"
  ) {
    const input = await parseJson(req)
    const vleId = String(input.vleId || "").trim()
    if (!vleId) return respond(400, { error: "vleId is required" })
    if (!provider.configured()) {
      return respond(200, {
        status: "success",
        message: "Password reset instruction generated (Demo Mode)",
        mode: "demo",
      })
    }
    try {
      const res = await provider.resetPassword(vleId)
      return respond(200, res)
    } catch (err) {
      return respond(err?.status || 502, { error: err.message })
    }
  }

  // POST /api/admin/panmitra/coupons
  if (pathName === "/api/admin/panmitra/coupons" && req.method === "POST") {
    const input = await parseJson(req)
    const vleId = String(input.vleId || "").trim()
    const quantity = parseInt(input.quantity, 10)
    const type = String(input.type || "1")
    if (!vleId || isNaN(quantity) || quantity < 1) {
      return respond(400, {
        error: "vleId and positive integer quantity are required",
      })
    }
    if (!provider.configured()) {
      return respond(200, {
        status: "success",
        allocated: quantity,
        message: `Successfully allocated ${quantity} PAN coupons (Demo Mode)`,
        mode: "demo",
      })
    }
    try {
      const res = await provider.requestCoupons(vleId, type, quantity)
      return respond(200, res)
    } catch (err) {
      return respond(err?.status || 502, { error: err.message })
    }
  }

  return respond(404, { error: "Pan Mitra endpoint not found" })
}
