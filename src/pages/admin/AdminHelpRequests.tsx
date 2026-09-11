import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import {
  CheckCircle2,
  ExternalLink,
  LifeBuoy,
  MessageSquare,
  X,
} from "lucide-react";

const FILTERS = ["all", "open", "in_progress", "resolved"];

export default function AdminHelpRequests() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("open");
  const [selected, setSelected] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("open");
  const [appStatus, setAppStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    api<any>(`/admin/help${filter !== "all" ? `?status=${filter}` : ""}`)
      .then((d) => setItems(d.helpRequests || []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [filter]);

  const visible = useMemo(() => items, [items]);

  const openItem = (h: any) => {
    setSelected(h);
    setReply(h.adminReply || "");
    setStatus(h.status);
    setAppStatus("");
    setAdminNote("");
    setError("");
  };

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const body: any = { status, adminReply: reply };
      if (selected.applicationId && appStatus) {
        body.applicationUpdate = { status: appStatus, adminNote };
      }
      const d = await api<any>(`/admin/help/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setItems((xs) =>
        xs.map((x) => (x.id === selected.id ? d.helpRequest : x))
      );
      setSelected(d.helpRequest);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 max-w-[1450px] space-y-6">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-violet-600 uppercase">
            Operations
          </span>
          <h1 className="font-display text-3xl font-extrabold text-[#0F172A]">
            Help Requests
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Manual retailer escalations with linked application snapshots.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2.5 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-50 text-sm font-semibold transition"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition ${
              filter === f
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-white border border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr>
                {[
                  "Request",
                  "Retailer",
                  "Application",
                  "Service",
                  "Status",
                  "Created",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-4">
                    <b className="text-[#0F172A] block">{h.subject}</b>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      {h.id}
                    </p>
                  </td>
                  <td className="px-5 py-4 font-medium">{h.retailerName}</td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-600">
                    {h.applicationId || "—"}
                  </td>
                  <td className="px-5 py-4">{h.serviceName}</td>
                  <td className="px-5 py-4">
                    <Status s={h.status} />
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400">
                    {new Date(h.createdAt).toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => openItem(h)}
                      className="px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 text-xs font-semibold transition"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-slate-400 text-sm"
                  >
                    No help requests found matching this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex justify-end"
          onClick={() => !busy && setSelected(null)}
        >
          <div
            className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-violet-600 font-mono">
                  {selected.id}
                </span>
                <h2 className="font-display text-xl font-bold text-[#0F172A] mt-1">
                  {selected.subject}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {selected.retailerName} · {selected.serviceName}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">
                <div className="flex items-center gap-2 text-violet-700 font-semibold text-sm">
                  <LifeBuoy size={18} />
                  <span>Retailer Message</span>
                </div>
                <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">
                  {selected.message}
                </p>
              </div>

              {selected.applicationSnapshot && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold text-[#0F172A]">
                      Application Snapshot
                    </h3>
                    {selected.applicationId && (
                      <a
                        href={`/admin/applications?application=${encodeURIComponent(
                          selected.applicationId
                        )}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800"
                      >
                        <ExternalLink size={13} />
                        Open Application
                      </a>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4 space-y-2 bg-[#F8FAFC]">
                    {Object.entries(selected.applicationSnapshot).map(
                      ([k, v]) => (
                        <div
                          key={k}
                          className="py-2 border-b border-slate-200/60 last:border-0"
                        >
                          <p className="text-[10px] uppercase text-slate-400 font-semibold">
                            {k}
                          </p>
                          <pre className="text-xs whitespace-pre-wrap break-all mt-1 text-slate-700 font-sans">
                            {typeof v === "object"
                              ? JSON.stringify(v, null, 2)
                              : String(v ?? "—")}
                          </pre>
                        </div>
                      )
                    )}
                  </div>
                </section>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Request Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white outline-none focus:border-violet-500"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Admin Reply
                </label>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-violet-500"
                  placeholder="Provide response to retailer..."
                />
              </div>

              {selected.applicationId && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                    <MessageSquare size={17} />
                    <span>Fix Linked Application Status</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Optional. Updating status to 'completed' will trigger retailer commission credit automatically.
                  </p>
                  <select
                    value={appStatus}
                    onChange={(e) => setAppStatus(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white outline-none"
                  >
                    <option value="">No application status change</option>
                    {[
                      "submitted",
                      "processing",
                      "accepted",
                      "completed",
                      "rejected",
                      "payment_pending",
                    ].map((x) => (
                      <option key={x} value={x}>
                        {x.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                  {appStatus && (
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      rows={2}
                      placeholder="Internal application admin note..."
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none"
                    />
                  )}
                </div>
              )}

              <button
                disabled={busy}
                onClick={save}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold transition disabled:opacity-50"
              >
                {busy ? "Saving..." : "Save Help Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Status({ s }: { s: string }) {
  const m: any = {
    open: ["bg-amber-50", "text-amber-700"],
    in_progress: ["bg-blue-50", "text-blue-700"],
    resolved: ["bg-emerald-50", "text-emerald-700"],
  };
  const c = m[s] || m.open;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${c[0]} ${c[1]}`}
    >
      {s === "resolved" && <CheckCircle2 size={11} />} {s.replaceAll("_", " ")}
    </span>
  );
}
