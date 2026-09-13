import { parseJson } from "../lib/http.js"
import { createId, now } from "../lib/ids.js"

export async function handleCatalogRoutes(context) {
  const { req, res, pathName, db, send, saveDb, requireAuth, audit } = context
  if (!pathName.startsWith("/api/services")) return false

  const respond = (status, payload) => {
    send(res, status, payload)
    return true
  }

  if (pathName === "/api/services" && req.method === "GET") {
    return respond(200, { services: db.services || [] })
  }

  if (pathName === "/api/services" && req.method === "POST") {
    const auth = requireAuth(req, res, db, "admin")
    if (!auth) return true
    const input = await parseJson(req)
    const name = String(input.name || "").trim()
    const category = String(input.category || "Other").trim()
    const processingTime = String(input.processingTime || "").trim()
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
      !processingTime ||
      !Number.isFinite(customerPrice) ||
      customerPrice < 0 ||
      !Number.isFinite(commission) ||
      commission < 0
    ) {
      return respond(400, {
        error:
          "Name, category, processing time, customer price and commission are required",
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
      color: String(input.color || "#4F46E5"),
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
    })
    await saveDb(db)
    return respond(201, { service })
  }

  if (/^\/api\/services\/[^/]+$/.test(pathName) && req.method === "PATCH") {
    const auth = requireAuth(req, res, db, "admin")
    if (!auth) return true
    const serviceId = pathName.split("/").pop()
    const service = db.services.find((candidate) => candidate.id === serviceId)
    if (!service) return respond(404, { error: "Service not found" })
    const input = await parseJson(req)
    for (const field of ["name", "category", "processingTime"]) {
      if (input[field] !== undefined)
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
    if (!service.name || !service.category || !service.processingTime) {
      return respond(400, {
        error: "Name, category and processing time are required",
      })
    }
    service.updatedAt = now()
    audit(db, auth.user, "SERVICE_UPDATED", "service", service.id, {
      name: service.name,
      category: service.category,
    })
    await saveDb(db)
    return respond(200, { service })
  }

  return false
}
