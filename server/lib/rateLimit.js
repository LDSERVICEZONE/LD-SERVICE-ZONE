const rateLimits = new Map()

export function checkRateLimit(key, maxRequests = 10, windowMs = 60_000) {
  const currentTime = Date.now()
  const entry = rateLimits.get(key) || {
    count: 0,
    resetAt: currentTime + windowMs,
  }

  if (currentTime > entry.resetAt) {
    entry.count = 1
    entry.resetAt = currentTime + windowMs
  } else {
    entry.count += 1
  }

  rateLimits.set(key, entry)
  if (entry.count > maxRequests) {
    return {
      limited: true,
      retryAfter: Math.ceil((entry.resetAt - currentTime) / 1000),
    }
  }

  return { limited: false, retryAfter: 0 }
}

export function getClientIp(req) {
  return String(
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
  )
    .split(",")[0]
    .trim()
}
