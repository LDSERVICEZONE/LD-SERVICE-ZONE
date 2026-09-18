import assert from "node:assert/strict";

const BASE_URL = "http://127.0.0.1:8787/api";

async function post(endpoint, body, token) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function get(endpoint, token) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function patch(endpoint, body, token) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function del(endpoint, token) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runE2E() {
  console.log("=================================================");
  console.log("🚀 STARTING E2E VERIFICATION OF ALL 4 FEATURES");
  console.log("=================================================");

  // 1. Admin Login
  console.log("\n[STEP 1] Logging in as Admin...");
  const adminLogin = await post("/auth/login", {
    credential: "admin",
    password: "Password@123", // or Bilson@123
  });

  let adminToken = adminLogin.data?.token;
  if (!adminToken) {
    // Try Bilson@123
    const retryLogin = await post("/auth/login", {
      credential: "admin",
      password: "Bilson@123",
    });
    adminToken = retryLogin.data?.token;
  }

  assert.ok(adminToken, "Admin login failed: " + JSON.stringify(adminLogin.data));
  console.log("✅ Admin logged in successfully.");

  // 2. Feature 1: Admin Auto-Create Retailer with Gmail, Mobile, Aadhaar
  console.log("\n[STEP 2] Testing Feature 1: Admin Auto-Create Retailer...");
  const testEmail = `test.retailer.${Date.now()}@gmail.com`;
  const testMobile = "9861" + String(Math.floor(100000 + Math.random() * 900000));
  const testAadhaar = "9988" + String(Math.floor(10000000 + Math.random() * 90000000));

  const createRes = await post("/admin/retailer", {
    name: "Santosh Kumar Jena",
    businessName: "Maa Tarini Cyber Zone",
    email: testEmail,
    mobile: testMobile,
    aadhaar: testAadhaar,
    pan: "ABCDE9876Z",
    city: "Bhubaneswar",
    state: "Odisha",
    pincode: "751024",
    initialBalance: 150,
    createPanMitraVle: true,
  }, adminToken);

  console.log("Auto-Create Retailer Response:", createRes.data);
  assert.equal(createRes.status, 201, "Expected 201 Created");
  assert.equal(createRes.data.ok, true);
  assert.equal(createRes.data.user.email, testEmail);
  assert.equal(createRes.data.user.role, "retailer");
  assert.equal(createRes.data.user.kycStatus, "verified");
  assert.ok(createRes.data.credentials.password, "Password should be generated");
  assert.ok(createRes.data.credentials.vleId, "UTI PSA VLE ID should be generated");
  console.log("✅ Feature 1 PASSED: Retailer account created with credentials & UTI PSA ID!");

  const newUserId = createRes.data.user.id;
  const newPassword = createRes.data.credentials.password;

  // 3. Test Retailer Login with newly created credentials
  console.log("\n[STEP 3] Testing Retailer Login with Generated Credentials...");
  console.log("Attempting login with credential:", testEmail, "and password:", newPassword);
  const retailerLogin = await post("/auth/login", {
    credential: testEmail,
    password: newPassword,
  });
  console.log("Retailer Login Result:", retailerLogin.status, retailerLogin.data);
  assert.equal(retailerLogin.status, 200, "Retailer login should succeed");
  const retailerToken = retailerLogin.data.token;
  assert.ok(retailerToken);

  // Check Wallet Balance
  const walletRes = await get("/wallet", retailerToken);
  assert.equal(walletRes.status, 200);
  const balance = walletRes.data.wallet?.balance ?? walletRes.data.balance;
  assert.equal(balance, 150, "Initial wallet credit should be 150");
  console.log(`✅ Retailer login verified. Wallet balance: ₹${balance}`);

  // 4. Feature 3: Status Toggle (Suspend / Reactivate)
  console.log("\n[STEP 4] Testing Feature 3A: Account Suspension...");
  const suspendRes = await patch(`/admin/users/${newUserId}/status`, { status: "suspended" }, adminToken);
  assert.equal(suspendRes.status, 200);
  assert.equal(suspendRes.data.user.status, "suspended");

  // Verify suspended retailer cannot access endpoints (session invalidated -> 401 / blocked -> 403)
  const suspendedAccess = await get("/wallet", retailerToken);
  assert.ok(
    suspendedAccess.status === 401 || suspendedAccess.status === 403,
    `Suspended retailer should be blocked, received ${suspendedAccess.status}`
  );
  console.log("✅ Account suspended: Retailer session invalidated and blocked.");

  // Reactivate
  const reactivateRes = await patch(`/admin/users/${newUserId}/status`, { status: "active" }, adminToken);
  assert.equal(reactivateRes.status, 200);
  assert.equal(reactivateRes.data.user.status, "active");
  console.log("✅ Account reactivated successfully.");

  // 5. Feature 2: Top Marquee Running Announcement Ticker
  console.log("\n[STEP 5] Testing Feature 2: Top Running Marquee Announcement...");
  const testNotice = "🟢 All services working fine. Server speed is optimal. | ⚠️ Scheduled maintenance tonight 11:30 PM - 12:00 AM.";
  const updateAnn = await post("/admin/announcement", {
    text: testNotice,
    tone: "success",
    active: true,
  }, adminToken);
  assert.equal(updateAnn.status, 200);
  assert.equal(updateAnn.data.announcement.text, testNotice);

  // Verify public/retailer fetch
  const publicAnn = await get("/announcement");
  assert.equal(publicAnn.status, 200);
  assert.equal(publicAnn.data.announcement.text, testNotice);
  assert.equal(publicAnn.data.announcement.tone, "success");
  assert.equal(publicAnn.data.announcement.active, true);
  console.log("✅ Feature 2 PASSED: Announcement ticker updated and broadcast live!");

  // 6. Feature 4: Catalog Management (Create, Disable Toggle, Delete)
  console.log("\n[STEP 6] Testing Feature 4: Catalog Add, Disable Toggle & Delete...");
  const svcId = "SVC-E2E-" + Date.now();
  const createSvc = await post("/services", {
    id: svcId,
    name: "E2E Temporary Test Service",
    category: "Government",
    processingTime: "1-2 days",
    customerPrice: 120,
    commission: 30,
    documents: ["Aadhaar", "Photo"],
  }, adminToken);
  assert.equal(createSvc.status, 201);
  assert.equal(createSvc.data.service.id, svcId);

  // Toggle to Disabled
  const disableSvc = await patch(`/services/${svcId}`, { status: "disabled" }, adminToken);
  assert.equal(disableSvc.status, 200);
  assert.equal(disableSvc.data.service.status, "disabled");
  console.log("✅ Service status toggled to 'disabled'.");

  // Delete Service
  const deleteSvc = await del(`/services/${svcId}`, adminToken);
  assert.equal(deleteSvc.status, 200);
  assert.equal(deleteSvc.data.ok, true);

  const catalog = await get("/services");
  assert.equal(catalog.data.services.some((s) => s.id === svcId), false);
  console.log("✅ Feature 4 PASSED: Catalog service created, toggled, and deleted!");

  // 7. Feature 3B: Delete Inactive Retailer
  console.log("\n[STEP 7] Testing Feature 3B: Inactive Retailer Deletion...");
  const deleteUserRes = await del(`/admin/users/${newUserId}`, adminToken);
  assert.equal(deleteUserRes.status, 200);
  assert.equal(deleteUserRes.data.ok, true);

  const allUsers = await get("/admin/users", adminToken);
  assert.equal(allUsers.data.users.some((u) => u.id === newUserId), false);
  console.log("✅ Feature 3B PASSED: Test retailer successfully and cleanly removed!");

  console.log("\n=================================================");
  console.log("🎉 ALL 4 CLIENT FEATURES VERIFIED & WORKING 100%!");
  console.log("=================================================");
}

runE2E().catch((err) => {
  console.error("❌ E2E VERIFICATION FAILED:", err);
  process.exit(1);
});
