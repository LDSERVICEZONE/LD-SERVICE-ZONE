import crypto from "node:crypto"

export function createId(prefix) {
  return `${prefix}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`
}

export function now() {
  return new Date().toISOString()
}
