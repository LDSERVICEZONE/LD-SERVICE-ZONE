import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api<any>("/admin/stats")
      .then(setStats)
      .catch(e => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const s = stats || {};

  return (
    <div className="p-6 space-y-6 max-w-[1300px]">
      {loadError && <p role="alert" className="text-red-600">{loadError}</p>}
      <div>
        <h1 className="font-display text-2xl font-extrabold">Admin Overview</h1>
        <p className="text-[#94A3B8] text-sm">
          Live platform totals from the backend.
        </p>
      </div>

      {loading ? (
        <div className="h-28 bg-white rounded-2xl animate-pulse" />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ["Users", s.users || 0],
              ["Retailers", s.retailers || 0],
              ["Applications", s.applications || 0],
              [
                "Recorded Revenue",
                `₹${Number(s.revenue || 0).toLocaleString("en-IN")}`,
              ],
            ].map(([l, v]) => (
              <div
                key={String(l)}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
              >
                <p className="text-xs text-[#94A3B8]">{l}</p>
                <b className="font-mono-data text-2xl">{v}</b>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
            <h2 className="font-display font-bold mb-4">Transaction Status</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={Object.entries(s.statusCounts || {}).map(
                  ([status, count]) => ({ status, count })
                )}
              >
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1D56D8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
