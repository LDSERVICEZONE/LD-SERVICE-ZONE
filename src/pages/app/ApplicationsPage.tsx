import { useEffect, useState } from "react";
import { api, downloadAuthenticatedFile } from "@/shared/api/client";
import { Download, FileText, LifeBuoy, X } from "lucide-react";
import ApplicationCheckout from "../../components/ApplicationCheckout";

export default function ApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [helpApp, setHelpApp] = useState<any>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    api<any>("/applications")
      .then((d) => setApps(d.applications || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const raiseHelp = async () => {
    if (!helpApp || !subject.trim() || !message.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api("/help", {
        method: "POST",
        body: JSON.stringify({
          applicationId: helpApp.applicationId,
          serviceName: helpApp.serviceName,
          subject,
          message,
        }),
      });
      setHelpApp(null);
      setSubject("");
      setMessage("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 max-w-[1200px] space-y-5">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
          Workspace
        </span>
        <h1 className="font-display text-3xl font-extrabold text-[#0F172A]">
          My Applications
        </h1>
        <p className="text-sm text-[#94A3B8]">
          Track payment, processing, uploaded documents and admin decisions for your service requests.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Metric title="Total" value={apps.length} />
        <Metric
          title="In progress"
          value={
            apps.filter((a) =>
              ["submitted", "processing", "accepted"].includes(a.status)
            ).length
          }
        />
        <Metric
          title="Completed"
          value={apps.filter((a) => a.status === "completed").length}
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <div className="px-5 py-4 border-b font-bold">Application History</div>
        {loading ? (
          <div className="p-8 text-center text-[#94A3B8]">Loading…</div>
        ) : !apps.length ? (
          <div className="p-10 text-center text-[#94A3B8]">
            No applications yet. Open Govt Services to start one.
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {apps.map((a) => (
              <div
                key={a.applicationId}
                className="p-5 flex flex-wrap items-center gap-4 justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <b className="text-[#0F172A]">{a.serviceName}</b>
                    <Status s={a.status} />
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-1 font-mono">
                    {a.applicationId} · {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-5">
                  <div>
                    <p className="text-[10px] text-[#94A3B8]">Amount</p>
                    <b className="font-mono">₹{a.customerPrice}</b>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#94A3B8]">Commission</p>
                    <b className="font-mono text-emerald-600">₹{a.commission}</b>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#94A3B8]">Payment</p>
                    <b
                      className={
                        a.paymentId ? "text-emerald-600" : "text-amber-600"
                      }
                    >
                      {a.paymentId ? "Paid" : "Pending"}
                    </b>
                  </div>

                  <button
                    onClick={() => setSelectedApp(a)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    View Details
                  </button>

                  <button
                    onClick={() => {
                      setHelpApp(a);
                      setSubject(`Help with ${a.serviceName}`);
                      setMessage("");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold transition-colors"
                  >
                    <LifeBuoy size={14} />
                    Need Help
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Application Details Modal */}
      {selectedApp && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          onClick={() => setSelectedApp(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono text-blue-600 font-bold">
                  {selectedApp.applicationId}
                </span>
                <h2 className="font-display text-xl font-bold mt-0.5">
                  {selectedApp.serviceName}
                </h2>
                <p className="text-xs text-slate-400">
                  Status: {selectedApp.status.replace(/_/g, " ")}
                </p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {selectedApp.adminNote && (
              <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <b>Admin Note:</b> {selectedApp.adminNote}
              </div>
            )}

            <div className="mt-5 space-y-4">
              {selectedApp.status === "payment_pending" && <ApplicationCheckout application={selectedApp} onComplete={() => { setSelectedApp(null); void load(); }} />}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Uploaded Documents
                </h3>
                <div className="space-y-2">
                  {(selectedApp.documents || []).map((d: any) => (
                    <div
                      key={d.name}
                      className="flex justify-between items-center p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText size={18} className="text-blue-600" />
                        <div>
                          <b className="text-sm block text-slate-800">
                            {d.name}
                          </b>
                          <p className="text-xs text-slate-400">
                            {d.fileName || "Not uploaded"}
                          </p>
                        </div>
                      </div>
                      {d.fileName ? (
                        <button
                          onClick={() =>
                            downloadAuthenticatedFile(
                              `/applications/${selectedApp.applicationId}/documents/${encodeURIComponent(
                                d.name
                              )}`,
                              d.fileName
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                        >
                          <Download size={13} />
                          Download
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Pending
                        </span>
                      )}
                    </div>
                  ))}
                  {(!selectedApp.documents ||
                    selectedApp.documents.length === 0) && (
                    <p className="text-xs text-slate-400">
                      No documents required or uploaded.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Applicant Form Details
                </h3>
                <div className="rounded-xl border border-slate-200 p-3 space-y-1.5 text-xs">
                  {Object.entries(selectedApp.applicant || {}).map(
                    ([k, v]) => (
                      <div key={k} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                        <span className="text-slate-400">{k}</span>
                        <span className="font-medium text-slate-700 text-right">
                          {String(v || "—")}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {helpApp && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          onClick={() => !busy && setHelpApp(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between">
              <div>
                <h2 className="font-display text-xl font-bold">Need Help</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {helpApp.serviceName} · {helpApp.applicationId}
                </p>
              </div>
              <button onClick={() => setHelpApp(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Explain what is stuck or what you need from admin"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                disabled={busy || !subject.trim() || !message.trim()}
                onClick={raiseHelp}
                className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold disabled:opacity-50 text-sm"
              >
                {busy ? "Sending…" : "Send Help Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
      <p className="text-xs text-[#94A3B8]">{title}</p>
      <p className="text-2xl font-display font-extrabold mt-1">{value}</p>
    </div>
  );
}

function Status({ s }: { s: string }) {
  return (
    <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold capitalize">
      {s.replace(/_/g, " ")}
    </span>
  );
}
