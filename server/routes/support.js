import { parseJson } from "../lib/http.js"
import { createId, now } from "../lib/ids.js"

export async function handleSupportRoutes(context) {
  const {
    req,
    res,
    pathName,
    url,
    db,
    send,
    saveDb,
    requireAuth,
    audit,
    applicationHelpSnapshot,
    updateApplicationByAdmin,
    syncApplication,
  } = context
  if (
    !pathName.startsWith("/api/support") &&
    !pathName.startsWith("/api/help") &&
    !pathName.startsWith("/api/admin/help")
  ) {
    return false
  }

  const respond = (status, payload) => {
    send(res, status, payload)
    return true
  }

  if (pathName === "/api/support/tickets" && req.method === "GET") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    const tickets = db.supportTickets.filter(
      (ticket) => auth.user.role === "admin" || ticket.userId === auth.user.id,
    )
    return respond(200, { tickets })
  }

  if (pathName === "/api/support/tickets" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    const input = await parseJson(req)
    if (!input.subject || !input.message) {
      return respond(400, { error: "Subject and message are required" })
    }
    const ticket = {
      id: createId("TKT"),
      userId: auth.user.id,
      subject: String(input.subject),
      category: String(input.category || "General"),
      priority: String(input.priority || "medium"),
      status: "open",
      message: String(input.message),
      createdAt: now(),
      updatedAt: now(),
    }
    db.supportTickets.unshift(ticket)
    audit(db, auth.user, "SUPPORT_TICKET_CREATED", "ticket", ticket.id)
    await saveDb(db)
    return respond(201, { ticket })
  }

  if (pathName === "/api/help" && req.method === "POST") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    const input = await parseJson(req)
    const subject = String(input.subject || "").trim()
    const message = String(input.message || "").trim()
    if (!subject || !message) {
      return respond(400, { error: "Subject and message are required" })
    }
    let application = null
    if (input.applicationId) {
      application = db.applications.find(
        (candidate) =>
          candidate.applicationId === String(input.applicationId) &&
          candidate.userId === auth.user.id,
      )
      if (!application) {
        return respond(404, { error: "Application not found" })
      }
    }
    const helpRequest = {
      id: createId("HLP"),
      userId: auth.user.id,
      retailerName: auth.user.name,
      applicationId: application?.applicationId || null,
      serviceName: String(
        input.serviceName || application?.serviceName || "General Support",
      ),
      subject,
      message,
      status: "open",
      adminReply: "",
      createdAt: now(),
      updatedAt: now(),
      applicationSnapshot: applicationHelpSnapshot(application),
    }
    db.helpRequests.unshift(helpRequest)
    audit(
      db,
      auth.user,
      "HELP_REQUEST_CREATED",
      "helpRequest",
      helpRequest.id,
      {
        applicationId: helpRequest.applicationId,
        serviceName: helpRequest.serviceName,
      },
    )
    await saveDb(db)
    return respond(201, { helpRequest })
  }

  if (pathName === "/api/help" && req.method === "GET") {
    const auth = requireAuth(req, res, db)
    if (!auth) return true
    return respond(200, {
      helpRequests: db.helpRequests.filter(
        (request) => request.userId === auth.user.id,
      ),
    })
  }

  if (pathName === "/api/admin/help" && req.method === "GET") {
    const auth = requireAuth(req, res, db, "admin")
    if (!auth) return true
    const status = url.searchParams.get("status")
    const tickets = db.supportTickets.map((ticket) => ({
      ...ticket,
      retailerName:
        db.users.find((user) => user.id === ticket.userId)?.name || "Retailer",
      serviceName: ticket.category || "General Support",
      applicationId: null,
    }))
    const helpRequests = [...db.helpRequests, ...tickets]
      .filter((request) => !status || request.status === status)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return respond(200, { helpRequests })
  }

  if (/^\/api\/admin\/help\/[^/]+$/.test(pathName) && req.method === "PATCH") {
    const auth = requireAuth(req, res, db, "admin")
    if (!auth) return true
    const helpId = pathName.split("/").pop()
    const helpRequest =
      db.helpRequests.find((request) => request.id === helpId) ||
      db.supportTickets.find((ticket) => ticket.id === helpId)
    if (!helpRequest) {
      return respond(404, { error: "Help request not found" })
    }
    const input = await parseJson(req)
    if (
      input.status !== undefined &&
      !["open", "in_progress", "resolved"].includes(input.status)
    ) {
      return respond(400, { error: "Invalid help request status" })
    }
    if (input.status !== undefined) helpRequest.status = input.status
    if (input.adminReply !== undefined) {
      helpRequest.adminReply = String(input.adminReply || "")
    }

    let applicationUpdate = null
    if (
      helpRequest.applicationId &&
      input.applicationUpdate &&
      typeof input.applicationUpdate === "object"
    ) {
      const application = db.applications.find(
        (candidate) => candidate.applicationId === helpRequest.applicationId,
      )
      if (!application) {
        return respond(404, { error: "Linked application not found" })
      }
      try {
        applicationUpdate = updateApplicationByAdmin(
          db,
          application,
          input.applicationUpdate,
          auth.user,
        )
      } catch (error) {
        return respond(400, { error: error.message })
      }
      helpRequest.applicationSnapshot = applicationHelpSnapshot(application)
    }

    helpRequest.updatedAt = now()
    audit(
      db,
      auth.user,
      "HELP_REQUEST_UPDATED",
      "helpRequest",
      helpRequest.id,
      {
        status: helpRequest.status,
        applicationId: helpRequest.applicationId,
        applicationUpdate,
      },
    )
    await saveDb(db)
    if (helpRequest.applicationId) {
      const application = db.applications.find(
        (candidate) => candidate.applicationId === helpRequest.applicationId,
      )
      if (application) syncApplication(application)
    }
    return respond(200, { helpRequest, applicationUpdate })
  }

  return false
}
