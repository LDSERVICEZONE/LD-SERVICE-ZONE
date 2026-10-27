import { parseJson } from "../lib/http.js"
import { createId, now } from "../lib/ids.js"
import { seedApiniceServices } from "./apinice.js"

export async function handleCatalogRoutes(context) {
  const { req, res, pathName, db, send, saveDb, requireAuth, audit } = context
  if (!pathName.startsWith("/api/services")) return false

  const respond = (status, payload) => {
    send(res, status, payload)
    return true
  }

  if (pathName === "/api/services" && req.method === "GET") {
    seedApiniceServices(db)
    return respond(200, { services: db.services || [] })
  }

  const isSuperAdmin = (user) => user?.role === "admin" && (user?.adminRole === "super_admin" || !user?.adminRole)

  if (pathName === "/api/services" && req.method === "POST") {
    seedApiniceServices(db)
    const auth = requireAuth(req, res, db, "admin")
    if (!auth) return true
    if (!isSuperAdmin(auth.user)) {
      return respond(403, { error: "Super admin access required to create services" })
    }
    const input = await parseJson(req)
    const name = String(input.name || "").trim()
    const category = String(input.category || "General").trim()
    const processingTime = String(input.processingTime || "1-3 days").trim()
    const documents = Array.isArray(input.documents)
      ? input.documents
          .map((document) => String(document).trim())
          .filter(Boolean)
      : []
    const customerPrice = Number(input.customerPrice)
    const commission = Number(input.commission)
    if (
      !name ||
      !category ||
      !Number.isFinite(customerPrice) ||
      customerPrice < 0 ||
      !Number.isFinite(commission) ||
      commission < 0
    ) {
      return respond(400, {
        error:
          "Name, category, customer price and commission are required",
      })
    }
    const service = {
      id: String(input.id || createId("SVC")),
      name,
      category,
      processingTime,
      customerPrice,
      commission,
      documents,
      subCategory: input.subCategory ? String(input.subCategory).trim() : undefined,
      color: String(input.color || "#4F46E5"),
      status: input.status === "disabled" ? "disabled" : "active",
      provider: input.provider || "manual",
      createdAt: now(),
      updatedAt: now(),
    }
    if (db.services.some((candidate) => candidate.id === service.id)) {
      return respond(409, { error: "Service ID already exists" })
    }
    db.services.unshift(service)
    audit(db, auth.user, "SERVICE_CREATED", "service", service.id, {
      name: service.name,
      category: service.category,
      customerPrice: service.customerPrice,
      commission: service.commission,
    })
    await saveDb(db)
    return respond(201, { service })
  }

  if (/^\/api\/services\/[^/]+$/.test(pathName) && req.method === "PATCH") {
    seedApiniceServices(db)
    const auth = requireAuth(req, res, db, "admin")
    if (!auth) return true
    if (!isSuperAdmin(auth.user)) {
      return respond(403, { error: "Super admin access required to update services or pricing" })
    }
    const serviceId = decodeURIComponent(pathName.split("/").pop())
    const service = db.services.find((candidate) => candidate.id === serviceId)
    if (!service) return respond(404, { error: `Service "${serviceId}" not found in catalog` })
    const input = await parseJson(req)
    for (const field of ["name", "category", "subCategory", "processingTime", "provider"]) {
      if (input[field] !== undefined && String(input[field]).trim() !== "")
        service[field] = String(input[field]).trim()
    }
    for (const field of ["customerPrice", "commission"]) {
      if (input[field] === undefined) continue
      const value = Number(input[field])
      if (!Number.isFinite(value) || value < 0) {
        return respond(400, { error: `Invalid ${field}` })
      }
      service[field] = value
    }
    if (input.documents !== undefined) {
      if (!Array.isArray(input.documents)) {
        return respond(400, { error: "documents must be an array" })
      }
      service.documents = input.documents
        .map((document) => String(document).trim())
        .filter(Boolean)
    }
    if (input.color !== undefined) {
      service.color = String(input.color || "#4F46E5")
    }
    if (input.status !== undefined) {
      service.status = input.status === "disabled" ? "disabled" : "active"
    }
    if (!service.name) service.name = "Untitled Service"
    if (!service.category) service.category = "General"
    if (!service.processingTime) service.processingTime = "Instant"
    service.updatedAt = now()
    audit(db, auth.user, "SERVICE_UPDATED", "service", service.id, {
      name: service.name,
      category: service.category,
      status: service.status,
      customerPrice: service.customerPrice,
      commission: service.commission,
    })
    await saveDb(db)
    return respond(200, { service })
  }

  if (/^\/api\/services\/[^/]+$/.test(pathName) && req.method === "DELETE") {
    seedApiniceServices(db)
    const auth = requireAuth(req, res, db, "admin")
    if (!auth) return true
    if (!isSuperAdmin(auth.user)) {
      return respond(403, { error: "Super admin access required to delete services" })
    }
    const serviceId = decodeURIComponent(pathName.split("/").pop())
    const serviceIndex = db.services.findIndex((candidate) => candidate.id === serviceId)
    if (serviceIndex === -1) return respond(404, { error: `Service "${serviceId}" not found in catalog` })
    const [deletedService] = db.services.splice(serviceIndex, 1)
    audit(db, auth.user, "SERVICE_DELETED", "service", serviceId, {
      name: deletedService.name,
      category: deletedService.category,
    })
    await saveDb(db)
    return respond(200, { ok: true, message: `Service ${deletedService.name} deleted successfully` })
  }

  return false
}
