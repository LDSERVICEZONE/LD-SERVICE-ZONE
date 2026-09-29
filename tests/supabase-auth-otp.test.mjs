import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const dataDir = fs.mkdtempSync(path.resolve(".tmp-otp-test-"));
const password = "TestPassword123!";
const hash = `salt:${crypto.scryptSync(password, "salt", 64).toString("hex")}`;
const retailerMobile = "+919876543299";
const pendingMobile = "+919876543298";
const pendingMobile2 = "+919876543297";

const users = [
  {
    id: "USR-RETAILER-1",
    username: "LD10001",
    role: "retailer",
    name: "Retailer One",
    businessName: "Retailer Shop",
    email: "retailer1@example.com",
    mobile: retailerMobile,
    supabaseUserId: "sb-retailer-1",
    status: "active",
    emailVerifiedAt: new Date().toISOString(),
    passwordHash: hash,
  },
];

const pendingSignups = [
  {
    id: "PSU-001",
    username: "LD20001",
    supabaseUserId: "sb-pending-1",
    name: "Pending User",
    businessName: "Pending Store",
    email: "pending@example.com",
    mobile: pendingMobile,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
    emailVerified: false,
  },
  {
    id: "PSU-002",
    username: "LD20002",
    supabaseUserId: "sb-pending-2",
    name: "Pending Two",
    businessName: "Pending Store 2",
    email: "pending2@example.com",
    mobile: pendingMobile2,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
    emailVerified: false,
  },
];

fs.writeFileSync(
  path.join(dataDir, "db.json"),
  JSON.stringify({
    users,
    pendingSignups,
    sessions: [
      {
        userId: "USR-RETAILER-1",
        tokenHash: crypto.createHash("sha256").update("token-retailer-1").digest("hex"),
        expiresAt: "2099-01-01",
      },
    ],
    wallets: {},
    auditLogs: [],
    applications: [],
    payments: [],
  })
);

Object.assign(process.env, {
  LD_SKIP_ENV: "true",
  LD_NO_LISTEN: "true",
  LD_DATA_DIR: dataDir,
  DATA_STORE: "json",
  DATA_ENCRYPTION_KEY: "test-encryption-key-32-bytes-long!",
  SUPABASE_URL: "https://auth.example.test",
  SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  PUBLIC_APP_URL: "http://localhost:8443",
  DEMO_MODE: "false",
});

const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  const urlStr = String(url);
  if (urlStr.startsWith("https://auth.example.test")) {
    const method = options?.method || "GET";
    const body = options?.body ? JSON.parse(options.body) : {};

    // 1. Verify OTP endpoint
    if (urlStr.includes("/auth/v1/verify")) {
      if (body.token === "123456" || body.token_hash === "valid-hash") {
        const isRetailer = body.email === "retailer1@example.com";
        return Response.json({
          access_token: "mock-access-token-12345",
          user: {
            id: isRetailer ? "sb-retailer-1" : "sb-pending-1",
            email: body.email || (isRetailer ? "retailer1@example.com" : "pending@example.com"),
            email_confirmed_at: new Date().toISOString(),
          },
        });
      }
      return Response.json({ error: "Invalid token" }, { status: 400 });
    }

    // 2. User info endpoint
    if (urlStr.includes("/auth/v1/user") && method === "GET") {
      return Response.json({
        id: "sb-retailer-1",
        email: "retailer1@example.com",
        email_confirmed_at: new Date().toISOString(),
      });
    }

    // 3. Update password endpoint
    if (urlStr.includes("/auth/v1/user") && method === "PUT") {
      return Response.json({
        id: "sb-retailer-1",
        email: "retailer1@example.com",
        updated_at: new Date().toISOString(),
      });
    }

    // 4. Resend & Recover & Magiclink endpoints
    if (
      urlStr.includes("/auth/v1/resend") ||
      urlStr.includes("/auth/v1/recover") ||
      urlStr.includes("/auth/v1/magiclink")
    ) {
      return Response.json({});
    }

    // 5. Admin user lookup
    if (urlStr.includes("/auth/v1/admin/users")) {
      const mockUsers = [
        {
          id: "sb-retailer-1",
          email: "retailer1@example.com",
          email_confirmed_at: new Date().toISOString(),
        },
        {
          id: "sb-pending-2",
          email: "pending2@example.com",
          email_confirmed_at: new Date().toISOString(),
        },
        {
          id: "sb-unconfirmed-1",
          email: "unconfirmed@example.com",
          email_confirmed_at: null,
        },
      ];
      if (urlStr.includes("per_page") || !urlStr.match(/users\/[a-zA-Z0-9_-]+$/)) {
        return Response.json({ users: mockUsers });
      }
      const match = urlStr.match(/users\/([a-zA-Z0-9_-]+)$/);
      const found = mockUsers.find((u) => u.id === match?.[1]) || mockUsers[0];
      return Response.json(found);
    }

    return Response.json({ error: "Unhandled mock route" }, { status: 400 });
  }

  return originalFetch(url, options);
};

