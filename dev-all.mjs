import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Figma Make may reserve PORT/API_PORT for the preview server.
// Keep the API on its own port so the backend cannot collide with Vite.
const apiEnv = { ...process.env, API_PORT: process.env.LD_API_PORT || "8787" };

const api = spawn(process.execPath, [path.join(rootDir, "server.js")], {
  stdio: "inherit",
  cwd: rootDir,
  env: apiEnv,
});

// Launch Vite through Node so this works consistently on Windows, where .cmd
// files cannot be spawned directly without invoking a shell.
const viteCli = path.join(rootDir, "node_modules", "vite", "bin", "vite.js");
const vite = spawn(process.execPath, [viteCli, "--host", "0.0.0.0"], {
  stdio: "inherit",
  cwd: rootDir,
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
