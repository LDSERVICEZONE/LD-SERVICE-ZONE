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
test("application price and documents come from server catalogue", async () => {
  const result = await request("/applications", { token: "retailer", body: { serviceId: "PAN-NEW", serviceName: "Tampered", customerPrice: 0, commission: 999999, documents: [], applicant: { "Full Name": "Test Applicant" } } });
  assert.equal(result.status, 201);
  assert.notEqual(result.data.application.customerPrice, 0);
  assert.notEqual(result.data.application.commission, 999999);
  assert.ok(result.data.application.documents.length);
  assert.equal((await request("/payments/create-order", { token: "retailer", body: { applicationId: result.data.application.applicationId } })).status, 400);
});
test("unknown service rejected", async () => assert.equal((await request("/applications", { token: "retailer", body: { serviceId: "fake", applicant: { name: "Test" } } })).status, 400));
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
test("admin cannot complete unpaid application", async () => assert.equal((await request("/applications/second", { token: "admin", method: "PATCH", body: { status: "completed" } })).status, 400));
test("signed webhook with wrong amount is rejected", async () => {
  const body = { event: "payment.captured", payload: { payment: { entity: { id: "another", order_id: "order-first", amount: 1, currency: "INR" } } } };
  const signature = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(JSON.stringify(body)).digest("hex");
  assert.equal((await request("/payments/webhook", { body, headers: { "x-razorpay-signature": signature } })).status, 400);
});
test("password reset revokes existing local sessions", async () => {
  assert.equal((await request("/auth/reset-password", { body: { accessToken: "audit-reset", password: "NewAuditPassword123!" } })).status, 200);
  assert.equal((await request("/auth/me", { token: "retailer" })).status, 401);
});
test("logout invalidates session", async () => {
  assert.equal((await request("/auth/logout", { token: "other", body: {} })).status, 200);
  assert.equal((await request("/auth/me", { token: "other" })).status, 401);
});