let server, base;
before(async () => {
  server = (await import("../server.js")).default;
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  globalThis.fetch = originalFetch;
  try {
    fs.rmSync(dataDir, { recursive: true, force: true });
  } catch {
    // cleanup
  }
});

async function apiReq(route, { token, body, method = body ? "POST" : "GET" } = {}) {
  const res = await fetch(base + route, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

test("signup/verify-email validates 6-digit OTP and logs in retailer", async () => {
  // Test invalid OTP rejected
  const badRes = await apiReq("/auth/signup/verify-email", {
    body: { email: "pending@example.com", code: "000000" },
  });
  assert.equal(badRes.status, 400);

  // Test valid 6-digit OTP promotes user and returns session token
  const goodRes = await apiReq("/auth/signup/verify-email", {
    body: { email: "pending@example.com", code: "123456" },
  });
  assert.equal(goodRes.status, 200);
  assert.ok(goodRes.data.token, "Should return an app session token");
  assert.equal(goodRes.data.user.email, "pending@example.com");
  assert.equal(goodRes.data.user.role, "retailer");
});

test("signup/resend-email successfully triggers new verification code", async () => {
  const res = await apiReq("/auth/signup/resend-email", {
    body: { email: "pending2@example.com" },
  });
  assert.equal(res.status, 200);
  assert.ok(res.data.ok);
});

test("magic-link resolves registered mobile number and sends OTP", async () => {
  const res = await apiReq("/auth/magic-link", {
    body: { credential: "9876543299" },
  });
  if (res.status !== 200) console.log("TEST 3 FAIL:", res);
  assert.equal(res.status, 200);
  assert.equal(res.data.email, "retailer1@example.com");
});

test("magic-link/consume verifies 6-digit OTP code and logs in retailer", async () => {
  const res = await apiReq("/auth/magic-link/consume", {
    body: { email: "retailer1@example.com", code: "123456" },
  });
  if (res.status !== 200) console.log("TEST 4 FAIL:", res);
  assert.equal(res.status, 200);
  assert.ok(res.data.token);
  assert.equal(res.data.user.email, "retailer1@example.com");
  assert.equal(res.data.authProvider, "supabase-otp");
});

test("forgot-password accepts mobile or email and sends recovery code", async () => {
  const res = await apiReq("/auth/forgot-password", {
    body: { credential: "9876543299" },
  });
  if (res.status !== 200) console.log("TEST 5 FAIL:", res);
  assert.equal(res.status, 200);
  assert.equal(res.data.email, "retailer1@example.com");
});

test("reset-password resets password using 6-digit recovery OTP", async () => {
  const res = await apiReq("/auth/reset-password", {
    body: {
      email: "retailer1@example.com",
      otp: "123456",
      password: "NewBrandPassword888!",
    },
  });
  assert.equal(res.status, 200);
  assert.ok(res.data.ok);
});

test("signup/verify-email promotes user if email was already confirmed via link", async () => {
  // pending2@example.com is in pendingSignups and mock admin has email_confirmed_at set
  // Even with an unknown OTP code, the fallback recognizes they confirmed via link
  const res = await apiReq("/auth/signup/verify-email", {
    body: { email: "pending2@example.com", code: "999999" },
  });
  assert.equal(res.status, 200);
  assert.ok(res.data.token);
  assert.equal(res.data.user.email, "pending2@example.com");
});

test("login detects unconfirmed Supabase account and returns unconfirmed flag", async () => {
  const res = await apiReq("/auth/login", {
    body: { email: "unconfirmed@example.com", password: "Password123!" },
  });
  assert.equal(res.status, 403);
  assert.equal(res.data.unconfirmed, true);
  assert.equal(res.data.email, "unconfirmed@example.com");
});
