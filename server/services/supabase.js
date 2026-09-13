import fs from "node:fs"
import path from "node:path"
import { now } from "../lib/ids.js"

export function createSupabaseService(config) {
  const {
    url,
    anonKey,
    serviceRoleKey,
    storageBucket,
    dataStore,
    uploadDir,
    publicAppUrl,
  } = config

  function privateStorageKey(storageName, provider) {
    const prefix = `${provider}:`
    const value = String(storageName || "")
    if (!value.startsWith(prefix)) return null
    const key = value.slice(prefix.length)
    if (
      !key ||
      key.includes("\\") ||
      key.split("/").some((part) => !part || part === "." || part === "..")
    ) {
      return null
    }
    return key
  }

  async function request(pathName, method = "GET", body, options = {}) {
    if (!url || !anonKey) throw new Error("Supabase is not configured")
    const key = options.admin ? serviceRoleKey : anonKey
    if (options.admin && !key) {
      throw new Error("Supabase service role key is not configured")
    }
    const response = await fetch(`${url}${pathName}`, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(
        data?.msg ||
          data?.message ||
          data?.error_description ||
          data?.error ||
          "Supabase request failed",
      )
    }
    return data
  }

  async function storePrivateFile(key, buffer, mimeType) {
    if (dataStore !== "supabase") {
      const file = path.join(uploadDir, key)
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, buffer)
      return `local:${key}`
    }
    const objectPath = key.split("/").map(encodeURIComponent).join("/")
    const response = await fetch(
      `${url}/storage/v1/object/${encodeURIComponent(storageBucket)}/${objectPath}`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": mimeType,
          "x-upsert": "true",
        },
        body: buffer,
      },
    )
    if (!response.ok) {
      throw new Error(`Supabase Storage upload failed (${response.status})`)
    }
    return `supabase:${key}`
  }

  async function readPrivateFile(storageName) {
    if (String(storageName).startsWith("supabase:")) {
      const key = privateStorageKey(storageName, "supabase")
      if (!key) return null
      const objectPath = key.split("/").map(encodeURIComponent).join("/")
      const response = await fetch(
        `${url}/storage/v1/object/${encodeURIComponent(storageBucket)}/${objectPath}`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        },
      )
      if (!response.ok) return null
      return Buffer.from(await response.arrayBuffer())
    }
    const key = privateStorageKey(storageName, "local")
    if (!key) return null
    const file = path.join(uploadDir, ...key.split("/"))
    return fs.existsSync(file) ? fs.readFileSync(file) : null
  }

  async function createUser({ email, password, name, businessName, mobile }) {
    if (!url || !anonKey) throw new Error("Supabase Auth is not configured")
    const response = await fetch(`${url}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        data: {
          name,
          businessName: businessName || name,
          mobile,
          role: "retailer",
        },
        options: { email_redirect_to: `${publicAppUrl}/login` },
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(
        data?.msg ||
          data?.message ||
          data?.error_description ||
          data?.error ||
          "Supabase could not create the account",
      )
    }
    return data
  }

  function getUser(userId) {
    return request(
      `/auth/v1/admin/users/${encodeURIComponent(userId)}`,
      "GET",
      undefined,
      { admin: true },
    )
  }

  async function findUserByEmail(email) {
    if (!url || !serviceRoleKey) {
      throw new Error("Supabase service role key is not configured")
    }
    const response = await fetch(
      `${url}/auth/v1/admin/users?page=1&per_page=1000`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    )
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(
        data?.msg ||
          data?.message ||
          data?.error_description ||
          data?.error ||
          "Supabase user lookup failed",
      )
    }
    const users = Array.isArray(data?.users) ? data.users : []
    return (
      users.find(
        (user) =>
          String(user.email || "")
            .trim()
            .toLowerCase() === email.toLowerCase(),
      ) || null
    )
  }

  function passwordLogin(email, password) {
    return request("/auth/v1/token?grant_type=password", "POST", {
      email,
      password,
    })
  }

  async function persistUser(user) {
    if (dataStore !== "supabase") return
    const response = await fetch(`${url}/rest/v1/User?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        mobile: user.mobile,
        passwordHash: user.passwordHash || null,
        name: user.name,
        businessName: user.businessName || null,
        role: String(user.role || "retailer").toUpperCase(),
        active: user.status === "active",
        emailVerifiedAt: user.emailVerifiedAt || null,
        supabaseUserId: user.supabaseUserId || null,
        createdAt: user.createdAt || now(),
        updatedAt: now(),
      }),
    })
    if (!response.ok) {
      throw new Error(`Supabase User profile write failed (${response.status})`)
    }
  }

  return {
    request,
    storePrivateFile,
    readPrivateFile,
    createUser,
    getUser,
    findUserByEmail,
    passwordLogin,
    persistUser,
  }
}
