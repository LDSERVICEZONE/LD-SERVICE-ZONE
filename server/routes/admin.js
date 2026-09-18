import { parseJson } from "../lib/http.js"
import { createId, now } from "../lib/ids.js"
import {
  hashPassword,
  isEmail,
  normalizeIndianMobile,
  sanitizeUser,
} from "../lib/security.js"

export async function handleAdminRoutes(context) {
  const { req, res, pathName, db, send, saveDb, audit, requireAuth, ensureWallet, provider, config } = context

  const respond = (status, payload) => {
    send(res, status, payload)
    return true
  }

  // GET /api/announcement (Public / Retailer accessible live ticker)
  if (pathName === "/api/announcement" && req.method === "GET") {
    const defaultAnnouncement = {
      text: "Welcome to LD Service Zone! All services (UTI PAN, BBPS, Recharge) are running smoothly. Fast turnaround & instant support.",
      tone: "success",
      active: true,
      speed: "normal",
    }
    return respond(200, { ok: true, announcement: db.announcement || defaultAnnouncement })
  }

  if (!pathName.startsWith("/api/admin/")) return false

  const auth = requireAuth(req, res, db, "admin")
  if (!auth) return true

  const isSuperAdmin =
    auth.user.role === "admin" &&
    (auth.user.adminRole === "super_admin" || !auth.user.adminRole)

  // POST /api/admin/announcement
  if (pathName === "/api/admin/announcement" && req.method === "POST") {
    const input = await parseJson(req)
    const text = String(input?.text || "").trim()
    const tone = ["info", "success", "warning", "critical"].includes(input?.tone) ? input.tone : "info"
    const active = input?.active !== undefined ? Boolean(input.active) : true
    const speed = ["slow", "normal", "fast"].includes(input?.speed) ? input.speed : "normal"

    if (!text) {
      return respond(400, { error: "Announcement text is required." })
    }

    db.announcement = {
      text,
      tone,
      active,
      speed,
      updatedAt: now(),
      updatedBy: auth.user.email || "admin",
    }

    if (audit) {
      audit(db, auth.user, "ANNOUNCEMENT_UPDATED", "settings", "announcement", {
        tone,
        active,
      })
    }
    if (saveDb) await saveDb(db)

    return respond(200, {
      ok: true,
      message: "Announcement ticker updated successfully.",
      announcement: db.announcement,
    })
  }

  if (pathName === "/api/admin/commissions" && req.method === "GET") {
    const rows = db.commissionLedger
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return respond(200, {
      totalProviderCommission: rows.reduce(
        (total, row) => total + Number(row.providerCommission || 0),
        0,
      ),
      totalAdminCommission: rows.reduce(
        (total, row) => total + Number(row.adminCommission || 0),
        0,
      ),
      totalUserCommission: rows.reduce(
        (total, row) => total + Number(row.userCommission || 0),
        0,
      ),
      rows,
    })
  }

  if (pathName === "/api/admin/transactions" && req.method === "GET") {
    const rechargeTransactions = db.rechargeTransactions.map((row) => ({
      id: row.id,
      userId: row.userId,
      service: row.type === "DTH" ? "DTH Recharge" : "Mobile Recharge",
      customer: row.mobile,
      amount: row.amount,
      commission: row.adminCommission || 0,
      date: row.createdAt,
      status: row.status,
      operator: row.operator,
    }))
    const applications = db.applications.map((row) => ({
      id: row.applicationId,
      userId: row.userId,
      service: row.serviceName,
      customer: row.applicant?.name || row.applicant?.fullName || "",
      amount: row.customerPrice,
      commission: row.adminCommission || 0,
      date: row.createdAt,
      status: row.status,
      operator: "",
    }))
    return respond(200, {
      transactions: [...rechargeTransactions, ...applications].sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      ),
    })
  }

  if (pathName === "/api/admin/stats" && req.method === "GET") {
    const allTransactions = [...db.applications, ...db.rechargeTransactions]
    const statusCounts = allTransactions.reduce((counts, row) => {
      counts[row.status] = (counts[row.status] || 0) + 1
      return counts
    }, {})
    const revenue = [
      ...db.applications.filter(
        (row) => row.paymentId && row.status !== "payment_pending",
      ),
      ...db.rechargeTransactions.filter((row) => row.status === "success"),
    ].reduce(
      (total, row) => total + Number(row.customerPrice || row.amount || 0),
      0,
    )
    return respond(200, {
      users: db.users.length,
      retailers: db.users.filter((user) => user.role === "retailer").length,
      applications: db.applications.length,
      payments: db.payments.filter((payment) => payment.status === "paid")
        .length,
      pending:
        (statusCounts.submitted || 0) +
        (statusCounts.processing || 0) +
        (statusCounts.pending || 0),
      revenue,
      statusCounts,
    })
  }

  if (pathName === "/api/admin/users" && req.method === "GET") {
    return respond(200, {
      users: db.users.map((user) => ({
        ...sanitizeUser(user),
        wallet: ensureWallet(user.id).balance,
      })),
    })
  }

  if (pathName === "/api/admin/wallet/adjust" && req.method === "POST") {
    if (!isSuperAdmin) {
      return respond(403, {
        error: "Only Super Admin is authorized to adjust wallet balances.",
      })
    }
    const input = await parseJson(req)
    const { userId, type, amount, reason, note } = input || {}
    const targetUser = db.users.find((u) => u.id === userId)
    if (!targetUser) return respond(404, { error: "User not found" })
    const numAmount = Number(amount || 0)
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return respond(400, { error: "Amount must be greater than zero" })
    }
    if (type !== "credit" && type !== "debit") {
      return respond(400, { error: "Adjustment type must be 'credit' or 'debit'" })
    }
    const wallet = ensureWallet(targetUser.id)
    if (type === "debit" && Number(wallet.balance) < numAmount) {
      return respond(400, {
        error: `Insufficient balance for debit. Current balance is ₹${Number(wallet.balance).toFixed(2)}`,
      })
    }

    if (type === "credit") {
      wallet.balance = Number((wallet.balance + numAmount).toFixed(2))
    } else {
      wallet.balance = Number((wallet.balance - numAmount).toFixed(2))
    }
    wallet.updatedAt = now()

    const adjRef = `ADJ-${Date.now()}`
    const ledgerEntry = {
      id: createId("WL"),
      userId: targetUser.id,
      type,
      amount: numAmount,
      reference: adjRef,
      description: `Admin adjustment: ${reason || (type === "credit" ? "Credit" : "Debit")}${note ? ` (${note})` : ""}`,
      status: "success",
      createdAt: now(),
      balanceAfter: wallet.balance,
    }
    db.walletLedger.unshift(ledgerEntry)

    if (audit) {
      audit(db, auth.user, "ADMIN_WALLET_ADJUST", "wallet", targetUser.id, {
        type,
        amount: numAmount,
        reason,
        balanceAfter: wallet.balance,
      })
    }
    if (saveDb) {
      await saveDb(db)
    }

    return respond(200, {
      ok: true,
      message: `Wallet ${type === "credit" ? "credited" : "debited"} successfully`,
      wallet,
      ledgerEntry,
    })
  }

  if (pathName === "/api/admin/staff" && req.method === "POST") {
    if (!isSuperAdmin) {
      return respond(403, {
        error: "Only Super Admin is authorized to create staff accounts.",
      })
    }
    const input = await parseJson(req)
    const name = String(input.name || "").trim()
    const email = String(input.email || "").trim().toLowerCase()
    const mobile = normalizeIndianMobile(input.mobile)
    const password = String(input.password || "")
    const adminRole = String(input.adminRole || "support_staff").trim()

    if (!name || !email || password.length < 8) {
      return respond(400, {
        error: "Name, valid email, and an 8+ character password are required.",
      })
    }
    if (
      !["super_admin", "verification_agent", "support_staff"].includes(
        adminRole,
      )
    ) {
      return respond(400, {
        error: "Role must be super_admin, verification_agent, or support_staff.",
      })
    }
    if (db.users.some((u) => String(u.email || "").toLowerCase() === email)) {
      return respond(409, { error: "An account with this email already exists." })
    }

    const defaultUsername =
      adminRole === "verification_agent"
        ? `verifier${Math.floor(100 + Math.random() * 900)}`
        : adminRole === "support_staff"
          ? `support${Math.floor(100 + Math.random() * 900)}`
          : `admin${Math.floor(100 + Math.random() * 900)}`

    const newStaff = {
      id: createId("USR"),
      username: String(input.username || defaultUsername).trim().toLowerCase(),
      supabaseUserId: "",
      name,
      businessName: "LD SERVICE ZONE Staff",
      email,
      mobile: mobile || "",
      role: "admin",
      adminRole,
      status: "active",
      kycStatus: "verified",
      passwordHash: hashPassword(password),
      createdAt: now(),
    }
    db.users.push(newStaff)
    ensureWallet(newStaff.id)

    if (audit) {
      audit(db, auth.user, "ADMIN_STAFF_CREATED", "user", newStaff.id, {
        adminRole,
        email,
      })
    }
    if (saveDb) await saveDb(db)

    return respond(201, {
      ok: true,
      message: "Staff member created successfully.",
      user: sanitizeUser(newStaff),
    })
  }

  if (
    /^\/api\/admin\/users\/[^/]+\/role$/.test(pathName) &&
    req.method === "PATCH"
  ) {
    if (!isSuperAdmin) {
      return respond(403, {
        error: "Only Super Admin is authorized to modify user roles.",
      })
    }
    const targetUserId = pathName.split("/")[4]
    const targetUser = db.users.find((u) => u.id === targetUserId)
    if (!targetUser) return respond(404, { error: "User not found." })

    const input = await parseJson(req)
    const newRole = input.role ? String(input.role).trim() : targetUser.role
    const newAdminRole = input.adminRole
      ? String(input.adminRole).trim()
      : targetUser.adminRole

    if (!["retailer", "admin"].includes(newRole)) {
      return respond(400, { error: "Role must be 'retailer' or 'admin'." })
    }
    if (
      newRole === "admin" &&
      newAdminRole &&
      !["super_admin", "verification_agent", "support_staff"].includes(
        newAdminRole,
      )
    ) {
      return respond(400, {
        error:
          "adminRole must be super_admin, verification_agent, or support_staff.",
      })
    }

    if (
      targetUser.role === "admin" &&
      (targetUser.adminRole === "super_admin" || !targetUser.adminRole) &&
      (newRole !== "admin" || newAdminRole !== "super_admin")
    ) {
      const superAdminCount = db.users.filter(
        (u) =>
          u.role === "admin" &&
          (u.adminRole === "super_admin" || !u.adminRole) &&
          u.status === "active" &&
          u.id !== targetUserId,
      ).length
      if (superAdminCount < 1) {
        return respond(400, {
          error: "Cannot demote the only active Super Admin account.",
        })
      }
    }

    const previousRole = targetUser.role
    const previousAdminRole = targetUser.adminRole

    targetUser.role = newRole
    if (newRole === "admin") {
      targetUser.adminRole = newAdminRole || "support_staff"
    } else {
      delete targetUser.adminRole
    }
    targetUser.updatedAt = now()

    if (audit) {
      audit(db, auth.user, "USER_ROLE_UPDATED", "user", targetUser.id, {
        previousRole,
        previousAdminRole,
        newRole: targetUser.role,
        newAdminRole: targetUser.adminRole,
      })
    }
    if (saveDb) await saveDb(db)

    return respond(200, {
      ok: true,
      message: "User role authorized and updated successfully.",
      user: sanitizeUser(targetUser),
    })
  }

  // POST /api/admin/retailer (1-Click Onboard Retailer)
  if (pathName === "/api/admin/retailer" && req.method === "POST") {
    const input = await parseJson(req)
    const name = String(input.name || "").trim()
    const email = String(input.email || "").trim().toLowerCase()
    const rawMobile = String(input.mobile || "").trim()
    const mobile = normalizeIndianMobile(rawMobile)
    const aadhaar = String(input.aadhaar || input.aadhaarNumber || "").replace(/\D/g, "")
    const businessName = String(input.businessName || "").trim() || `${name} Digital Services`
    const pan = String(input.pan || input.panNumber || "").trim().toUpperCase()
    const city = String(input.city || "Bhubaneswar").trim()
    const state = String(input.state || "Odisha").trim()
    const pincode = String(input.pincode || "751001").trim()
    const initialBalance = Number(input.initialBalance || 0)
    const createPanMitraVle = Boolean(input.createPanMitraVle)

    if (!name) return respond(400, { error: "Retailer full name is required." })
    if (!email || !isEmail(email)) return respond(400, { error: "Valid Gmail or Email address is required." })
    if (!mobile) return respond(400, { error: "Valid 10-digit Indian mobile number is required." })
    if (!aadhaar || aadhaar.length !== 12) return respond(400, { error: "Valid 12-digit Aadhaar number is required." })

    if (db.users.some((u) => String(u.email || "").toLowerCase() === email)) {
      return respond(409, { error: "An account with this email already exists." })
    }
    if (db.users.some((u) => normalizeIndianMobile(u.mobile) === mobile)) {
      return respond(409, { error: "An account with this mobile number already exists." })
    }

    const plainPassword = String(input.password || "").trim() || `Retailer@${mobile.slice(-4)}`
    if (plainPassword.length < 6) {
      return respond(400, { error: "Password must be at least 6 characters." })
    }

    const newRetailer = {
      id: createId("USR"),
      username: (email.split("@")[0] || "retailer").toLowerCase().replace(/[^a-z0-9_]/g, "") + Math.floor(100 + Math.random() * 900),
      supabaseUserId: "",
      name,
      businessName,
      email,
      mobile,
      aadhaarNumber: aadhaar,
      panNumber: pan,
      city,
      state,
      pincode,
      role: "retailer",
      status: "active",
      kycStatus: "verified",
      emailVerifiedAt: now(),
      mobileVerifiedAt: now(),
      passwordHash: hashPassword(plainPassword),
      createdAt: now(),
      updatedAt: now(),
    }

    db.users.push(newRetailer)
    const wallet = ensureWallet(newRetailer.id)

    if (Number.isFinite(initialBalance) && initialBalance > 0) {
      wallet.balance = Number((wallet.balance + initialBalance).toFixed(2))
      wallet.updatedAt = now()
      const ledgerEntry = {
        id: createId("WL"),
        userId: newRetailer.id,
        type: "credit",
        amount: initialBalance,
        reference: `WELCOME-${Date.now()}`,
        description: "Initial wallet credit upon admin onboarding",
        status: "success",
        createdAt: now(),
        balanceAfter: wallet.balance,
      }
      db.walletLedger.unshift(ledgerEntry)
    }

    if (!Array.isArray(db.kycRecords)) db.kycRecords = []
    db.kycRecords.push({
      userId: newRetailer.id,
      aadhaarNumber: aadhaar,
      panNumber: pan || "",
      fullName: name,
      city,
      state,
      pincode,
      status: "verified",
      verifiedAt: now(),
      verifiedBy: auth.user.email || "admin",
    })

    let panMitraResult = null
    const vleId = `LDVLE${mobile.slice(-6)}`
    if (createPanMitraVle) {
      newRetailer.panMitraVleId = vleId
      newRetailer.panMitraRegisteredAt = now()
      if (provider && typeof provider.configured === "function" && provider.configured()) {
        try {
          const providerRes = await provider.createVle({
            vleId,
            vleName: name,
            vleMobile: mobile,
            vleEmail: email,
            vleShop: businessName,
            vleLocation: city,
            vleState: state,
            vlePin: pincode,
            vleAadhaar: aadhaar,
            vlePan: pan && /^[A-Z]{5}\d{4}[A-Z]$/i.test(pan) ? pan : "ABCDE1234F",
          })
          panMitraResult = providerRes
        } catch (err) {
          panMitraResult = { status: "offline", message: err.message || "PanMitra API offline" }
        }
      } else {
        panMitraResult = { status: "local", vleId }
      }
    }

    if (audit) {
      audit(db, auth.user, "ADMIN_RETAILER_CREATED", "user", newRetailer.id, {
        email,
        mobile,
        vleId: newRetailer.panMitraVleId || null,
        initialBalance,
      })
    }
    if (saveDb) await saveDb(db)

    return respond(201, {
      ok: true,
      message: "Retailer created successfully.",
      user: sanitizeUser(newRetailer),
      credentials: {
        username: newRetailer.username,
        email,
        mobile,
        password: plainPassword,
        vleId: newRetailer.panMitraVleId || null,
        initialBalance,
      },
      panMitraResult,
    })
  }

  // DELETE /api/admin/users/:userId (Remove Inactive/Fraud Retailer)
  if (/^\/api\/admin\/users\/[^/]+$/.test(pathName) && req.method === "DELETE") {
    if (!isSuperAdmin) {
      return respond(403, { error: "Only Super Admin is authorized to remove accounts." })
    }
    const targetUserId = pathName.split("/").pop()
    const targetUser = db.users.find((u) => u.id === targetUserId)
    if (!targetUser) return respond(404, { error: "User not found." })

    if (targetUser.id === auth.user.id) {
      return respond(400, { error: "You cannot delete your own logged-in admin account." })
    }

    if (targetUser.role === "admin" && (targetUser.adminRole === "super_admin" || !targetUser.adminRole)) {
      const superAdminCount = db.users.filter((u) => u.role === "admin" && (u.adminRole === "super_admin" || !u.adminRole)).length
      if (superAdminCount <= 1) {
        return respond(400, { error: "Cannot delete the only remaining Super Admin account." })
      }
    }

    db.users = db.users.filter((u) => u.id !== targetUserId)
    if (db.wallets && db.wallets[targetUserId]) {
      delete db.wallets[targetUserId]
    }
    if (Array.isArray(db.sessions)) {
      db.sessions = db.sessions.filter((s) => s.userId !== targetUserId)
    }

    if (config?.supabaseUrl && config?.supabaseServiceRoleKey) {
      try {
        await fetch(`${config.supabaseUrl}/rest/v1/User?id=eq.${encodeURIComponent(targetUserId)}`, {
          method: "DELETE",
          headers: {
            apikey: config.supabaseServiceRoleKey,
            Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
            Prefer: "return=minimal",
          },
        })
      } catch (delErr) {
        console.warn("Could not delete relational user from Supabase:", delErr?.message)
      }
    }

    if (audit) {
      audit(db, auth.user, "USER_DELETED", "user", targetUserId, {
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      })
    }
    if (saveDb) await saveDb(db)

    return respond(200, {
      ok: true,
      message: `Account for ${targetUser.name || targetUser.email} has been removed successfully.`,
    })
  }

  // PATCH /api/admin/users/:userId/status (Toggle Active / Suspended)
  if (/^\/api\/admin\/users\/[^/]+\/status$/.test(pathName) && req.method === "PATCH") {
    if (!isSuperAdmin) {
      return respond(403, { error: "Only Super Admin is authorized to update account status." })
    }
    const parts = pathName.split("/")
    const targetUserId = parts[parts.length - 2]
    const targetUser = db.users.find((u) => u.id === targetUserId)
    if (!targetUser) return respond(404, { error: "User not found." })

    const input = await parseJson(req)
    const newStatus = input?.status === "suspended" ? "suspended" : "active"

    if (newStatus === "suspended" && targetUser.id === auth.user.id) {
      return respond(400, { error: "You cannot suspend your own admin account." })
    }

    targetUser.status = newStatus
    targetUser.updatedAt = now()

    if (newStatus === "suspended" && Array.isArray(db.sessions)) {
      db.sessions = db.sessions.filter((s) => s.userId !== targetUserId)
    }

    if (audit) {
      audit(db, auth.user, "USER_STATUS_UPDATED", "user", targetUserId, {
        previousStatus: targetUser.status,
        newStatus,
      })
    }
    if (saveDb) await saveDb(db)

    return respond(200, {
      ok: true,
      message: `User status changed to ${newStatus}.`,
      user: sanitizeUser(targetUser),
    })
  }

  if (pathName === "/api/admin/audit" && req.method === "GET") {
    return respond(200, { logs: db.auditLogs.slice(0, 300) })
  }

  return false
}
