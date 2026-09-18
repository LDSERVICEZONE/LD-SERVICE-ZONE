import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";
import {
  CheckCircle2,
  Settings2,
  XCircle,
  Radio,
  Save,
  AlertTriangle,
  Info,
  Sparkles,
} from "lucide-react";

export default function AdminSettings() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Announcement state
  const [annText, setAnnText] = useState("");
  const [annTone, setAnnTone] = useState<"info" | "success" | "warning" | "critical">("success");
  const [annActive, setAnnActive] = useState(true);
  const [annBusy, setAnnBusy] = useState(false);
  const [annSaved, setAnnSaved] = useState(false);
  const [annError, setAnnError] = useState("");

  useEffect(() => {
    Promise.all([
      api<any>("/health").then(setHealth).catch((e) => setError(e.message)),
      api<any>("/announcement").then((res) => {
        if (res?.announcement) {
          setAnnText(res.announcement.text || "");
          setAnnTone(res.announcement.tone || "success");
          setAnnActive(res.announcement.active !== false);
        }
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnBusy(true);
    setAnnSaved(false);
    setAnnError("");
    try {
      await api<any>("/admin/announcement", {
        method: "POST",
        body: JSON.stringify({
          text: annText,
          tone: annTone,
          active: annActive,
        }),
      });
      setAnnSaved(true);
      setTimeout(() => setAnnSaved(false), 3000);
    } catch (err: any) {
      setAnnError(err.message || "Failed to update announcement");
    } finally {
      setAnnBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1000px]">
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <div>
        <h1 className="font-display text-2xl font-extrabold">Platform Settings</h1>
        <p className="text-[#94A3B8] text-sm">
          Live ticker notices, backend integrations, and server configuration.
        </p>
      </div>

      {/* ======================================================== */}
      {/* LIVE RUNNING NOTIFICATION TICKER CONTROL                 */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Radio className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h2 className="font-display font-bold text-base text-slate-900">
                Top Running Notification Ticker (Marquee)
              </h2>
              <p className="text-xs text-slate-500">
                Live scrolling alert visible at the top of the Retailer Portal (e.g. server speed, maintenance times).
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={annActive}
              onChange={(e) => setAnnActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 relative" />
            <span className="text-xs font-semibold text-slate-700">
              {annActive ? "Ticker Active" : "Ticker Disabled"}
            </span>
          </label>
        </div>

        {annError && (
          <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{annError}</span>
          </div>
        )}

        {annSaved && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Ticker notification saved and broadcast live to all retailers!</span>
          </div>
        )}

        <form onSubmit={handleSaveAnnouncement} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Notice Text (Scrolls Continuously on Retailer Top Bar)
            </label>
            <textarea
              rows={2}
              required
              value={annText}
              onChange={(e) => setAnnText(e.target.value)}
              placeholder="e.g. 🟢 All services working fine. Server speed is optimal. | ⚠️ Scheduled maintenance tonight 11:30 PM - 12:00 AM."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Alert Tone & Color
              </label>
              <select
                value={annTone}
                onChange={(e) => setAnnTone(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:outline-hidden font-medium"
              >
                <option value="success">🟢 Green (All Services Working Fine / Normal)</option>
                <option value="info">🔵 Blue (General Platform Notice / Update)</option>
                <option value="warning">🟡 Amber (Server Maintenance / Slow Bank Server)</option>
                <option value="critical">🔴 Red (Urgent Notice / Downtime)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={annBusy}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {annBusy ? "Updating Live Ticker..." : "Save & Publish Ticker"}
              </button>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="pt-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
              Live Preview
            </span>
            <div
              className={`rounded-xl border p-3 text-xs flex items-center gap-2.5 overflow-hidden ${
                annTone === "success"
                  ? "bg-emerald-950 text-emerald-200 border-emerald-500/30"
                  : annTone === "warning"
                    ? "bg-amber-950 text-amber-200 border-amber-500/30"
                    : annTone === "critical"
                      ? "bg-rose-950 text-rose-200 border-rose-500/30"
                      : "bg-[#0b1b36] text-blue-200 border-blue-500/30"
              }`}
            >
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 bg-white/10">
                {annTone.toUpperCase()}
              </span>
              <span className="truncate font-medium">
                {annText || "Notice text will appear here..."}
              </span>
            </div>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
        <h2 className="font-semibold mb-4 text-base">Backend Integrations</h2>
        {loading ? (
          <div className="h-32 animate-pulse bg-[#F8FAFC] rounded-xl" />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(health?.integrations || {}).map(([name, value]) => (
              <div
                key={name}
                className="flex items-center justify-between p-4 rounded-xl border border-[#E2E8F0]"
              >
                <span className="capitalize text-sm font-medium text-slate-700">
                  {name.replace(/([A-Z])/g, " $1")}
                </span>
                {value ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                    <CheckCircle2 size={16} /> Configured
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <XCircle size={16} /> Not configured
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
        <div className="flex items-center gap-2">
          <Settings2 size={18} className="text-blue-600" />
          <h2 className="font-semibold text-base">Security & Environment</h2>
        </div>
        <p className="text-sm text-[#64748B] mt-2">
          Credentials and service-role keys remain server-side in your protected{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-mono">
            .env
          </code>{" "}
          file and are never bundled into the client browser.
        </p>
      </section>
    </div>
  );
}
