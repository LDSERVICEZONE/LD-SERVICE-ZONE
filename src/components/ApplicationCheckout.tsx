import { useState, useEffect, useRef } from "react";
import { api } from "@/shared/api/client";
import { useAuth, useWallet } from "@/features/session/AppContext";
import {
  Wallet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  QrCode,
  Smartphone,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import QRCode from "qrcode";

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
  upiString: string;
  qrDataUrl?: string;
  merchantVpa?: string;
  merchantName?: string;
  expiresAt?: number;
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

export default function ApplicationCheckout({
  application,
  onComplete,
}: {
  application: any;
  onComplete: () => void;
}) {
  const { user } = useAuth();
  const { wallet, refreshWallet, updateBalance } = useWallet();
  const [files, setFiles] = useState<Record<string, File>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Top-up state
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpBusy, setTopUpBusy] = useState(false);
  const [topUpError, setTopUpError] = useState("");
  const [topUpSuccess, setTopUpSuccess] = useState("");
  const [topUpMethod, setTopUpMethod] = useState<"upi_qr" | "gateway">("upi_qr");

  // Dynamic UPI QR Modal state
  const [upiOrder, setUpiOrder] = useState<UpiOrderDetails | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [topUpUtr, setTopUpUtr] = useState("");
  const [topUpUtrLoading, setTopUpUtrLoading] = useState(false);
  const [topUpUtrError, setTopUpUtrError] = useState("");
  const pollIntervalRef = useRef<any>(null);

  const price = Number(application.customerPrice || 0);
  const balance = Number(wallet?.balance || 0);
  const shortfall = Math.max(0, Number((price - balance).toFixed(2)));
  const hasSufficientWallet = balance >= price;

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  useEffect(() => {
    if (!hasSufficientWallet && shortfall > 0) {
      setTopUpAmount(String(Math.max(10, Math.ceil(shortfall))));
    }
  }, [hasSufficientWallet, shortfall]);

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
        const res = await api<any>(
          `/wallet/check-status?orderId=${encodeURIComponent(upiOrder.orderId)}`
        );
        if (res.status === "paid") {
          clearInterval(pollIntervalRef.current);
          handleUpiPaymentSuccess(res.wallet?.balance);
        }
      } catch {
        // Silent poll error
      }
    }, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [upiOrder, paymentCompleted, timeLeft]);

  const handleUpiPaymentSuccess = async (newBalance?: number) => {
    setPaymentCompleted(true);
    if (newBalance !== undefined) {
      updateBalance(newBalance);
    } else {
      await refreshWallet();
    }
    setTopUpSuccess(
      `₹${upiOrder?.amountRupees.toLocaleString("en-IN")} credited to your wallet successfully!`
    );
    setTimeout(() => {
      setUpiOrder(null);
      setPaymentCompleted(false);
      setShowTopUp(false);
      setTopUpError("");
      setTopUpUtr("");
      setTopUpUtrError("");
    }, 2500);
  };

  async function handleVerifyTopUpUtr() {
    if (!upiOrder) return;
    const clean = topUpUtr.trim();
    if (!clean || clean.length < 8) {
      setTopUpUtrError("Please enter a valid 12-digit UPI UTR / Reference number.");
      return;
    }
    setTopUpUtrError("");
    setTopUpUtrLoading(true);
    try {
      const res = await api<any>(
        `/wallet/check-status?orderId=${encodeURIComponent(upiOrder.orderId)}&utr=${encodeURIComponent(clean)}`
      );
      if (res.status === "paid") {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        handleUpiPaymentSuccess(res.wallet?.balance);
      } else {
        setTopUpUtrError(
          "Payment status is still pending with the UPI gateway. Please check your UPI app to confirm debit and re-check the 12-digit UTR."
        );
      }
    } catch (e: any) {
      setTopUpUtrError(e.message || "UTR verification failed. Please check the number and try again.");
    } finally {
      setTopUpUtrLoading(false);
    }
  }

  async function uploadPendingDocuments() {
    for (const document of application.documents || []) {
      const file = files[document.name];
      if (!file && !document.fileName && !document.storageName) {
        throw new Error(`Upload ${document.name} to continue.`);
      }
      if (!file) continue;
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(`"${file.name}" must be 5 MB or smaller.`);
      }
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
        reader.readAsDataURL(file);
      });
      await api(`/applications/${application.applicationId}/documents`, {
        method: "POST",
        body: JSON.stringify({
          documentName: document.name,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          data,
        }),
      });
    }
  }

  async function handleTopUp(amountToAdd?: number) {
    const amt = amountToAdd || Number(topUpAmount);
    if (!amt || amt < 1) {
      setTopUpError("Enter an amount of at least ₹1");
      return;
    }
    setTopUpError("");
    setTopUpSuccess("");
    setTopUpBusy(true);

    try {
      // 1. Dynamic UPI QR Top-up (Default, 0% Fee, AllAPI / BHIM)
      if (topUpMethod === "upi_qr") {
        const order = await api<any>("/wallet/create-order", {
          method: "POST",
          body: JSON.stringify({ amount: amt, mode: "upi_qr" }),
        });

        let qrDataUrl = order.qrDataUrl;
        if (!qrDataUrl && order.upiString) {
          qrDataUrl = await QRCode.toDataURL(order.upiString, {
            width: 320,
            margin: 1,
            color: { dark: "#0F172A", light: "#FFFFFF" },
            errorCorrectionLevel: "H",
          });
        }

        const remainingSeconds = order.expiresAt
          ? Math.max(60, Math.min(1800, Math.floor((order.expiresAt - Date.now()) / 1000)))
          : 300;

        setTopUpUtr("");
        setTopUpUtrError("");
        setUpiOrder({
          ...order,
          qrDataUrl,
        });
        setTimeLeft(remainingSeconds);
        setTopUpBusy(false);
        return;
      }

      // 2. Gateway Top-up (Razorpay Fallback)
      const order = await api<any>("/wallet/create-order", {
        method: "POST",
        body: JSON.stringify({ amount: amt }),
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
        setShowTopUp(false);
        setTopUpBusy(false);
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
            setShowTopUp(false);
          } catch (err: any) {
            setTopUpError(err?.message || "Verification failed");
          }
        },
        modal: { ondismiss: () => setTopUpBusy(false) },
      });

      rzp.on("payment.failed", (err: any) =>
        setTopUpError(err?.error?.description || "Payment failed")
      );
      rzp.open();
      setTopUpBusy(false);
    } catch (err: any) {
      setTopUpError(err?.message || "Top-up failed");
      setTopUpBusy(false);
    }
  }

  async function handleSubmit() {
    setError("");
    setBusy(true);
    try {
      await uploadPendingDocuments();

      if (price <= 0) {
        // Free application
        await api<any>("/payments/create-order", {
          method: "POST",
          body: JSON.stringify({ applicationId: application.applicationId }),
        });
        onComplete();
        return;
      }

      // Paid application: strictly pay from wallet
      if (!hasSufficientWallet) {
        throw new Error(`Insufficient wallet balance. Please top up ₹${shortfall} to continue.`);
      }

      const result = await api<any>("/payments/pay-wallet", {
        method: "POST",
        body: JSON.stringify({ applicationId: application.applicationId }),
      });
      if (result.wallet?.balance !== undefined) {
        updateBalance(result.wallet.balance);
      } else {
        await refreshWallet();
      }
      onComplete();
    } catch (err: any) {
      setError(err?.message || "Submission failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-blue-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-display text-base font-bold text-[#0F172A]">Complete Your Application</h3>
          <p className="text-xs text-slate-500">Service: {application.serviceName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Application Fee</p>
          <p className="font-mono-data text-lg font-extrabold text-[#1D56D8]">
            ₹{price.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Required Document Uploads */}
      {(application.documents || []).length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Required Documents
          </label>
          <div className="space-y-2">
            {application.documents.map((document: any) => {
              const uploadedFile = files[document.name];
              const isAlreadyUploaded = Boolean(document.fileName || document.storageName);
              return (
                <div
                  key={document.name}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {isAlreadyUploaded || uploadedFile ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <UploadCloud className="h-4 w-4 text-amber-500" />
                    )}
                    <div>
                      <p className="font-medium text-slate-800">{document.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {uploadedFile
                          ? `${uploadedFile.name} (${(uploadedFile.size / 1024).toFixed(0)} KB)`
                          : document.fileName
                            ? `${document.fileName} (Uploaded)`
                            : "Required (PDF, JPG, PNG, WEBP max 5MB)"}
                      </p>
                    </div>
                  </div>
                  <label className="cursor-pointer rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-blue-600 border border-slate-200 hover:bg-slate-50 transition-colors">
                    {uploadedFile || isAlreadyUploaded ? "Change" : "Browse"}
                    <input
                      type="file"
                      disabled={busy}
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setFiles((prev) => ({ ...prev, [document.name]: file }));
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wallet Status & Payment Notice (if price > 0) */}
      {price > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100 text-[#1D56D8]">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">LD Wallet Balance</p>
                <p className="font-mono-data text-base font-extrabold text-slate-900">
                  ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {hasSufficientWallet ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="h-3.5 w-3.5" /> Sufficient Balance
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                <AlertCircle className="h-3.5 w-3.5" /> Short by ₹{shortfall.toFixed(2)}
              </span>
            )}
          </div>

          {!hasSufficientWallet ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <p className="font-bold text-amber-950">Payment is made exclusively from your LD Wallet.</p>
                  <p className="mt-0.5">
                    Your current balance is short by <b>₹{shortfall.toFixed(2)}</b>. Top up your wallet instantly using Dynamic UPI QR (0% Fee) to complete this application immediately.
                  </p>
                </div>
              </div>

              {topUpSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span>{topUpSuccess}</span>
                </div>
              )}

              {!showTopUp && !upiOrder ? (
                <button
                  type="button"
                  onClick={() => setShowTopUp(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1D56D8] hover:bg-[#1849C0] py-2.5 text-xs font-semibold text-white transition-colors shadow-xs"
                >
                  <PlusCircle className="h-4 w-4" />
                  + Add Money to Wallet (Shortfall: ₹{Math.ceil(shortfall)})
                </button>
              ) : showTopUp && !upiOrder ? (
                <div className="space-y-3 pt-1 border-t border-amber-200/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Select Top-Up Amount</label>
                    <button
                      type="button"
                      onClick={() => setShowTopUp(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setTopUpMethod("upi_qr")}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${
                        topUpMethod === "upi_qr"
                          ? "border-blue-600 bg-blue-50/80 text-blue-900 font-bold"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <QrCode className="h-4 w-4 text-blue-600 shrink-0" />
                      <div>
                        <p className="leading-tight">Instant UPI QR</p>
                        <p className="text-[10px] text-emerald-600 font-medium">0% Fee • Auto-Credit</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopUpMethod("gateway")}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${
                        topUpMethod === "gateway"
                          ? "border-blue-600 bg-blue-50/80 text-blue-900 font-bold"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Smartphone className="h-4 w-4 text-indigo-600 shrink-0" />
                      <div>
                        <p className="leading-tight">Cards / NetBanking</p>
                        <p className="text-[10px] text-slate-400 font-normal">Payment Gateway</p>
                      </div>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      placeholder="Amount in ₹"
                      className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white font-mono focus:border-blue-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      disabled={topUpBusy || !topUpAmount || Number(topUpAmount) < 1}
                      onClick={() => handleTopUp()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1.5"
                    >
                      {topUpBusy ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : topUpMethod === "upi_qr" ? (
                        <>
                          <QrCode className="h-3.5 w-3.5" />
                          Generate UPI QR
                        </>
                      ) : (
                        "Pay via Gateway"
                      )}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {[shortfall > 0 ? Math.ceil(shortfall) : 100, 200, 500, 1000].map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => setTopUpAmount(String(quick))}
                        className={`flex-1 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                          Number(topUpAmount) === quick
                            ? "bg-blue-50 border-blue-400 text-blue-700 font-bold"
                            : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        ₹{quick}
                      </button>
                    ))}
                  </div>

                  {topUpError && (
                    <p role="alert" className="text-xs text-red-600 font-medium">
                      {topUpError}
                    </p>
                  )}
                </div>
              ) : null}

              {/* Dynamic UPI QR Display Modal / Card */}
              {upiOrder && (
                <div className="mt-3 p-4 rounded-2xl bg-white border border-blue-200 shadow-md space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-800">Scan & Pay via any UPI App</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUpiOrder(null);
                        setTopUpUtr("");
                        setTopUpUtrError("");
                      }}
                      className="text-slate-400 hover:text-slate-600 text-xs font-medium"
                    >
                      ✕ Close QR
                    </button>
                  </div>

                  {paymentCompleted ? (
                    <div className="py-6 text-center space-y-2">
                      <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto animate-bounce" />
                      <p className="font-bold text-sm text-emerald-800">Payment Received!</p>
                      <p className="text-xs text-slate-600">
                        ₹{upiOrder.amountRupees} added to your wallet. You can submit now!
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row items-center gap-4 justify-center py-2">
                        {upiOrder.qrDataUrl ? (
                          <div className="p-2 bg-white rounded-2xl border-2 border-slate-900 shadow-sm shrink-0">
                            <img
                              src={upiOrder.qrDataUrl}
                              alt="Dynamic UPI QR Code"
                              className="w-44 h-44 object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-44 h-44 bg-slate-100 rounded-2xl flex items-center justify-center text-xs text-slate-400">
                            Loading QR...
                          </div>
                        )}

                        <div className="space-y-2 text-center sm:text-left text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Amount to Pay</span>
                            <p className="font-mono text-2xl font-black text-slate-900">
                              ₹{upiOrder.amountRupees.toLocaleString("en-IN")}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px]">Order ID</span>
                            <p className="font-mono text-slate-600 text-[11px] font-semibold">{upiOrder.orderId}</p>
                          </div>
                          {upiOrder.merchantVpa && (
                            <div className="flex items-center justify-center sm:justify-start gap-1.5 pt-1">
                              <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                {upiOrder.merchantVpa}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(upiOrder.merchantVpa || "");
                                  setCopiedVpa(true);
                                  setTimeout(() => setCopiedVpa(false), 2000);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-[10px] font-medium flex items-center gap-0.5"
                              >
                                {copiedVpa ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                {copiedVpa ? "Copied" : "Copy"}
                              </button>
                            </div>
                          )}
                          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] text-amber-700 font-semibold pt-1">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            <span>
                              Expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Deep-Links */}
                      {upiOrder.upiIntent && (
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2">
                            Or Pay Directly on Mobile Apps
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {upiOrder.upiIntent.phonepe && (
                              <a
                                href={upiOrder.upiIntent.phonepe}
                                className="py-2 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold text-center transition"
                              >
                                PhonePe
                              </a>
                            )}
                            {upiOrder.upiIntent.gpay && (
                              <a
                                href={upiOrder.upiIntent.gpay}
                                className="py-2 px-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold text-center transition"
                              >
                                Google Pay
                              </a>
                            )}
                            {upiOrder.upiIntent.paytm && (
                              <a
                                href={upiOrder.upiIntent.paytm}
                                className="py-2 px-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-bold text-center transition"
                              >
                                Paytm
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 12-Digit UTR Manual Instant Verification Card */}
                      <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-left space-y-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                            <span>Paid with UPI? Instant Credit with UTR</span>
                          </div>
                          <p className="text-[11px] text-amber-700 leading-tight mt-0.5">
                            Enter the 12-digit UTR / Ref No. from PhonePe/GPay/Paytm if not credited automatically:
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={22}
                            value={topUpUtr}
                            onChange={(e) => {
                              setTopUpUtr(e.target.value.replace(/[^a-zA-Z0-9]/g, ""));
                              setTopUpUtrError("");
                            }}
                            placeholder="12-digit UTR (e.g. 429812345678)"
                            className="flex-1 px-3 py-1.5 text-xs font-mono tracking-wider rounded-xl border border-amber-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
                          />
                          <button
                            type="button"
                            disabled={topUpUtrLoading || topUpUtr.trim().length < 8}
                            onClick={handleVerifyTopUpUtr}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition active:scale-[0.98] shrink-0 flex items-center gap-1"
                          >
                            {topUpUtrLoading ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Verify</span>
                              </>
                            )}
                          </button>
                        </div>

                        {topUpUtrError && (
                          <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>{topUpUtrError}</span>
                          </p>
                        )}
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin" />
                        <span>Auto-verifying payment... Wallet will credit automatically.</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>
                <b>₹{price}</b> will be deducted from your LD Wallet.
              </span>
            </p>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="pt-2 flex items-center justify-end gap-3">
        <button
          type="button"
          disabled={busy || (price > 0 && !hasSufficientWallet)}
          onClick={handleSubmit}
          className="rounded-xl bg-[#1D56D8] hover:bg-[#1849C0] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {busy ? (
            "Processing..."
          ) : price <= 0 ? (
            "Submit Application"
          ) : hasSufficientWallet ? (
            <>
              Pay ₹{price} from Wallet & Submit <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            "Top Up Wallet to Submit"
          )}
        </button>
      </div>
    </section>
  );
}
