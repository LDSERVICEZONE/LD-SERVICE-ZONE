import { spawn } from "node:child_process";

const isWin = process.platform === "win32";
const npm = isWin ? "npm.cmd" : "npm";
const pnpm = isWin ? "pnpm.cmd" : "pnpm";

// Figma Make may reserve PORT/API_PORT for the preview server.
// Keep the API on its own port so the backend cannot collide with Vite.
const apiEnv = { ...process.env, API_PORT: process.env.LD_API_PORT || "8787" };

const api = spawn(process.execPath, ["server.js"], {
  stdio: "inherit",
  env: apiEnv,
});

// Run Vite with the same package manager used by the caller when possible.
// This makes `npm run dev:all` work without requiring pnpm to be installed.
const userAgent = process.env.npm_config_user_agent || "";
const packageManager = userAgent.startsWith("pnpm/") ? pnpm : npm;
const viteArgs = ["run", "dev"];

const vite = spawn(packageManager, viteArgs, {
  stdio: "inherit",
  shell: false,
  env: process.env,
});

let stopping = false;
const stop = (code = 0) => {
  if (stopping) return;
  stopping = true;
  if (!api.killed) api.kill("SIGTERM");
  if (!vite.killed) vite.kill("SIGTERM");
  setTimeout(() => process.exit(code), 100);
};

api.on("error", (err) => {
  console.error("Failed to start API server:", err.message);
  stop(1);
});
vite.on("error", (err) => {
  console.error("Failed to start Vite:", err.message);
  stop(1);
});

api.on("exit", (code) => {
  if (!stopping && code && code !== 0) stop(code);
});
vite.on("exit", (code) => {
  if (!stopping && code && code !== 0) stop(code);
});

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
