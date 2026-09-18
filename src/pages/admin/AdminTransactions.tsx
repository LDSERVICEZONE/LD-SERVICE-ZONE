import { useEffect, useMemo, useState } from "react";
import { api } from "@/shared/api/client";
import { FileDown, RefreshCw } from "lucide-react";
import { exportToCsv } from "@/shared/utils/csvExport";

export default function AdminTransactions() {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = () => {
    setLoading(true);
    api<any>("/admin/transactions")
      .then((d) => setRows(d.transactions || []))
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((x) =>
        JSON.stringify(x).toLowerCase().includes(search.toLowerCase())
      ),
    [rows, search]
  );

  const handleExportCsv = () => {
    if (!filtered.length) return;
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
    const exportRows = filtered.map((t) => [
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
      `admin-transactions-${new Date().toISOString().slice(0, 10)}`,
      headers,
      exportRows
    );
  };

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      {loadError && <p role="alert" className="text-red-600">{loadError}</p>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold">
            Transaction Management
          </h1>
          <p className="text-[#94A3B8] text-sm">
            Live records of service applications and recharges.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filtered.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
              title="Download CSV report of transactions"
            >
              <FileDown size={14} className="text-blue-600" />
              Export CSV
            </button>
          )}
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by transaction ID, user, service, or customer..."
        className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] bg-white text-sm outline-none focus:border-blue-500"
      />

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-[#94A3B8]">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr>
                {[
                  "ID",
                  "User",
                  "Service",
                  "Customer",
                  "Amount",
                  "Commission",
                  "Date",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs text-[#94A3B8]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-[#F1F4F9]">
                  <td className="px-5 py-4 font-mono text-xs text-blue-600">
                    {t.id}
                  </td>
                  <td className="px-5 py-4 text-xs text-[#94A3B8]">{t.userId}</td>
                  <td className="px-5 py-4 font-medium">{t.service}</td>
                  <td className="px-5 py-4">{t.customer || "—"}</td>
                  <td className="px-5 py-4 font-mono">
                    ₹{Number(t.amount || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-4 text-emerald-600 font-mono">
                    ₹{Number(t.commission || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-4 text-xs text-[#94A3B8]">
                    {new Date(t.date || t.createdAt || Date.now()).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 capitalize font-semibold text-xs">
                    {t.status}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-[#94A3B8]"
                  >
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
