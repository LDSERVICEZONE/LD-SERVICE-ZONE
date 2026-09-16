import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";
import KycReview from "../../components/KycReview";
import { Wallet, PlusCircle, MinusCircle, AlertCircle, CheckCircle2, X } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Adjustment modal state
  const [adjustUser, setAdjustUser] = useState<any | null>(null);
  const [adjType, setAdjType] = useState<"credit" | "debit">("credit");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("Cash Deposit");
  const [adjNote, setAdjNote] = useState("");
  const [adjBusy, setAdjBusy] = useState(false);
  const [adjError, setAdjError] = useState("");
  const [adjSuccess, setAdjSuccess] = useState("");

  const loadUsers = () => {
    return api<any>("/admin/users")
      .then((d) => setUsers(d.users || []))
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openAdjustModal = (user: any) => {
    setAdjustUser(user);
    setAdjType("credit");
    setAdjAmount("");
    setAdjReason("Cash Deposit");
    setAdjNote("");
    setAdjError("");
    setAdjSuccess("");
  };

  const closeAdjustModal = () => {
    if (adjBusy) return;
    setAdjustUser(null);
  };

  async function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustUser) return;
    setAdjError("");
    setAdjSuccess("");
    const amount = Number(adjAmount);
    if (!amount || amount <= 0) {
      setAdjError("Please enter a valid amount greater than 0");
      return;
    }

    setAdjBusy(true);
    try {
      const res = await api<any>("/admin/wallet/adjust", {
        method: "POST",
        body: JSON.stringify({
          userId: adjustUser.id,
          type: adjType,
          amount,
          reason: adjReason,
          note: adjNote,
        }),
      });

      setAdjSuccess(res.message || "Adjustment applied successfully");
      await loadUsers();
      setTimeout(() => {
        setAdjustUser(null);
      }, 1200);
    } catch (err: any) {
      setAdjError(err?.message || "Failed to adjust wallet");
    } finally {
      setAdjBusy(false);
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-[1300px]">
      {loadError && <p role="alert" className="text-red-600">{loadError}</p>}
      <div>
        <h1 className="font-display text-2xl font-extrabold">Users & Retailers</h1>
        <p className="text-[#94A3B8] text-sm">Account overview, KYC verification, and wallet balances.</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-sm text-[#94A3B8]">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr>
                {[
                  "Name",
                  "Business",
                  "Email",
                  "Role",
                  "KYC",
                  "Status",
                  "Wallet Balance",
                  "Joined",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-semibold text-[#64748B]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[#F1F4F9] hover:bg-slate-50/50">
                  <td className="px-5 py-4 font-medium text-slate-900">{u.name}</td>
                  <td className="px-5 py-4 text-slate-700">{u.businessName || "—"}</td>
                  <td className="px-5 py-4 text-slate-600">{u.email}</td>
                  <td className="px-5 py-4 capitalize">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                      u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 capitalize">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                      u.kycStatus === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {u.kycStatus || "unverified"}
                    </span>
                  </td>
                  <td className="px-5 py-4 capitalize">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                      u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono-data font-semibold text-slate-900">
                    ₹{Number(u.wallet || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => openAdjustModal(u)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center text-[#94A3B8]"
                  >
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <KycReview onUpdated={() => void loadUsers()} />

      {/* Adjust Wallet Modal */}
      {adjustUser && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={closeAdjustModal}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900">Adjust Wallet Balance</h3>
                <p className="text-xs text-slate-500">{adjustUser.name} ({adjustUser.email})</p>
              </div>
              <button
                onClick={closeAdjustModal}
                disabled={adjBusy}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Current Balance</p>
                <p className="font-mono-data text-xl font-extrabold text-slate-900 mt-0.5">
                  ₹{Number(adjustUser.wallet || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <span className="px-2 py-1 rounded bg-white border border-slate-200 text-xs font-semibold text-slate-600">
                {adjustUser.role}
              </span>
            </div>

            {adjError && (
              <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adjError}</span>
              </div>
            )}

            {adjSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{adjSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Action
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjType("credit")}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      adjType === "credit"
                        ? "border-emerald-500 bg-emerald-50/70 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-600" />
                    Credit (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType("debit")}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      adjType === "debit"
                        ? "border-red-500 bg-red-50/70 text-red-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <MinusCircle className="w-4 h-4 text-red-600" />
                    Debit (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Reason
                </label>
                <select
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:outline-hidden bg-white"
                >
                  <option value="Cash Deposit">Cash Deposit at Center</option>
                  <option value="Bank NEFT/IMPS Transfer">Bank NEFT / IMPS Transfer</option>
                  <option value="UPI Direct Transfer">UPI Direct Transfer</option>
                  <option value="Commission Correction">Commission / Incentive Correction</option>
                  <option value="Dispute Resolution">Dispute Resolution / Refund</option>
                  <option value="Administrative Adjustment">Other Administrative Adjustment</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Reference Note (Optional)
                </label>
                <input
                  type="text"
                  value={adjNote}
                  onChange={(e) => setAdjNote(e.target.value)}
                  placeholder="e.g. UTR / Receipt / Note"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeAdjustModal}
                  disabled={adjBusy}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjBusy || !adjAmount}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold text-white shadow transition-colors disabled:opacity-50 ${
                    adjType === "credit"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {adjBusy ? "Saving..." : `Confirm ${adjType === "credit" ? "Credit" : "Debit"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
