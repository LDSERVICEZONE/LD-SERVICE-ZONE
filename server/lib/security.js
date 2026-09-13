import crypto from "node:crypto"

export function safeEqual(expected, actual) {
  const expectedBuffer = Buffer.from(String(expected))
  const actualBuffer = Buffer.from(String(actual || ""))
  return (
    expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  )
}

export function normalizeIndianMobile(value) {
  const digits = String(value || "").replace(/\D/g, "")
  const tenDigits =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits
  if (!/^[6-9]\d{9}$/.test(tenDigits)) return ""
  return `+91${tenDigits}`
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""))
}

export function hashPassword(
  password,
  salt = crypto.randomBytes(16).toString("hex"),
) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || "").split(":")
  if (!salt || !/^[a-f0-9]{128}$/i.test(expected || "")) return false
  const actual = crypto.scryptSync(password, salt, 64).toString("hex")
  return crypto.timingSafeEqual(
    Buffer.from(actual, "hex"),
    Buffer.from(expected, "hex"),
  )
}

export function createFieldEncryption(dataKey) {
  function encrypt(value) {
    if (!value) return value
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv("aes-256-gcm", dataKey, iv)
    const encrypted = Buffer.concat([
      cipher.update(String(value), "utf8"),
      cipher.final(),
    ])
    return `enc:${iv.toString("base64")}:${cipher
      .getAuthTag()
      .toString("base64")}:${encrypted.toString("base64")}`
  }

  function decrypt(value) {
    if (!value || !String(value).startsWith("enc:")) return value
    try {
      const [, iv, tag, data] = String(value).split(":")
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        dataKey,
        Buffer.from(iv, "base64"),
      )
      decipher.setAuthTag(Buffer.from(tag, "base64"))
      return Buffer.concat([
        decipher.update(Buffer.from(data, "base64")),
        decipher.final(),
      ]).toString("utf8")
    } catch {
      return "[protected]"
    }
  }

  return { encrypt, decrypt }
}

export function sanitizeUser(user) {
  if (!user) return null
  const { passwordHash: _passwordHash, kyc: _kyc, ...safe } = user
  return safe
}
