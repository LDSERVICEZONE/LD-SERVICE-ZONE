export function readRawBody(req, maxBytes = 8_000_000) {
  return new Promise((resolve, reject) => {
    let body = ""
    req.on("data", (chunk) => {
      body += chunk
      if (body.length > maxBytes) {
        req.destroy()
        reject(new Error("Payload too large"))
      }
    })
    req.on("end", () => resolve(body))
    req.on("error", reject)
  })
}

export async function parseJson(req) {
  const body = await readRawBody(req)
  if (!body) return {}

  try {
    const input = JSON.parse(body)
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error()
    }
    return input
  } catch {
    throw Object.assign(new Error("Invalid JSON object"), { status: 400 })
  }
}

export function bearerToken(req) {
  const value = req.headers.authorization || ""
  return value.startsWith("Bearer ") ? value.slice(7) : ""
}

export function createResponseSender({ publicAppUrl, isVercel }) {
  function getCorsOrigin(req) {
    const origin = req?.headers?.origin
    const configured = String(process.env.CORS_ORIGIN || "")
      .trim()
      .replace(/\/$/, "")
    const allowed = new Set([
      publicAppUrl,
      ...configured.split(",").map((value) => value.trim()),
    ])

    if (
      process.env.NODE_ENV !== "production" &&
      !isVercel &&
      /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || "")
    ) {
      return origin
    }
    return allowed.has(origin) ? origin : publicAppUrl
  }

  return function send(res, status, payload, headers = {}) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      Vary: "Origin",
      "Access-Control-Allow-Origin": getCorsOrigin(res._req),
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
      ...headers,
    })
    res.end(JSON.stringify(payload))
  }
}
