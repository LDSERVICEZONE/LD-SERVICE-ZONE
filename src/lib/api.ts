export const API_BASE = "/api";

export function getToken() { return localStorage.getItem("ld_token") || ""; }
export function getUser<T = any>(): T | null { try { return JSON.parse(localStorage.getItem("ld_user") || "null"); } catch { return null; } }
export function setSession(token: string, user: any) { localStorage.setItem("ld_token", token); localStorage.setItem("ld_user", JSON.stringify(user)); }
export function clearSession() { localStorage.removeItem("ld_token"); localStorage.removeItem("ld_user"); }

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function downloadAuthenticatedFile(path: string, fileName?: string): Promise<void> {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Could not download file (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  if (fileName) a.download = fileName;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
