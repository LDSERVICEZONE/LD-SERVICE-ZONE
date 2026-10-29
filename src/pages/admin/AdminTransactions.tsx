import { useEffect, useMemo, useState } from "react";
import { api } from "@/shared/api/client";
import {
  FileDown,
  RefreshCw,
  Clock,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  X,
  Wallet,
} from "lucide-react";
import { exportToCsv } from "@/shared/utils/csvExport";

export default function AdminTransactions() {
  const [activeTab, setActiveTab] = useState<"services" | "topups">("topups");

  // Service / Recharge Transactions State
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Wallet Top-Ups State
  const [topups, setTopups] = useState<any[]>([]);
  const [topupStatusFilter, setTopupStatusFilter] = useState<"all" | "pending" | "paid">("all");
  const [topupLoading, setTopupLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // Approval Modal State
  const [approvingOrder, setApprovingOrder] = useState<any | null>(null);
  const [approveUtr, setApproveUtr] = useState("");
  const [approveNote, setApproveNote] = useState("");

  const loadServiceTransactions = () => {
    setLoading(true);
    api<any>("/admin/transactions")
      .then((d) => setRows(d.transactions || []))
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  };

  const loadTopups = () => {
    setTopupLoading(true);
    api<any>("/admin/wallet/topups")
      .then((d) => setTopups(d.topups || []))
      .catch((e) => setLoadError(e.message))
      .finally(() => setTopupLoading(false));
  };

  useEffect(() => {
    loadServiceTransactions();
    loadTopups();
  }, []);

  const filteredServices = useMemo(
    () =>
      rows.filter((x) =>
        JSON.stringify(x).toLowerCase().includes(search.toLowerCase())
      ),
    [rows, search]
  );

  const filteredTopups = useMemo(() => {
    return topups.filter((t) => {
      const matchesSearch =
        search === "" ||
        JSON.stringify(t).toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (topupStatusFilter === "pending") return t.status !== "paid";
      if (topupStatusFilter === "paid") return t.status === "paid";
      return true;
    });
  }, [topups, search, topupStatusFilter]);

  const handleExportCsv = () => {
    if (activeTab === "services") {
      if (!filteredServices.length) return;
      const headers = [
        "Transaction ID",
        "Date",
        "User / Retailer ID",
        "Service",
        "Customer",
        "Amount (INR)",
        "Commission (INR)",
        "Status",
      ];
      const exportRows = filteredServices.map((t) => [
        t.id,
        t.date || t.createdAt ? new Date(t.date || t.createdAt).toLocaleString() : "",
        t.userId || "",
        t.service || "",
        t.customer || "",
        t.amount || 0,
        t.commission || 0,
        t.status || "",
      ]);
      exportToCsv(
        `admin-service-transactions-${new Date().toISOString().slice(0, 10)}`,
        headers,
        exportRows
      );
    } else {
      if (!filteredTopups.length) return;
      const headers = [
        "Order ID",
        "Retailer Name",
        "Mobile",
        "Amount (INR)",
        "Status",
        "Provider",
        "Customer UTR",
        "Date",
      ];
      const exportRows = filteredTopups.map((t) => [
        t.orderId,
        t.userName || "",
        t.userMobile || "",
        t.amount || 0,
        t.status || "",
        t.provider || t.mode || "",
        t.submittedUtr || t.utrNumber || "",
        t.createdAt ? new Date(t.createdAt).toLocaleString() : "",
      ]);
      exportToCsv(
        `admin-wallet-topups-${new Date().toISOString().slice(0, 10)}`,
        headers,
        exportRows
      );
    }
  };

  const handleCheckGateway = async (orderId: string) => {
    setActionBusy(orderId);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await api<any>("/admin/wallet/check-gateway", {
        method: "POST",
        body: JSON.stringify({ orderId }),
      });
      if (res.status === "paid") {
        setActionSuccess(res.message || "Payment verified and credited!");
      } else {
        setActionSuccess(res.message || "Gateway status checked.");
      }
      loadTopups();
    } catch (err: any) {
      setActionError(err?.message || "Failed to query gateway");
    } finally {
      setActionBusy(null);
    }
  };

  const openApproveModal = (topup: any) => {
    setApprovingOrder(topup);
    setApproveUtr(topup.submittedUtr || topup.utrNumber || "");
    setApproveNote("Manually verified by Super Admin");
    setActionError("");
    setActionSuccess("");
  };

  const submitApprove = async () => {
    if (!approvingOrder) return;
    setActionBusy(approvingOrder.orderId);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await api<any>("/admin/wallet/approve-topup", {
        method: "POST",
        body: JSON.stringify({
          orderId: approvingOrder.orderId,
          utrNumber: approveUtr.trim() || undefined,
          note: approveNote.trim() || undefined,
        }),
      });
      setActionSuccess(res.message || "Top-up approved and credited successfully!");
      setApprovingOrder(null);
      loadTopups();
    } catch (err: any) {
      setActionError(err?.message || "Failed to approve top-up");
    } finally {
      setActionBusy(null);
    }
  };

  const pendingCount = topups.filter((t) => t.status !== "paid").length;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      {loadError && (
        <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 p-4 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="rounded-2xl bg-red-50 border border-red-200 text-red-800 p-4 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#0F172A]">
            Transaction Management
          </h1>
          <p className="text-[#64748B] text-sm">
            Live records of service orders, recharges, and wallet top-up verifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {((activeTab === "services" && filteredServices.length > 0) ||
            (activeTab === "topups" && filteredTopups.length > 0)) && (
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
              title="Download CSV report"
            >
              <FileDown size={14} className="text-blue-600" />
              Export CSV
            </button>
          )}
          <button
            onClick={() => {
              if (activeTab === "services") loadServiceTransactions();
              else loadTopups();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("topups")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "topups"
              ? "bg-[#1D56D8] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Wallet Top-Up Orders</span>
          {pendingCount > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === "topups"
                  ? "bg-amber-400 text-slate-950"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {pendingCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("services")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "services"
              ? "bg-[#1D56D8] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>Service & Recharge Records</span>
          <span className="text-[11px] opacity-75">({rows.length})</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            activeTab === "topups"
              ? "Search by Order ID, Retailer Name, Mobile, or UTR..."
              : "Search by transaction ID, user, service, or customer..."
          }
          className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-xs outline-none focus:border-blue-500 shadow-2xs"
        />

        {activeTab === "topups" && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            {(["all", "pending", "paid"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setTopupStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  topupStatusFilter === status
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* WALLET TOP-UPS TAB                                       */}
      {/* ======================================================== */}
      {activeTab === "topups" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs">
          {topupLoading ? (
            <div className="p-12 text-center text-sm text-[#94A3B8]">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
              Loading wallet top-up records…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Order ID</th>
                    <th className="px-4 py-3 text-left">Retailer</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Mode / Gateway</th>
                    <th className="px-4 py-3 text-left">Customer UTR</th>
                    <th className="px-4 py-3 text-left">Date & Time</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Super Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTopups.map((t) => {
                    const isPaid = t.status === "paid";
                    return (
                      <tr key={t.orderId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-blue-600">
                          {t.orderId}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{t.userName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {t.userMobile || t.userEmail || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-extrabold text-sm text-slate-900">
                          ₹{Number(t.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 capitalize font-medium text-slate-600">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                            {t.provider || t.mode}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono">
                          {t.submittedUtr || t.utrNumber ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[11px]">
                              {t.submittedUtr || t.utrNumber}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                          {t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Credited
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                              <Clock className="w-3 h-3 text-amber-700" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {isPaid ? (
                            <span className="text-[11px] text-emerald-700 font-medium">
                              Paid ({t.paidAt ? new Date(t.paidAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Done"})
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleCheckGateway(t.orderId)}
                                disabled={actionBusy === t.orderId}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold transition"
                                title="Check status directly with AllAPI / Paytm gateway"
                              >
                                {actionBusy === t.orderId ? (
                                  <RefreshCw className="w-3 h-3 animate-spin inline" />
                                ) : (
                                  "Check Gateway"
                                )}
                              </button>
                              <button
                                onClick={() => openApproveModal(t)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition"
                                title="Instantly credit this retailer's wallet"
                              >
                                Approve & Credit
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredTopups.length && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No wallet top-up transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SERVICE & RECHARGE TRANSACTIONS TAB                      */}
      {/* ======================================================== */}
      {activeTab === "services" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-sm text-[#94A3B8]">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
              Loading service transactions…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    {["ID", "User", "Service", "Customer", "Amount", "Commission", "Date", "Status"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredServices.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs text-blue-600 font-semibold">
                        {t.id}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">{t.userId}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-900">{t.service}</td>
                      <td className="px-4 py-3.5">{t.customer || "—"}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                        ₹{Number(t.amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 text-emerald-600 font-mono font-semibold">
                        ₹{Number(t.commission || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                        {new Date(t.date || t.createdAt || Date.now()).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 capitalize font-semibold">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!filteredServices.length && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* APPROVE TOP-UP MODAL (Super Admin)                       */}
      {/* ======================================================== */}
      {approvingOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setApprovingOrder(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-[460px] p-6 shadow-2xl border border-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-slate-900">
                    Approve & Credit Wallet
                  </h3>
                  <p className="text-xs text-slate-500">Order: {approvingOrder.orderId}</p>
                </div>
              </div>
              <button
                onClick={() => setApprovingOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-emerald-800">Retailer:</span>
                <span className="font-bold text-emerald-950">{approvingOrder.userName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-emerald-800">Contact:</span>
                <span className="font-mono text-emerald-950">{approvingOrder.userMobile || approvingOrder.userEmail || "—"}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-1 border-t border-emerald-200/60">
                <span className="text-emerald-900 font-semibold">Amount to Credit:</span>
                <span className="font-mono font-extrabold text-lg text-emerald-700">
                  ₹{Number(approvingOrder.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  UPI UTR / Reference Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 429381928471"
                  value={approveUtr}
                  onChange={(e) => setApproveUtr(e.target.value.trim())}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 outline-none font-mono text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Copy from bank or UPI notification for reference.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Approval Note / Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified via BharatPe statement"
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setApprovingOrder(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitApprove}
                disabled={actionBusy === approvingOrder.orderId}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5"
              >
                {actionBusy === approvingOrder.orderId ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Crediting Wallet…</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirm & Credit ₹{approvingOrder.amount}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}