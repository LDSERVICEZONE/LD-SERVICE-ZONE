// Run against the isolated audit backend, never production accounts.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const base = process.env.AUDIT_URL || "http://127.0.0.1:8450";
const output = path.resolve("audit/screenshots");
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.AUDIT_BROWSER_CHANNEL || "chrome", headless: true });
const results = [];
const pageErrors = [];
const publicRoutes = ["/", "/login", "/register", "/reset-password"];
const retailerRoutes = ["/dashboard", ...["wallet", "recharge", "services", "customers", "analytics", "support", "profile", "applications"].map(x => "/dashboard/" + x)];
const adminRoutes = ["/admin", ...["users", "transactions", "applications", "services", "analytics", "reports", "settings", "help"].map(x => "/admin/" + x)];
let count = 0;
async function observe(page) { return page.locator("body").ariaSnapshot(); }
async function capture(page, route, size) {
  await page.goto(base + route);
  await page.locator("h1").first().waitFor({ timeout: 30000 });
  await page.locator(".animate-pulse").first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  const snapshot = await observe(page);
  assert.ok(snapshot.length > 50, `Blank page: ${route}`);
  const errors = await page.getByRole("alert").allTextContents();
  const metrics = await page.evaluate(() => {
    const header = document.querySelector("header") || document.querySelector("nav");
    const box = header?.getBoundingClientRect();
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, header: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null };
  });
  const filename = `${String(++count).padStart(2, "0")}-${size}-${route.replaceAll("/", "-") || "home"}.png`;
  await page.screenshot({ path: path.join(output, filename), animations: "disabled" });
  results.push({ route, size, filename, errors, ...metrics });
  assert.ok(metrics.header && metrics.header.height >= 48 && metrics.header.y >= 0, `Header missing: ${route}`);
  assert.ok(metrics.scrollWidth <= metrics.width + 1, `Page overflow: ${route} at ${size}`);
  if (!publicRoutes.includes(route)) {
    const nav = page.getByRole("navigation", { name: route.startsWith("/admin") ? "Admin navigation" : "Retailer navigation" });
    if (size === "desktop") assert.ok(await nav.isVisible(), `Sidebar missing: ${route}`);
    else {
      await observe(page);
      await page.getByRole("button", { name: route.startsWith("/admin") ? "Toggle admin navigation" : "Open navigation", exact: true }).click();
      await nav.waitFor({ state: "visible" });
      await observe(page);
      await page.keyboard.press("Escape");
      await nav.waitFor({ state: "hidden" });
    }
  }
  console.log(`PASS ${size} ${route}`);
}
try {
  for (const [size, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push({ url: page.url(), error: error.message }));
    for (const route of publicRoutes) await capture(page, route, size);
    await page.goto(base + "/dashboard/wallet");
    await page.waitForURL("**/login");
    for (const [role, routes] of [["retailer", retailerRoutes], ["admin", adminRoutes]]) {
      await page.goto(base + "/login");
      await observe(page);
      await page.getByLabel("Email or Mobile Number").fill(`${role}@example.test`);
      await observe(page);
      await page.getByLabel("Password", { exact: true }).fill("AuditPassword123!");
      await observe(page);
      await page.getByRole("button", { name: "Sign In", exact: false }).click();
      await page.waitForURL(role === "admin" ? "**/admin" : "**/dashboard");
      for (const route of routes) await capture(page, route, size);
      // Verify role redirects and route restoration after refresh.
      await page.goto(base + (role === "admin" ? "/dashboard" : "/admin"));
      await page.waitForURL(role === "admin" ? "**/admin" : "**/dashboard");
      await page.reload();
      await page.locator("h1").first().waitFor();
      await observe(page);
      if (role === "admin" && size === "mobile") {
        await page.getByRole("button", { name: "Toggle admin navigation" }).click();
        await observe(page);
      }
      await page.getByRole("button", { name: role === "admin" ? "Sign Out" : "Logout", exact: true }).click();
      await page.waitForURL("**/login");
    }
    await context.close();
  }
  assert.deepEqual(pageErrors, []);
} finally {
  fs.writeFileSync(path.resolve("audit/browser-results.json"), JSON.stringify({ results, pageErrors }, null, 2));
  await browser.close();
}
