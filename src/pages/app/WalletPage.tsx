import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { api } from "@/shared/api/client";
import { useAuth, useWallet } from "@/features/session/AppContext";
import {
  FileDown,
  ShieldCheck,
  Clock,
  Copy,
  Check,
  QrCode,
  Sparkles,
  AlertCircle,
  RefreshCw,
  X,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Lock,
  ExternalLink,
} from "lucide-react";
import { exportToCsv } from "@/shared/utils/csvExport";
import ldLogo from "@/imports/ChatGPT_Image_Aug_26__2026_at_03_14_08_PM-1.png";

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

interface UpiOrderDetails {
  orderId: string;
  paymentId: string;
  amountRupees: number;
  amount: number;
  currency: string;
  upiString: string;
  merchantVpa: string;
  merchantName: string;
  expiresAt: number;
  qrDataUrl: string;
  paymentUrl?: string;
  upiIntent?: {
    bhim?: string;
    phonepe?: string;
    paytm?: string;
    gpay?: string;
  };
  provider?: string;
  isTestMode?: boolean;
}

export default function WalletPage() {
  const { user } = useAuth();
  const { wallet, refreshWallet, updateBalance } = useWallet();
  const [ledger, setLedger] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"upi_qr" | "gateway">("upi_qr");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Dynamic UPI QR Payment Screen State
  const [upiOrder, setUpiOrder] = useState<UpiOrderDetails | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes (300s)
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const pollIntervalRef = useRef<any>(null);

  const loadLedger = () =>
    api<any>("/wallet/ledger?limit=50")
      .then((l) => setLedger(l.ledger || []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    refreshWallet();
    loadLedger();

    const params = new URLSearchParams(window.location.search);
    const topupStatus = params.get("topup");
    const topupAmt = params.get("amount");
    if (topupStatus === "success") {
      setMessage(`Payment verified! ₹${topupAmt || ""} credited to your wallet successfully.`);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (topupStatus === "pending") {
      setError("Payment verification is processing with the bank. If money was debited, your balance will reflect shortly.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [refreshWallet]);

  // Handle countdown timer for UPI QR
  useEffect(() => {
    if (!upiOrder || paymentCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [upiOrder, paymentCompleted]);

  // Handle auto-polling for payment verification
  useEffect(() => {
    if (!upiOrder || paymentCompleted || timeLeft <= 0) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await api<any>(`/wallet/check-status?orderId=${encodeURIComponent(upiOrder.orderId)}`);
        if (res.status === "paid") {
          clearInterval(pollIntervalRef.current);
          handlePaymentSuccess(res.wallet?.balance);
        }
      } catch {
        // Silent poll error
      }
    }, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [upiOrder, paymentCompleted, timeLeft]);

  const handlePaymentSuccess = async (newBalance?: number) => {
    setPaymentCompleted(true);
    if (newBalance !== undefined) {
      updateBalance(newBalance);
    } else {
      await refreshWallet();
    }
    await loadLedger();
    setMessage(`₹${upiOrder?.amountRupees.toLocaleString("en-IN")} credited to your wallet successfully!`);
    setTimeout(() => {
      setUpiOrder(null);
      setPaymentCompleted(false);
      setAmount("");
    }, 3000);
  };

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
      String(l.type || "").toLowerCase() === "credit" ? l.amount : "",
      String(l.type || "").toLowerCase() === "debit" ? l.amount : "",
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

  async function initiatePayment() {
    setError("");
    setMessage("");
    if (total < 300) return setError("Minimum wallet deposit is ₹300");
    setBusy(true);

    try {
      // 1. Dynamic UPI QR Checkout Flow (AllAPI / BHIM / PhonePe / GPay / Paytm)
      if (paymentMethod === "upi_qr") {
        const order = await api<any>("/wallet/create-order", {
          method: "POST",
          body: JSON.stringify({ amount: Number(amount), mode: "upi_qr" }),
        });

        // Redirect directly to AllAPI hosted checkout page (Photo 2) which includes the live QR and 12-digit UTR input
        if (order.paymentUrl) {
          window.location.href = order.paymentUrl;
          return;
        }

        // Use high-resolution QR image from provider or generate locally from upiString
        let qrDataUrl = order.qrDataUrl;
        if (!qrDataUrl && order.upiString) {
          qrDataUrl = await QRCode.toDataURL(order.upiString, {
            width: 320,
            margin: 1,
            color: {
              dark: "#0F172A",
              light: "#FFFFFF",
            },
            errorCorrectionLevel: "H",
          });
        }

        const remainingSeconds = order.expiresAt
          ? Math.max(60, Math.min(1800, Math.floor((order.expiresAt - Date.now()) / 1000)))
          : 300;

        setUpiOrder({
          ...order,
          qrDataUrl,
        });
        setTimeLeft(remainingSeconds);
        setOpen(false);
        setBusy(false);
        return;
      }

      // 2. Gateway Flow (Razorpay / NetBanking / Cards fallback)
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
      if (!ok) throw new Error("Unable to load Payment Checkout");

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

  // Handle instant test-mode completion simulation
  async function simulateTestPayment() {
    if (!upiOrder) return;
    setVerifying(true);
    try {
      const verified = await api<any>("/wallet/verify", {
        method: "POST",
        body: JSON.stringify({
          mode: "upi_qr",
          orderId: upiOrder.orderId,
          transactionId: `TEST-UPI-${Date.now()}`,
        }),
      });
      handlePaymentSuccess(verified.wallet?.balance);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setVerifying(false);
    }
  }

  const copyVpaToClipboard = () => {
    if (!upiOrder) return;
    navigator.clipboard.writeText(upiOrder.merchantVpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#0F172A]">
            Wallet & Ledger
          </h1>
          <p className="text-[#64748B] text-sm">
            Live balance, instant Dynamic UPI QR top-ups, and transaction statement.
          </p>
        </div>
        <button
          onClick={() => {
            setError("");
            setMessage("");
            setOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D56D8] hover:bg-[#1849C0] text-white text-sm font-semibold transition-all shadow-md shadow-blue-600/20 active:scale-[0.98]"
        >
          <QrCode className="w-4 h-4" />
          <span>+ Add Money</span>
        </button>
      </div>

      {message && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 text-red-800 p-4 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Available Balance", wallet?.balance || 0, "text-blue-600 bg-blue-50/50"],
          ["Credit Limit", wallet?.creditLimit || 0, "text-slate-700 bg-slate-50/50"],
          ["Today's Inflow", wallet?.todayInflow || 0, "text-emerald-600 bg-emerald-50/50"],
          ["Today's Outflow", wallet?.todayOutflow || 0, "text-amber-600 bg-amber-50/50"],
        ].map(([label, val, style]) => (
          <div
            key={String(label)}
            className={`rounded-2xl border border-[#E2E8F0] p-5 bg-white shadow-xs ${style}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">{label}</p>
            <p className="font-mono-data font-extrabold text-2xl mt-1.5 text-slate-900">
              ₹{Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      {/* Passbook / Ledger Table */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-display font-bold text-lg text-slate-900">Wallet Passbook & Ledger</h2>
            <p className="text-xs text-slate-500">Official statement of all top-ups, service fees, and commissions.</p>
          </div>
          {ledger.length > 0 && (
            <button
              onClick={handleExportLedger}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
              title="Download passbook statement CSV"
            >
              <FileDown size={14} className="text-blue-600" />
              Download Statement (CSV)
            </button>
          )}
        </div>

        {ledger.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F1F4F9]">
                  <th className="pb-3 text-left text-xs text-[#94A3B8] font-semibold">Date & Time</th>
                  <th className="pb-3 text-left text-xs text-[#94A3B8] font-semibold">Description / Order ID</th>
                  <th className="pb-3 text-left text-xs text-[#94A3B8] font-semibold">Credit</th>
                  <th className="pb-3 text-left text-xs text-[#94A3B8] font-semibold">Debit</th>
                  <th className="pb-3 text-left text-xs text-[#94A3B8] font-semibold">Balance After</th>
                  <th className="pb-3 text-left text-xs text-[#94A3B8] font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F4F9]">
                {ledger.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 text-xs text-slate-600 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-slate-800">{l.description}</div>
                      <div className="text-[10px] text-[#94A3B8] font-mono">{l.reference}</div>
                    </td>
                    <td className="py-3 text-emerald-600 font-mono font-semibold whitespace-nowrap">
                      {String(l.type || "").toLowerCase() === "credit" ? `+₹${Number(l.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="py-3 text-red-500 font-mono font-semibold whitespace-nowrap">
                      {String(l.type || "").toLowerCase() === "debit" ? `-₹${Number(l.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="py-3 font-mono-data font-semibold text-slate-900 whitespace-nowrap">
                      ₹{Number(l.balanceAfter || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        String(l.status || "").toLowerCase() === "success" || String(l.status || "").toLowerCase() === "paid"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-14 text-center text-sm text-[#94A3B8]">
            <QrCode className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            No wallet transactions recorded yet. Click <b>+ Add Money</b> to fund your account.
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* ADD MONEY SELECTION MODAL                                */}
      {/* ======================================================== */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  ₹
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-900">Add Wallet Balance</h3>
                  <p className="text-xs text-slate-400">Instant funding with 0% fee (Min ₹300)</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Enter Amount (Minimum ₹300)
            </label>
            <div className="relative mt-2 mb-3">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-xl font-bold text-slate-400">
                ₹
              </span>
              <input
                autoFocus
                type="number"
                min="300"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="300"
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-xl font-bold text-slate-900 outline-none transition-all"
              />
            </div>

            {/* Quick preset chips */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              {[300, 500, 1000, 2000].map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => setAmount(String(x))}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    amount === String(x)
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  ₹{x}
                </button>
              ))}
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 mb-5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Select Payment Mode
              </label>

              <div
                onClick={() => setPaymentMethod("upi_qr")}
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                  paymentMethod === "upi_qr"
                    ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">Instant Dynamic UPI QR</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        0% Fee
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">PhonePe, Google Pay, Paytm, BHIM, CRED</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  paymentMethod === "upi_qr" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                }`}>
                  {paymentMethod === "upi_qr" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>

              <div
                onClick={() => setPaymentMethod("gateway")}
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                  paymentMethod === "gateway"
                    ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900">Cards / NetBanking</span>
                    <p className="text-[11px] text-slate-500">Debit card, Credit card, Corporate NetBanking</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  paymentMethod === "gateway" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                }`}>
                  {paymentMethod === "gateway" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
            </div>

            {/* Total breakdown */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 flex justify-between items-center text-sm mb-4">
              <span className="text-slate-600 font-medium">Total payable</span>
              <span className="text-slate-900 font-mono font-extrabold text-base">
                ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              onClick={initiatePayment}
              disabled={busy || total < 1}
              className="w-full py-3.5 rounded-2xl bg-[#1D56D8] hover:bg-[#1849C0] text-white font-bold text-sm shadow-lg shadow-blue-600/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Secure Order…</span>
                </>
              ) : (
                <>
                  <span>Continue to Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BRANDED DYNAMIC UPI QR PAYMENT SCREEN                    */}
      {/* (Mirrors pg.brbusinessmart.in reference photo)           */}
      {/* ======================================================== */}
      {upiOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => {
            if (!paymentCompleted) {
              if (confirm("Are you sure you want to cancel this payment session?")) {
                setUpiOrder(null);
              }
            }
          }}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-[420px] shadow-2xl border border-slate-100 overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: LD SERVICE ZONE Branded Banner with Verified Badge */}
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white p-5 text-center relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <img
                    src={ldLogo}
                    alt="LD Logo"
                    className="w-8 h-8 rounded-full border border-white/20 object-cover shadow-sm"
                  />
                  <span className="font-display font-extrabold text-sm sm:text-base tracking-tight text-white">
                    LD SERVICE ZONE
                  </span>
                </div>
                {/* Green Verified Pill Badge */}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold tracking-wide">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Verified
                </span>
              </div>

              {/* Amount Display */}
              <div className="mt-3">
                <p className="text-slate-400 text-[11px] uppercase tracking-wider font-medium">Amount to Pay</p>
                <div className="font-mono text-3xl font-extrabold text-white tracking-tight mt-0.5">
                  ₹{upiOrder.amountRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center justify-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                  <span>Order: {upiOrder.orderId}</span>
                </div>
              </div>
            </div>

            {/* QR Code and Payment Body */}
            <div className="p-5 sm:p-6 text-center space-y-4">
              {paymentCompleted ? (
                /* Payment Success View */
                <div className="py-8 space-y-3 animate-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h4 className="font-display text-xl font-extrabold text-slate-900">
                    Payment Successful!
                  </h4>
                  <p className="text-xs text-slate-500">
                    ₹{upiOrder.amountRupees} has been credited to your LD Service Zone wallet.
                  </p>
                  <div className="p-3 bg-emerald-50 rounded-xl text-emerald-800 text-xs font-mono font-medium">
                    Transaction ID: {upiOrder.orderId}
                  </div>
                </div>
              ) : (
                /* Active QR Code View */
                <>
                  {/* High Quality Centered Dynamic QR Box */}
                  <div className="relative inline-block p-3.5 bg-white rounded-2xl border-2 border-slate-100 shadow-md">
                    <img
                      src={upiOrder.qrDataUrl}
                      alt="Dynamic UPI QR"
                      className="w-56 h-56 mx-auto rounded-lg object-contain"
                    />

                    {/* QR Expired Overlay if timer reaches 0 */}
                    {timeLeft <= 0 && (
                      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-4">
                        <AlertCircle className="w-10 h-10 text-red-400 mb-2" />
                        <p className="font-bold text-sm">QR Code Expired</p>
                        <p className="text-[11px] text-slate-300 mt-1 mb-3">Please generate a new QR session</p>
                        <button
                          onClick={() => {
                            setUpiOrder(null);
                            setOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                        >
                          Retry Top-Up
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Scan with Any App Header */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                      Scan with Any UPI App
                    </h4>
                    {/* UPI App Icons Row (Interactive Deep Links) */}
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <a
                        href={upiOrder.upiIntent?.phonepe || upiOrder.paymentUrl || upiOrder.upiString}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 group transition hover:scale-105"
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#5f259f] text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:shadow-md">
                          Pe
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">PhonePe</span>
                      </a>
                      <a
                        href={upiOrder.upiIntent?.gpay || upiOrder.paymentUrl || upiOrder.upiString}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 group transition hover:scale-105"
                      >
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shadow-xs group-hover:shadow-md">
                          <span className="text-blue-500">G</span>
                          <span className="text-red-500">P</span>
                          <span className="text-amber-500">a</span>
                          <span className="text-green-500">y</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">GPay</span>
                      </a>
                      <a
                        href={upiOrder.upiIntent?.paytm || upiOrder.paymentUrl || upiOrder.upiString}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 group transition hover:scale-105"
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#002e6e] text-[#00b9f5] flex items-center justify-center font-black text-xs shadow-xs group-hover:shadow-md">
                          paytm
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">Paytm</span>
                      </a>
                      <a
                        href={upiOrder.upiIntent?.bhim || upiOrder.paymentUrl || upiOrder.upiString}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 group transition hover:scale-105"
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#0e3b68] text-white flex items-center justify-center font-bold text-[10px] shadow-xs group-hover:shadow-md">
                          BHIM
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">BHIM</span>
                      </a>
                      <a
                        href={upiOrder.paymentUrl || upiOrder.upiString}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 group transition hover:scale-105"
                      >
                        <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-serif text-xs font-bold shadow-xs group-hover:shadow-md">
                          C
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">CRED</span>
                      </a>
                    </div>
                  </div>


                  {/* Countdown Timer with Pulsing Status */}
                  <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                    </span>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-600 font-medium">Session valid for:</span>
                    <span className={`font-mono font-bold ${timeLeft < 60 ? "text-red-600" : "text-slate-900"}`}>
                      {formattedTime}
                    </span>
                  </div>

                  {/* VPA Display with Copy Button */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                    <div className="text-left truncate">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Merchant UPI ID</span>
                      <span className="font-mono text-slate-700 font-semibold text-[11px] truncate block">
                        {upiOrder.merchantVpa}
                      </span>
                    </div>
                    <button
                      onClick={copyVpaToClipboard}
                      className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold hover:bg-slate-100 transition"
                    >
                      {copiedVpa ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                      <span>{copiedVpa ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  {/* Test Mode Simulation Button (Only shown in sandbox/test mode) */}
                  {Boolean(upiOrder.isTestMode) && (
                    <div className="pt-2">
                      <button
                        onClick={simulateTestPayment}
                        disabled={verifying || timeLeft <= 0}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                      >
                        {verifying ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying Test Payment…</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>Simulate Successful Payment (Test Mode)</span>
                          </>
                        )}
                      </button>
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        Click to instantly test wallet credit and passbook recording in sandbox mode.
                      </p>
                    </div>
                  )}

                  {/* Cancel Button */}
                  <button
                    onClick={() => setUpiOrder(null)}
                    className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition"
                  >
                    Cancel Transaction
                  </button>
                </>
              )}
            </div>

            {/* Footer Trust Bar */}
            <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>256-bit Encrypted · Instant NPCI UPI Settlement</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
