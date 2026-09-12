import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api } from "../../lib/api";

const COLORS = ["#1D56D8", "#4F46E5", "#06B6D4", "#10B981", "#F59E0B"];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"7d" | "30d">("7d");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setLoading(true);
    api<any>(`/analytics/summary?range=${period}`)
      .then(setData)
      .catch(e => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [period]);

  const k = data?.kpis || {};
  const trend = data?.trend || [];
  const services = data?.servicePerformance || [];
  const pie = services.map((s: any) => ({ name: s.name, value: s.revenue }));

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {loadError && <p role="alert" className="text-red-600">{loadError}</p>}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#0F172A]">
            Analytics
          </h1>
          <p className="text-[#94A3B8] text-sm">
            Computed dynamically from your stored transactions and applications.
          </p>
        </div>
        <div className="flex rounded-xl border border-[#E2E8F0] overflow-hidden text-xs bg-white shadow-sm">
          {(["7d", "30d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 font-medium transition ${
                period === p
                  ? "bg-[#07111F] text-white font-semibold"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse bg-white rounded-2xl border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] text-sm">
          Loading analytics...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              ["Gross Revenue", k.todaySales],
              ["Commission Earned", k.todayEarnings],
              ["Success Rate", `${k.successRate || 0}%`],
              ["Total Transactions", k.transactions || 0],
              [
                "Avg Transaction",
                k.transactions
                  ? Math.round((k.todaySales || 0) / k.transactions)
                  : 0,
              ],
              ["Active Customers", k.customers || 0],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm"
              >
                <p className="text-[#94A3B8] text-xs uppercase tracking-wider font-medium">
                  {label}
                </p>
                <p className="font-mono font-extrabold text-xl text-[#0F172A] mt-1.5">
                  {typeof value === "number" && label !== "Success Rate"
                    ? `₹${value.toLocaleString("en-IN")}`
                    : value}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <h2 className="font-display font-bold text-lg text-[#0F172A] mb-4">
              Revenue & Commission Trend
            </h2>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={trend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#F1F4F9"
                    vertical={false}
                  />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#1D56D8"
                    fill="#1D56D8"
                    fillOpacity={0.08}
                  />
                  <Area
                    type="monotone"
                    dataKey="commission"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.06}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-12 text-center text-sm text-[#94A3B8]">
                No transaction trend data available yet.
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
              <h2 className="font-display font-bold text-lg text-[#0F172A] mb-4">
                Daily Transactions
              </h2>
              {trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={trend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#F1F4F9"
                      vertical={false}
                    />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar
                      dataKey="transactions"
                      fill="#4F46E5"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-12 text-center text-sm text-[#94A3B8]">
                  No transactions yet.
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
              <h2 className="font-display font-bold text-lg text-[#0F172A] mb-4">
                Revenue by Service
              </h2>
              {pie.length > 0 ? (
                <div className="flex items-center">
                  <ResponsiveContainer width="50%" height={190}>
                    <PieChart>
                      <Pie
                        data={pie}
                        dataKey="value"
                        innerRadius={45}
                        outerRadius={75}
                      >
                        {pie.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2 text-xs">
                    {pie.map((x: any, i: number) => (
                      <div
                        key={x.name}
                        className="flex justify-between items-center gap-2"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                          <span className="truncate">{x.name}</span>
                        </span>
                        <b className="font-mono">₹{x.value.toLocaleString("en-IN")}</b>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-[#94A3B8]">
                  No service revenue recorded yet.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-display font-bold text-lg text-[#0F172A]">
                  Service Performance
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  Total earned: ₹
                  {Number(k.totalEarned || 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-right text-xs text-[#94A3B8]">
                This month commission
                <br />
                <b className="text-emerald-600 font-mono text-sm">
                  ₹{Number(k.monthCommission || 0).toLocaleString("en-IN")}
                </b>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#F1F4F9]">
                    <th className="pb-3 text-left text-xs text-[#94A3B8]">
                      Service
                    </th>
                    <th className="pb-3 text-left text-xs text-[#94A3B8]">
                      Transactions
                    </th>
                    <th className="pb-3 text-left text-xs text-[#94A3B8]">
                      Revenue
                    </th>
                    <th className="pb-3 text-left text-xs text-[#94A3B8]">
                      Commission
                    </th>
                    <th className="pb-3 text-left text-xs text-[#94A3B8]">
                      Success
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s: any) => (
                    <tr key={s.name} className="border-t border-[#F1F4F9]">
                      <td className="py-3 font-medium text-[#0F172A]">{s.name}</td>
                      <td className="py-3">{s.transactions}</td>
                      <td className="py-3 font-mono">
                        ₹{s.revenue.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 text-emerald-600 font-semibold font-mono">
                        ₹{s.commission.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3">{s.successRate}%</td>
                    </tr>
                  ))}
                  {!services.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-10 text-center text-[#94A3B8]"
                      >
                        No transactions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
