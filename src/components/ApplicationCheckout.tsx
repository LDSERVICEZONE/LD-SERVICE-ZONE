import { useState, useEffect } from "react";
import { api } from "@/shared/api/client";
import { useAuth, useWallet } from "@/features/session/AppContext";
import { Wallet, UploadCloud, CheckCircle2, AlertCircle, PlusCircle, ArrowRight } from "lucide-react";

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

  const price = Number(application.customerPrice || 0);
  const balance = Number(wallet?.balance || 0);
  const shortfall = Math.max(0, Number((price - balance).toFixed(2)));
  const hasSufficientWallet = balance >= price;

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  useEffect(() => {
    if (!hasSufficientWallet && shortfall > 0) {
      // Suggest at least the shortfall or minimum 100
      setTopUpAmount(String(Math.max(100, Math.ceil(shortfall))));
    }
  }, [hasSufficientWallet, shortfall]);

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
    setTopUpBusy(true);

    try {
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
                    Please add funds to your wallet using Razorpay (UPI, QR, Cards, NetBanking). Once added, you can complete this application immediately.
                  </p>
                </div>
              </div>

              {!showTopUp ? (
                <button
                  type="button"
                  onClick={() => setShowTopUp(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1D56D8] hover:bg-[#1849C0] py-2.5 text-xs font-semibold text-white transition-colors shadow-xs"
                >
                  <PlusCircle className="h-4 w-4" />
                  + Add Money to Wallet (₹{Math.max(100, Math.ceil(shortfall))})
                </button>
              ) : (
                <div className="space-y-2 pt-1 border-t border-amber-200/60">
                  <label className="text-xs font-semibold text-slate-700">Enter Amount to Add</label>
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
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white disabled:opacity-50 transition-colors shrink-0"
                    >
                      {topUpBusy ? "Processing..." : "Pay with Razorpay"}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {[shortfall > 0 ? Math.ceil(shortfall) : 100, 500, 1000].map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => setTopUpAmount(String(quick))}
                        className="flex-1 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-600 transition-colors"
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
