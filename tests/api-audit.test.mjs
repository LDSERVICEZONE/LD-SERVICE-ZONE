import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const dataDir = fs.mkdtempSync(path.resolve(".tmp-api-audit-"));
const password = "AuditPassword123!";
const hash = `salt:${crypto.scryptSync(password, "salt", 64).toString("hex")}`;
const users = [
  { id: "retailer", role: "retailer", email: "retailer@example.test", supabaseUserId: "sb-retailer", status: "active" },
  { id: "other", role: "retailer", email: "other@example.test", status: "active" },
  { id: "suspended", role: "retailer", email: "suspended@example.test", status: "suspended" },
  { id: "admin", role: "admin", email: "admin@example.test", status: "active" },
].map(u => ({ ...u, name: u.id, passwordHash: hash, emailVerifiedAt: new Date().toISOString() }));
fs.writeFileSync(path.join(dataDir, "db.json"), JSON.stringify({
  users,
  sessions: users.map(u => ({ userId: u.id, tokenHash: crypto.createHash("sha256").update(u.id).digest("hex"), expiresAt: "2099-01-01" })),
  applications: ["first", "second"].map(applicationId => ({ applicationId, userId: "retailer", customerPrice: 100, status: "payment_pending", documents: [] })),
  payments: [{ paymentId: "pay-first", applicationId: "first", userId: "retailer", orderId: "order-first", amount: 100, mode: "razorpay", status: "created" }],
}));
Object.assign(process.env, {
  LD_SKIP_ENV: "true", LD_NO_LISTEN: "true", LD_DATA_DIR: dataDir,
  DATA_STORE: "json",
  DATA_ENCRYPTION_KEY: "audit-only-encryption-key", SUPABASE_URL: "https://auth.example.test",
  SUPABASE_ANON_KEY: "audit-anon", SUPABASE_SERVICE_ROLE_KEY: "audit-service",
  RAZORPAY_KEY_ID: "audit", RAZORPAY_KEY_SECRET: "audit-payment-secret", RAZORPAY_WEBHOOK_SECRET: "audit-webhook-secret",
  GOOGLE_SHEET_ID: "", GOOGLE_SERVICE_ACCOUNT_JSON: "", ADMIN_PASSWORD: "", VERCEL: "",
  DEMO_MODE: "true",
});
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (String(url).startsWith("https://auth.example.test")) {
    if (String(url).endsWith("/auth/v1/user")) return Response.json({ id: "sb-retailer" });
    return Response.json({ error: "Invalid credentials" }, { status: 400 });
  }
  if (!String(url).startsWith("http://127.0.0.1:")) throw new Error("External calls are forbidden in audit tests");
  return originalFetch(url, options);
};
let server, base;
before(async () => {
  server = (await import("../server.js")).default;
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  globalThis.fetch = originalFetch;
});
async function request(route, { token, body, method = body ? "POST" : "GET", headers = {} } = {}) {
  const response = await fetch(base + route, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, data: await response.json(), headers: response.headers };
}

