import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    api<any>("/customers")
      .then((d) => setCustomers(d.customers || []))
      .catch(e => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter((c) =>
    `${c.name} ${c.mobile}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5 max-w-[1100px]">
      {loadError && <p role="alert" className="text-red-600">{loadError}</p>}
      <div>
        <h1 className="font-display text-2xl font-extrabold text-[#0F172A]">
          Customers
        </h1>
        <p className="text-[#94A3B8] text-sm">
          Customers are derived dynamically from your real applications and recharge
          transactions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ["Total Customers", customers.length],
          [
            "Active",
            customers.filter((c) => c.status === "active").length,
          ],
          [
            "Total Spend",
            customers.reduce(
              (n, c) => n + Number(c.totalSpend || 0),
              0
            ),
          ],
        ].map(([l, v]) => (
          <div
            key={String(l)}
            className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm"
          >
            <p className="text-xs text-[#94A3B8] font-medium">{l}</p>
            <p className="font-mono text-2xl font-extrabold text-[#0F172A] mt-1">
              {l === "Total Spend"
                ? `₹${Number(v).toLocaleString("en-IN")}`
                : v}
            </p>
          </div>
        ))}
      </div>

      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name or mobile number..."
          className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] bg-white text-sm shadow-sm outline-none focus:border-[#1D6FE0] focus:ring-1 focus:ring-[#1D6FE0] transition"
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-[#94A3B8]">
            Loading customers...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  {[
                    "Customer",
                    "Mobile",
                    "Services",
                    "Total Spend",
                    "Last Transaction",
                    "Status",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs text-[#94A3B8] font-semibold uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F4F9]">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4 font-medium text-[#0F172A]">
                      {c.name}
                    </td>
                    <td className="px-5 py-4 font-mono text-[#64748B]">
                      {c.mobile}
                    </td>
                    <td className="px-5 py-4">{c.servicesUsed}</td>
                    <td className="px-5 py-4 font-mono font-semibold">
                      ₹{Number(c.totalSpend).toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-4 text-xs text-[#64748B]">
                      {c.lastTxn ? new Date(c.lastTxn).toLocaleString("en-IN") : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                          c.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelected(c)}
                        className="text-[#1D56D8] hover:text-[#1546B0] text-xs font-semibold"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-[#94A3B8]"
                    >
                      No customers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer details drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="font-display font-bold text-xl text-[#0F172A]">
                    {selected.name}
                  </h3>
                  <p className="text-xs text-[#94A3B8] font-mono mt-1">
                    {selected.mobile}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="bg-[#F8FAFC] rounded-xl p-3 text-center border border-[#E2E8F0]">
                  <b className="font-mono text-lg block">{selected.servicesUsed}</b>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">Services</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-3 text-center border border-[#E2E8F0]">
                  <b className="font-mono text-lg block">
                    ₹{Number(selected.totalSpend).toLocaleString("en-IN")}
                  </b>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">Total Spend</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-3 text-center border border-[#E2E8F0]">
                  <b className="font-mono text-xs block truncate mt-1">
                    {selected.lastTxn
                      ? new Date(selected.lastTxn).toLocaleDateString("en-IN")
                      : "—"}
                  </b>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">Last Txn</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Customer Status
                </h4>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Record Status</span>
                    <span className="font-semibold capitalize text-emerald-600">
                      {selected.status}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 mt-1">
                    <span className="text-slate-500">First Contact</span>
                    <span className="text-slate-700 font-medium">
                      {selected.createdAt
                        ? new Date(selected.createdAt).toLocaleDateString("en-IN")
                        : "Active"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelected(null)}
              className="w-full py-2.5 rounded-xl border border-[#CBD5E1] text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
