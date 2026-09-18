import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";
import { useAuth, useWallet } from "@/features/session/AppContext";
import { FileDown } from "lucide-react";
import { exportToCsv } from "@/shared/utils/csvExport";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function WalletPage() {
  const { user } = useAuth();
  const { wallet, refreshWallet, updateBalance } = useWallet();
  const [ledger, setLedger] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadLedger = () =>
    api<any>("/wallet/ledger?limit=50")
      .then((l) => setLedger(l.ledger || []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    refreshWallet();
    loadLedger();
  }, [refreshWallet]);

  const handleExportLedger = () => {
    if (!ledger.length) return;
    const headers = [
      "Date",
      "Transaction ID",
      "Description",
      "Reference",
      "Credit (INR)",
      "Debit (INR)",
      "Balance After (INR)",
      "Status",
    ];
    const rows = ledger.map((l) => [
      new Date(l.createdAt).toLocaleString(),
      l.id || "",
      l.description || "",
      l.reference || "",
      l.type === "credit" ? l.amount : "",
      l.type === "debit" ? l.amount : "",
      l.balanceAfter || 0,
      l.status || "",
    ]);
    exportToCsv(
      `wallet-passbook-${user?.username || user?.name || "retailer"}-${new Date().toISOString().slice(0, 10)}`,
      headers,
      rows
    );
  };

  const fee = 0;
  const total = Number(amount || 0) + fee;

  async function addMoney() {
    setError("");
    setMessage("");
    if (total < 1) return setError("Enter an amount of at least ₹1");
    setBusy(true);

    try {
      const order = await api<any>("/wallet/create-order", {
        method: "POST",
        body: JSON.stringify({ amount: Number(amount) }),
      });

      if (order.mode === "demo") {
        const verified = await api<any>("/wallet/verify", {
          method: "POST",
          body: JSON.stringify({ mode: "demo", razorpay_order_id: order.orderId }),
        });
        if (verified.wallet?.balance !== undefined) {
          updateBalance(verified.wallet.balance);
        } else {
          await refreshWallet();
        }
        setMessage(`₹${Number(amount).toLocaleString("en-IN")} added successfully (Demo Mode).`);
        setOpen(false);
        setAmount("");
        await loadLedger();
        setBusy(false);
        return;
      }

      const ok = await loadRazorpay();
      if (!ok) throw new Error("Unable to load Razorpay Checkout");

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "LD SERVICE ZONE",
        description: `Wallet Load - ${user?.username ? `ID: ${user.username}` : user?.name || "Retailer"}`,
        order_id: order.orderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.mobile || "",
        },
        theme: {
          color: "#1D56D8",
        },
        handler: async (response: any) => {
          try {
            const verified = await api<any>("/wallet/verify", {
              method: "POST",
              body: JSON.stringify({ ...response }),
            });
            if (verified.wallet?.balance !== undefined) {
              updateBalance(verified.wallet.balance);
            } else {
              await refreshWallet();
            }
            setMessage(`₹${Number(amount).toLocaleString("en-IN")} added successfully.`);
            setOpen(false);
            setAmount("");
            await loadLedger();
          } catch (e: any) {
            setError(e.message);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });

      rzp.on("payment.failed", (r: any) =>
        setError(r?.error?.description || "Payment failed")
      );
      rzp.open();
      setBusy(false);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#0F172A]">
            Wallet
          </h1>
          <p className="text-[#94A3B8] text-sm">
            Live balance and ledger from the backend.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#1D56D8] hover:bg-[#1849C0] text-white text-sm font-semibold transition-colors"
        >
          + Add Money
        </button>
      </div>

      {message && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Available Balance", wallet?.balance || 0],
          ["Credit Limit", wallet?.creditLimit || 0],
          ["Today's Inflow", wallet?.todayInflow || 0],
          ["Today's Outflow", wallet?.todayOutflow || 0],
        ].map(([l, v]) => (
          <div
            key={String(l)}
            className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
          >
            <p className="text-xs text-[#94A3B8]">{l}</p>
            <p className="font-mono-data font-extrabold text-2xl mt-1">
              ₹{Number(v).toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display font-bold text-lg text-slate-900">Wallet Passbook & Ledger</h2>
            <p className="text-xs text-slate-400">Statement of all top-ups, deductions, and commissions.</p>
          </div>
          {ledger.length > 0 && (
            <button
              onClick={handleExportLedger}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
              title="Download passbook statement CSV"
            >
              <FileDown size={14} className="text-blue-600" />
              Download Statement
            </button>
          )}
        </div>
        {ledger.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F1F4F9]">
                  <th className="pb-3 text-left text-xs text-[#94A3B8]">Date</th>
                  <th className="pb-3 text-left text-xs text-[#94A3B8]">
                    Reference
                  </th>
                  <th className="pb-3 text-left text-xs text-[#94A3B8]">Credit</th>
                  <th className="pb-3 text-left text-xs text-[#94A3B8]">Debit</th>
                  <th className="pb-3 text-left text-xs text-[#94A3B8]">
                    Balance
                  </th>
                  <th className="pb-3 text-left text-xs text-[#94A3B8]">Status</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id} className="border-t border-[#F1F4F9]">
                    <td className="py-3 text-xs">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3">
                      {l.description}
                      <div className="text-[10px] text-[#94A3B8] font-mono">
                        {l.reference}
                      </div>
                    </td>
                    <td className="py-3 text-emerald-600 font-mono font-medium">
                      {l.type === "credit"
                        ? `+₹${Number(l.amount).toLocaleString("en-IN")}`
                        : "—"}
                    </td>
                    <td className="py-3 text-red-500 font-mono font-medium">
                      {l.type === "debit"
                        ? `-₹${Number(l.amount).toLocaleString("en-IN")}`
                        : "—"}
                    </td>
                    <td className="py-3 font-mono-data">
                      ₹{Number(l.balanceAfter || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 capitalize text-xs font-semibold">
                      {l.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-14 text-center text-sm text-[#94A3B8]">
            No wallet transactions yet.
          </div>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between mb-5">
              <h3 className="font-display font-bold text-lg">Add Money</h3>
              <button onClick={() => setOpen(false)} disabled={busy}>
                ✕
              </button>
            </div>
            <label className="text-xs font-semibold text-[#64748B]">AMOUNT</label>
            <input
              autoFocus
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full mt-2 px-4 py-3 rounded-xl border border-[#E2E8F0]"
            />
            <div className="flex gap-2 mt-2">
              {[100, 500, 1000, 2000, 5000].map((x) => (
                <button
                  key={x}
                  onClick={() => setAmount(String(x))}
                  className="flex-1 py-2 rounded-lg bg-[#F1F4F9] hover:bg-[#E2E8F0] text-xs font-semibold transition-colors"
                >
                  ₹{x}
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-[#F8FAFC] p-4 flex justify-between">
              <span>Total payable</span>
              <b>₹{total.toLocaleString("en-IN")}</b>
            </div>
            <p className="text-xs text-[#94A3B8] mt-3">
              Payment is processed through Razorpay. The wallet is credited only
              after server-side signature verification.
            </p>
            <button
              onClick={addMoney}
              disabled={busy || total < 1}
              className="w-full mt-5 py-3 rounded-xl bg-[#1D56D8] hover:bg-[#1849C0] text-white font-semibold disabled:opacity-50 transition-colors"
            >
              {busy ? "Processing…" : "Continue to Razorpay"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