test("protected routes require authentication", async () => {
  for (const route of ["/auth/me", "/wallet", "/applications", "/admin/users", "/admin/stats"]) assert.equal((await request(route)).status, 401, route);
});
test("retailers cannot access any admin endpoint", async () => {
  for (const route of ["/admin/users", "/admin/stats", "/admin/transactions", "/admin/commissions", "/admin/kyc", "/admin/audit"]) assert.equal((await request(route, { token: "retailer" })).status, 403, route);
});
test("suspended users cannot reuse existing sessions", async () => assert.equal((await request("/wallet", { token: "suspended" })).status, 401));
test("failed Supabase login cannot fall back to old local password", async () => assert.equal((await request("/auth/login", { body: { credential: users[0].email, password } })).status, 401));
test("local admin login remains available", async () => assert.equal((await request("/auth/login", { body: { credential: users[3].email, password } })).status, 200));
test("login by username and remember-me works", async () => {
  const res = await request("/auth/login", { body: { credential: "admin", password, remember: true } });
  assert.equal(res.status, 200);
  assert.ok(res.data.token);
  assert.equal(res.data.user.role, "admin");
});
test("application price and documents come from server catalogue", async () => {
  const result = await request("/applications", { token: "retailer", body: { serviceId: "PAN-NEW", serviceName: "Tampered", customerPrice: 0, commission: 999999, documents: [], applicant: { "Full Name": "Test Applicant" } } });
  assert.equal(result.status, 201);
  assert.notEqual(result.data.application.customerPrice, 0);
  assert.notEqual(result.data.application.commission, 999999);
  assert.ok(result.data.application.documents.length);
  assert.equal((await request("/payments/create-order", { token: "retailer", body: { applicationId: result.data.application.applicationId } })).status, 400);
});
test("unknown service rejected", async () => assert.equal((await request("/applications", { token: "retailer", body: { serviceId: "fake", applicant: { name: "Test" } } })).status, 400));
test("unknown application documents are rejected before storage", async () => {
  const created = await request("/applications", { token: "retailer", body: { serviceId: "PAN-NEW", applicant: { "Full Name": "Upload Audit" } } });
  assert.equal(created.status, 201);
  const applicationId = created.data.application.applicationId;
  const uploaded = await request(`/applications/${applicationId}/documents`, { token: "retailer", body: { documentName: "Not Required", fileName: "unknown.png", mimeType: "image/png", data: "data:image/png;base64,AA==" } });
  assert.equal(uploaded.status, 400);
  assert.equal(fs.existsSync(path.join(dataDir, "uploads", "applications", applicationId)), false);
});
test("demo application submission records without payment", async () => {
  const created = await request("/applications", { token: "retailer", body: { serviceId: "PAN-NEW", applicant: { "Full Name": "Demo Applicant", "Date of Birth": "2000-01-01", "Mobile Number": "9876543210", "Father's Name": "Parent" } } });
  assert.equal(created.status, 201);
  for (const document of created.data.application.documents) {
    const uploaded = await request(`/applications/${created.data.application.applicationId}/documents`, { token: "retailer", body: { documentName: document.name, fileName: `${document.name}.png`, mimeType: "image/png", data: "data:image/png;base64,AA==" } });
    assert.equal(uploaded.status, 201);
  }
  const submitted = await request("/payments/create-order", { token: "retailer", body: { applicationId: created.data.application.applicationId } });
  assert.equal(submitted.status, 200);
  assert.equal(submitted.data.mode, "demo");
  assert.equal(submitted.data.application.status, "submitted");
});
test("other users cannot list someone else's applications", async () => assert.equal((await request("/applications", { token: "other" })).data.applications.length, 0));
test("valid signature cannot pay a different application", async () => {
  const signature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update("order-first|gateway-first").digest("hex");
  assert.equal((await request("/payments/verify", { token: "retailer", body: { applicationId: "second", razorpay_order_id: "order-first", razorpay_payment_id: "gateway-first", razorpay_signature: signature } })).status, 400);
});
test("malformed payment signature returns 400 instead of crashing", async () => assert.equal((await request("/payments/verify", { token: "retailer", body: { applicationId: "first", razorpay_order_id: "order-first", razorpay_payment_id: "gateway-first", razorpay_signature: "x" } })).status, 400));
test("unsigned payment webhook rejected", async () => assert.equal((await request("/payments/webhook", { body: { event: "payment.captured" } })).status, 400));
test("payment verification is idempotent", async () => {
  const body = { applicationId: "first", razorpay_order_id: "order-first", razorpay_payment_id: "gateway-first", razorpay_signature: crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update("order-first|gateway-first").digest("hex") };
  assert.equal((await request("/payments/verify", { token: "retailer", body })).status, 200);
  assert.equal((await request("/payments/verify", { token: "retailer", body })).data.message, "Payment already verified");
});
test("untrusted origin is not reflected in CORS", async () => assert.notEqual((await request("/health", { headers: { Origin: "https://untrusted.vercel.app" } })).headers.get("access-control-allow-origin"), "https://untrusted.vercel.app"));
test("support tickets reach admin and replies reach their owner", async () => {
  const created = await request("/support/tickets", { token: "retailer", body: { subject: "Audit support", message: "Please check my application" } });
  assert.equal(created.status, 201);
  const id = created.data.ticket.id;
  assert.ok((await request("/admin/help", { token: "admin" })).data.helpRequests.some(item => item.id === id));
  assert.equal((await request(`/admin/help/${id}`, { token: "admin", method: "PATCH", body: { status: "resolved", adminReply: "Reviewed" } })).status, 200);
  assert.equal((await request("/support/tickets", { token: "retailer" })).data.tickets.find(item => item.id === id).adminReply, "Reviewed");
  assert.equal((await request("/support/tickets", { token: "other" })).data.tickets.length, 0);
});
test("KYC cannot be approved before submission", async () => assert.equal((await request("/admin/kyc/retailer", { token: "admin", method: "PATCH", body: { status: "verified" } })).status, 400));
test("KYC documents require admin authorization", async () => assert.equal((await request("/admin/kyc/retailer/documents/aadhaar", { token: "other" })).status, 403));
test("admin can download submitted KYC documents", async () => {
  const document = { fileName: "proof.png", mimeType: "image/png", data: "data:image/png;base64,AA==" };
  const submitted = await request("/kyc", { token: "retailer", body: {
    fullName: "Audit Retailer", dob: "1990-01-01", pan: "ABCDE1234F", aadhaar: "123456789012",
    address: "Audit Street", city: "Pune", state: "Maharashtra", pincode: "411001",
    bankAccount: "1234567890", ifsc: "SBIN0001234", accountHolder: "Audit Retailer",
    documents: { panCard: document, aadhaarCard: document, selfie: document, bankProof: document },
  } });
  assert.equal(submitted.status, 201);
  const response = await fetch(`${base}/admin/kyc/retailer/documents/panCard`, { headers: { Authorization: "Bearer admin" } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal((await response.arrayBuffer()).byteLength, 1);
});
test("admin cannot complete unpaid application", async () => assert.equal((await request("/applications/second", { token: "admin", method: "PATCH", body: { status: "completed" } })).status, 400));
test("signed webhook with wrong amount is rejected", async () => {
  const body = { event: "payment.captured", payload: { payment: { entity: { id: "another", order_id: "order-first", amount: 1, currency: "INR" } } } };
  const signature = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(JSON.stringify(body)).digest("hex");
  assert.equal((await request("/payments/webhook", { body, headers: { "x-razorpay-signature": signature } })).status, 400);
});

test("admin can adjust user wallet balance with credit and debit", async () => {
  const creditRes = await request("/admin/wallet/adjust", {
    token: "admin",
    body: { userId: "retailer", type: "credit", amount: 500, reason: "Cash deposit" },
  });
  assert.equal(creditRes.status, 200);
  assert.equal(creditRes.data.ok, true);
  assert.equal(creditRes.data.wallet.balance, 500);

  const debitRes = await request("/admin/wallet/adjust", {
    token: "admin",
    body: { userId: "retailer", type: "debit", amount: 150, reason: "Test debit" },
  });
  assert.equal(debitRes.status, 200);
  assert.equal(debitRes.data.ok, true);
  assert.equal(debitRes.data.wallet.balance, 350);
});

test("retailers cannot adjust wallet balances", async () => {
  const res = await request("/admin/wallet/adjust", {
    token: "retailer",
    body: { userId: "retailer", type: "credit", amount: 1000 },
  });
  assert.equal(res.status, 403);
});

test("retailer can pay for application using wallet balance", async () => {
  const created = await request("/applications", {
    token: "retailer",
    body: {
      serviceId: "PAN-NEW",
      applicant: { "Full Name": "Wallet Pay Applicant", "Date of Birth": "1995-05-05", "Mobile Number": "9988776655", "Father's Name": "Parent" },
    },
  });
  assert.equal(created.status, 201);
  const applicationId = created.data.application.applicationId;
  for (const document of created.data.application.documents) {
    await request(`/applications/${applicationId}/documents`, {
      token: "retailer",
      body: { documentName: document.name, fileName: `${document.name}.png`, mimeType: "image/png", data: "data:image/png;base64,AA==" },
    });
  }

  const walletBefore = (await request("/wallet", { token: "retailer" })).data.wallet.balance;
  const price = created.data.application.customerPrice;

  const paid = await request("/payments/pay-wallet", {
    token: "retailer",
    body: { applicationId },
  });
  assert.equal(paid.status, 200);
  assert.equal(paid.data.ok, true);
  assert.equal(paid.data.application.status, "submitted");
  assert.equal(paid.data.mode, "wallet");

  const walletAfter = (await request("/wallet", { token: "retailer" })).data.wallet.balance;
  assert.equal(Number(walletAfter.toFixed(2)), Number((walletBefore - price).toFixed(2)));
});

test("retailer cannot pay for application with insufficient wallet balance", async () => {
  const created = await request("/applications", {
    token: "other",
    body: {
      serviceId: "PAN-NEW",
      applicant: { "Full Name": "Broke Applicant", "Date of Birth": "1995-05-05", "Mobile Number": "9988776655", "Father's Name": "Parent" },
    },
  });
  assert.equal(created.status, 201);
  const applicationId = created.data.application.applicationId;
  for (const document of created.data.application.documents) {
    await request(`/applications/${applicationId}/documents`, {
      token: "other",
      body: { documentName: document.name, fileName: `${document.name}.png`, mimeType: "image/png", data: "data:image/png;base64,AA==" },
    });
  }

  const paid = await request("/payments/pay-wallet", {
    token: "other",
    body: { applicationId },
  });
  assert.equal(paid.status, 400);
  assert.match(paid.data.error, /Insufficient wallet balance/i);
});

test("demo wallet top-up adds funds to wallet and ledger", async () => {
  const created = await request("/wallet/create-order", {
    token: "other",
    body: { amount: 250 },
  });
  assert.equal(created.status, 200);
  assert.equal(created.data.mode, "demo");

  const verified = await request("/wallet/verify", {
    token: "other",
    body: { mode: "demo", razorpay_order_id: created.data.orderId },
  });
  assert.equal(verified.status, 200);
  assert.equal(verified.data.ok, true);
  assert.equal(verified.data.wallet.balance, 250);

  const ledger = await request("/wallet/ledger", { token: "other" });
  assert.equal(ledger.status, 200);
  assert.ok(ledger.data.ledger.length > 0);
  assert.equal(ledger.data.ledger[0].amount, 250);
});

test("password reset revokes existing local sessions", async () => {
  assert.equal((await request("/auth/reset-password", { body: { accessToken: "audit-reset", password: "NewAuditPassword123!" } })).status, 200);
  assert.equal((await request("/auth/me", { token: "retailer" })).status, 401);
});
test("logout invalidates session", async () => {
  assert.equal((await request("/auth/logout", { token: "other", body: {} })).status, 200);
  assert.equal((await request("/auth/me", { token: "other" })).status, 401);
});

test("super admin can create staff accounts and assign sub-admin roles", async () => {
  const res = await request("/admin/staff", {
    token: "admin",
    body: {
      name: "Support Staff Agent",
      email: "support.audit@example.test",
      mobile: "9876543210",
      password: "AuditPassword123!",
      adminRole: "support_staff",
    },
  });
  assert.equal(res.status, 201);
  assert.equal(res.data.ok, true);
  assert.equal(res.data.user.role, "admin");
  assert.equal(res.data.user.adminRole, "support_staff");
});

test("super admin can authorize and change user roles", async () => {
  const res = await request("/admin/users/retailer/role", {
    token: "admin",
    method: "PATCH",
    body: {
      role: "admin",
      adminRole: "verification_agent",
    },
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.ok, true);
  assert.equal(res.data.user.role, "admin");
  assert.equal(res.data.user.adminRole, "verification_agent");
});

test("retailers cannot create staff accounts or authorize roles", async () => {
  const loginRes = await request("/auth/login", { body: { credential: "other@example.test", password } });
  const retailerToken = loginRes.data.token;
  assert.equal((await request("/admin/staff", { token: retailerToken, body: { name: "Fake", email: "fake@test.com", password: "pwd", adminRole: "super_admin" } })).status, 403);
  assert.equal((await request("/admin/users/other/role", { token: retailerToken, method: "PATCH", body: { role: "admin" } })).status, 403);
});

test("admin can query PanMitra balance and VLE endpoints", async () => {
  const balRes = await request("/admin/panmitra/balance", { token: "admin" });
  assert.equal(balRes.status, 200);
  assert.ok(balRes.data.balance !== undefined);

  const vleListRes = await request("/admin/panmitra/vles", { token: "admin" });
  assert.equal(vleListRes.status, 200);
  assert.ok(Array.isArray(vleListRes.data.vles));
});

test("retailer can fetch PanMitra VLE profile but cannot buy coupons without VLE", async () => {
  const loginRes = await request("/auth/login", { body: { credential: "other@example.test", password } });
  const retailerToken = loginRes.data.token;
  const profRes = await request("/panmitra/vle-profile", { token: retailerToken });
  assert.equal(profRes.status, 200);
  assert.equal(profRes.data.hasVle, false);

  const buyRes = await request("/panmitra/buy-coupons", {
    token: retailerToken,
    method: "POST",
    body: { quantity: 1, type: "1" },
  });
  assert.equal(buyRes.status, 400);
});


