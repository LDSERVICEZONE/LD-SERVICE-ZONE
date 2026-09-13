import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";

const CATEGORIES = [
  "Wallet",
  "Recharge",
  "PAN",
  "Government Services",
  "Payments",
  "Account",
  "Technical",
];

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [helps, setHelps] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    Promise.all([
      api<any>("/support/tickets"),
      api<any>("/help"),
    ])
      .then(([t, h]) => {
        setTickets(t.tickets || []);
        setHelps(h.helpRequests || []);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setBusy(true);
    setError("");
    try {
      await api("/support/tickets", {
        method: "POST",
        body: JSON.stringify({ subject, category, message }),
      });
      setOpen(false);
      setSubject("");
      setMessage("");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#0F172A]">
            Support & Help Desk
          </h1>
          <p className="text-[#94A3B8] text-sm">
            Manual support tickets and application-specific inquiries.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#1D56D8] hover:bg-[#1546B0] text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition"
        >
          Create New Ticket
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Help Requests */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[#F1F4F9]">
          <h2 className="font-semibold text-base text-[#0F172A]">
            Application Help Requests
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Application context is automatically linked so support agents can resolve issues immediately.
          </p>
        </div>
        {helps.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {helps.map((h) => (
              <div key={h.id} className="p-6 space-y-3">
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div>
                    <h3 className="font-semibold text-[#0F172A]">{h.subject}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {h.applicationId || "General"} · {h.serviceName}
                    </p>
                  </div>
                  <Status s={h.status} />
                </div>
                <p className="text-sm text-slate-600 bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
                  {h.message}
                </p>
                {h.adminReply && (
                  <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
                    <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">
                      Admin Reply
                    </p>
                    <p className="text-sm text-violet-950 mt-1">{h.adminReply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-slate-400">
            No application help requests submitted yet.
          </div>
        )}
      </section>

      {/* Support Tickets */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[#F1F4F9]">
          <h2 className="font-semibold text-base text-[#0F172A]">
            General Support Tickets
          </h2>
        </div>
        {tickets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  {[
                    "Ticket ID",
                    "Subject",
                    "Category",
                    "Priority",
                    "Status",
                    "Created",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs text-[#94A3B8] font-semibold uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F4F9]">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {t.id}
                    </td>
                    <td className="px-6 py-4 font-medium text-[#0F172A]">
                      {t.subject}
                      {t.adminReply && <p className="mt-2 text-xs font-normal text-blue-700">Support reply: {t.adminReply}</p>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{t.category}</td>
                    <td className="px-6 py-4 capitalize text-slate-700">
                      {t.priority}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize bg-slate-100 text-slate-700">
                        {t.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-[#94A3B8]">
                      {new Date(t.createdAt).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-[#94A3B8]">
            No support tickets yet.
          </div>
        )}
      </section>

      {/* Create ticket modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-display font-bold text-lg text-[#0F172A]">
                Create Support Ticket
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Subject
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of the issue..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#1D6FE0] focus:ring-1 focus:ring-[#1D6FE0]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-sm bg-white outline-none focus:border-[#1D6FE0] focus:ring-1 focus:ring-[#1D6FE0]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Message / Details
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide all relevant details, transaction IDs or error messages..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-[#1D6FE0] focus:ring-1 focus:ring-[#1D6FE0]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  disabled={busy || !subject.trim() || !message.trim()}
                  onClick={create}
                  className="px-5 py-2.5 rounded-xl bg-[#1D56D8] hover:bg-[#1546B0] text-white text-sm font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {busy ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Status({ s }: { s: string }) {
  const m: any = {
    open: ["bg-amber-50", "text-amber-700", "border-amber-200"],
    in_progress: ["bg-blue-50", "text-blue-700", "border-blue-200"],
    resolved: ["bg-emerald-50", "text-emerald-700", "border-emerald-200"],
  };
  const c = m[s] || m.open;
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${c[0]} ${c[1]} ${c[2]}`}
    >
      {s.replaceAll("_", " ")}
    </span>
  );
}
