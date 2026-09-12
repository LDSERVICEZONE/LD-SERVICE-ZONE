import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { BarChart3 } from "lucide-react";

export default function AdminAnalytics() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<any>("/admin/transactions")
      .then((d) => setRows(d.transactions || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const revenue = rows.filter(x => ["completed", "success"].includes(x.status)).reduce((a, x) => a + Number(x.amount || 0), 0);
    const commission = rows.reduce((a, x) => a + Number(x.commission || 0), 0);
    const completed = rows.filter(
      (x) =>
        String(x.status).toLowerCase() === "completed" ||
        String(x.status).toLowerCase() === "success"
    ).length;
    return {
      revenue,
      commission,
      count: rows.length,
      success: rows.length ? Math.round((completed / rows.length) * 100) : 0,
    };
  }, [rows]);

  return (
    <div className="p-6 space-y-6 max-w-[1300px]">
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <div>
        <h1 className="font-display text-2xl font-extrabold">Analytics</h1>
        <p className="text-[#94A3B8] text-sm">
          Computed exclusively from recorded backend database transactions.
        </p>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 bg-white rounded-2xl animate-pulse border border-[#E2E8F0]"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              ["Transactions", stats.count],
              ["Recorded Revenue", `₹${stats.revenue.toLocaleString("en-IN")}`],
              ["Commission", `₹${stats.commission.toLocaleString("en-IN")}`],
              ["Success Rate", `${stats.success}%`],
            ].map(([k, v]) => (
              <div
                key={String(k)}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
              >
                <p className="text-xs text-[#94A3B8]">{k}</p>
                <b className="text-2xl font-display">{v}</b>
              </div>
            ))}
          </div>

          {!rows.length && (
            <div className="bg-white rounded-2xl border border-dashed border-[#CBD5E1] p-12 text-center">
              <BarChart3 className="mx-auto text-[#94A3B8]" size={36} />
              <h2 className="font-semibold mt-3 text-base">No analytics data yet</h2>
              <p className="text-sm text-[#94A3B8] mt-1">
                Analytics will populate as real platform transactions are recorded.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
