import { useEffect, useMemo, useState } from "react";
import { api } from "@/shared/api/client";
import { useWallet } from "@/features/session/AppContext";

const CIRCLES = [
  "Andhra Pradesh & Telangana",
  "Assam",
  "Bihar & Jharkhand",
  "Chennai",
  "Delhi NCR",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Karnataka",
  "Kerala",
  "Kolkata",
  "Madhya Pradesh & Chhattisgarh",
  "Maharashtra & Goa",
  "Mumbai",
  "North East",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Uttar Pradesh (East)",
  "Uttar Pradesh (West) & Uttarakhand",
  "West Bengal",
];

export default function RechargePage() {
  const { updateBalance } = useWallet();
  const [type, setType] = useState<"MOBILE" | "DTH">("MOBILE");
  const [mobile, setMobile] = useState("");
  const [circle, setCircle] = useState(CIRCLES[0]);
  const [providers, setProviders] = useState<any[]>([]);
  const [providerId, setProviderId] = useState("");
  const [operator, setOperator] = useState("");
  const [amount, setAmount] = useState("");
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lastTx, setLastTx] = useState<any>(null);

  useEffect(() => {
    api<any>("/recharge/providers")
      .then((d) => {
        const ps = (d.data?.services || []).flatMap((s: any) =>
          (s.providers || []).map((p: any) => ({
            ...p,
            service: s.service,
            code: p.code || s.code,
          }))
        );
        setProviders(ps);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!operator) return;
    api<any>(
      `/recharge/plans?operator=${encodeURIComponent(
        operator
      )}&circle=${encodeURIComponent(circle)}`
    )
      .then((d) => setPlans(d.data?.plans || d.plans || []))
      .catch(() => setPlans([]));
  }, [operator, circle]);

  const available = useMemo(
    () =>
      providers.filter((p) =>
        type === "DTH"
          ? String(p.service || "").toLowerCase().includes("dth") ||
            String(p.code || "").toLowerCase().includes("dth")
          : !String(p.service || "").toLowerCase().includes("dth")
      ),
    [providers, type]
  );

  async function detect() {
    setError("");
    setMessage("");
    const number = mobile.replace(/\D/g, "");
    if (!/^\d{10}$/.test(number))
      return setError("Enter a valid 10-digit mobile number");
    setDetecting(true);
    try {
      const d = await api<any>("/recharge/detect", {
        method: "POST",
        body: JSON.stringify({ mobile: number }),
      });
      const det = d.detected;
      setCircle(det.circle);
      const p = available.find(
        (x) => String(x.provider_id) === String(d.provider?.provider_id)
      );
      if (p) {
        setProviderId(String(p.provider_id));
        setOperator(p.name || p.code || det.operator);
        setMessage(
          `Detected ${p.name || det.operator} · ${det.circle}. Please verify before recharging.`
        );
      } else {
        setOperator(det.operator);
        setMessage(
          `Detected ${det.operator} · ${det.circle}. Please select the matching Pay2All operator if it was not selected automatically.`
        );
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDetecting(false);
    }
  }

  async function recharge() {
    setError("");
    setMessage("");
    const amt = Number(amount);
    if (!/^\d{10,18}$/.test(mobile.replace(/\D/g, "")))
      return setError("Enter a valid mobile/DTH number");
    if (!providerId) return setError("Select an operator");
    if (!amt || amt <= 0) return setError("Enter a valid recharge amount");
    setBusy(true);

    try {
      const d = await api<any>("/recharge", {
        method: "POST",
        body: JSON.stringify({
          mobile,
          operator,
          circle,
          providerId: Number(providerId),
          amount: amt,
          type,
        }),
      });
      if (d.wallet?.balance !== undefined) {
        updateBalance(d.wallet.balance);
      }
      setMessage(d.provider?.message || `Recharge status: ${d.transaction.status}`);
      setLastTx(d.transaction);
      setAmount("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1000px]">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-[#0F172A]">
          Recharge
        </h1>
        <p className="text-[#94A3B8] text-sm">
          Live Pay2All operator catalogue with real-time balance updates.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm">
          {message}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-5">
        <div className="flex gap-2">
          {(["MOBILE", "DTH"] as const).map((x) => (
            <button
              key={x}
              onClick={() => {
                setType(x);
                setProviderId("");
                setOperator("");
              }}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                type === x
                  ? "bg-[#1D56D8] text-white"
                  : "bg-[#F1F4F9] text-[#475569] hover:bg-[#E2E8F0]"
              }`}
            >
              {x === "MOBILE" ? "Mobile Recharge" : "DTH Recharge"}
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs font-semibold text-[#64748B]">
            {type === "MOBILE" ? "MOBILE NUMBER" : "DTH / VC NUMBER"}
          </label>
          <div className="flex gap-2 mt-1.5">
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-blue-500"
              placeholder={
                type === "MOBILE" ? "10-digit mobile" : "Subscriber / VC number"
              }
            />
            <button
              onClick={detect}
              disabled={detecting || type !== "MOBILE"}
              className="px-4 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              {detecting ? "Detecting…" : "Auto-detect"}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#64748B]">
              CIRCLE / STATE
            </label>
            <select
              value={circle}
              onChange={(e) => setCircle(e.target.value)}
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-[#E2E8F0] bg-white text-sm outline-none focus:border-blue-500"
            >
              {CIRCLES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#64748B]">
              OPERATOR
            </label>
            <select
              value={providerId}
              onChange={(e) => {
                setProviderId(e.target.value);
                const p = available.find(
                  (x) => String(x.provider_id) === e.target.value
                );
                setOperator(p?.name || p?.code || "");
              }}
              disabled={loading || !available.length}
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-[#E2E8F0] bg-white text-sm outline-none focus:border-blue-500"
            >
              <option value="">
                {loading
                  ? "Loading live operators…"
                  : available.length
                  ? "Select operator"
                  : "No active operators returned by Pay2All"}
              </option>
              {available.map((p) => (
                <option
                  key={`${p.provider_id}-${p.code}`}
                  value={p.provider_id}
                >
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-[#64748B]">
            AMOUNT (₹)
          </label>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full mt-1.5 px-4 py-3 rounded-xl border border-[#E2E8F0] text-sm outline-none focus:border-blue-500"
            placeholder="Enter recharge amount"
          />
        </div>

        {operator && (
          <div className="rounded-xl border border-dashed border-[#CBD5E1] p-4">
            <div className="flex justify-between">
              <h3 className="font-semibold text-sm">Live plans</h3>
              <span className="text-xs text-[#94A3B8]">
                {operator} · {circle}
              </span>
            </div>
            {plans.length ? (
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                {plans.map((p: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setAmount(String(p.amount || p.price || ""))}
                    className="text-left p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-blue-400 transition-colors"
                  >
                    <b>₹{p.amount || p.price}</b>
                    <p className="text-xs text-[#64748B]">
                      {p.validity || p.description || "Live provider plan"}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#94A3B8] mt-2">
                Plans unavailable from the configured Pay2All API. Enter an amount
                manually; no plan data is fabricated.
              </p>
            )}
          </div>
        )}

        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
          <b>Recharge commission:</b> Pay2All commission is split 50/50 — half is
          credited to your wallet after a successful recharge, and half is recorded
          for admin.
        </div>

        {lastTx && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800">
            <b>Last recharge:</b> {lastTx.status} · Provider commission ₹
            {Number(lastTx.providerCommission || 0).toFixed(2)} · Your 50% ₹
            {Number(lastTx.userCommission || 0).toFixed(2)}
          </div>
        )}

        <button
          onClick={recharge}
          disabled={busy || !providerId}
          className="w-full py-3 rounded-xl bg-[#1D56D8] hover:bg-[#1849C0] text-white font-semibold disabled:opacity-50 transition-colors"
        >
          {busy ? "Processing with Pay2All…" : "Recharge Now"}
        </button>

        <p className="text-xs text-[#94A3B8]">
          Auto-detect checks the mobile number server-side and matches the result
          to your live Pay2All provider catalogue. Always verify the detected
          operator/circle before confirming recharge.
        </p>
        <p className="text-xs text-[#94A3B8]">
          Recharge requests are sent server-side using the Pay2All secret key.
          Final pending transactions are reconciled through the Pay2All webhook.
        </p>
      </div>
    </div>
  );
}
