import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth, useWallet } from "../../context/AppContext";

const STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const emptyKyc = {
  fullName: "",
  dob: "",
  aadhaar: "",
  pan: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  bankAccount: "",
  ifsc: "",
  accountHolder: "",
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { wallet, refreshWallet } = useWallet();

  const [logs, setLogs] = useState<any[]>([]);
  const [kyc, setKyc] = useState<any>(emptyKyc);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      refreshUser(),
      refreshWallet(),
      api<any>("/auth/activity").catch(() => ({ logs: [] })),
      api<any>("/kyc").catch(() => ({ kyc: {} })),
    ])
      .then(([, , l, k]) => {
        setLogs(l.logs || []);
        if (k?.kyc) {
          setKyc({
            ...emptyKyc,
            ...k.kyc,
            aadhaar: k.kyc.aadhaar || "",
            pan: k.kyc.pan || "",
            bankAccount: k.kyc.bankAccount || "",
          });
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshUser, refreshWallet]);

  const update = (key: string, v: string) =>
    setKyc((prev: any) => ({ ...prev, [key]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const documents: any = {};
      for (const [name, file] of Object.entries(files)) {
        documents[name] = {
          fileName: file.name,
          mimeType: file.type,
          data: await toDataUrl(file),
        };
      }
      const r = await api<any>("/kyc", {
        method: "POST",
        body: JSON.stringify({ ...kyc, documents }),
      });
      setMessage(r.message || "KYC submitted successfully");
      await refreshUser();
      setFiles({});
    } catch (e: any) {
      setError(e.message || "Failed to submit KYC");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-[#94A3B8] font-medium flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-[#1D6FE0] border-t-transparent rounded-full animate-spin" />
        Loading profile & KYC...
      </div>
    );
  }

  const verified = user?.kycStatus === "verified";

  return (
    <div className="p-5 sm:p-6 space-y-6 max-w-[1050px]">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-[#0F172A]">
          Profile & KYC
        </h1>
        <p className="text-[#64748B] text-sm mt-1">
          Your account information and verified retailer credentials.
        </p>
      </div>

      {/* Profile summary card */}
      <div className="bg-gradient-to-br from-[#07111F] to-[#111C2E] rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-xl">{user?.name || "—"}</h2>
            <p className="text-white/60 text-sm">{user?.businessName || "—"}</p>
          </div>
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              verified
                ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                : user?.kycStatus === "pending"
                ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                : "bg-red-400/20 text-red-300 border border-red-400/30"
            }`}
          >
            KYC: {user?.kycStatus || "required"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="text-base font-bold">
              ₹{Number(wallet?.balance || 0).toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-white/60 uppercase tracking-wider mt-0.5">
              Wallet Balance
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="text-base font-bold truncate">{user?.email || "—"}</div>
            <p className="text-[11px] text-white/60 uppercase tracking-wider mt-0.5">
              Login Email
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="text-base font-bold uppercase">{user?.role || "Retailer"}</div>
            <p className="text-[11px] text-white/60 uppercase tracking-wider mt-0.5">
              Portal Role
            </p>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
        <h3 className="font-semibold text-lg text-[#0F172A] mb-4">
          Account Details
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ["Full Name", user?.name],
            ["Business Name", user?.businessName],
            ["Mobile", user?.mobile],
            ["Email", user?.email],
            ["Role", user?.role],
            ["Account Status", user?.status],
          ].map(([label, val]) => (
            <div key={String(label)}>
              <label className="block text-xs font-medium text-[#64748B] mb-1.5">
                {label}
              </label>
              <input
                readOnly
                value={String(val || "—")}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#334155] font-medium"
              />
            </div>
          ))}
        </div>
      </div>

      {/* KYC Form */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="font-semibold text-lg text-[#0F172A]">
              KYC Verification
            </h3>
            <p className="text-sm text-[#64748B] mt-1">
              Submit your official identity, address and settlement bank details for
              verification.
            </p>
          </div>
          {verified && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Verified
            </span>
          )}
        </div>

        {message && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-6">
          <section>
            <h4 className="font-semibold text-sm text-[#1E293B] mb-3 uppercase tracking-wider">
              1. Personal Identity
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Full Legal Name"
                value={kyc.fullName}
                onChange={(v) => update("fullName", v)}
                disabled={verified}
              />
              <Field
                label="Date of Birth"
                type="date"
                value={kyc.dob}
                onChange={(v) => update("dob", v)}
                disabled={verified}
              />
              <Field
                label="Aadhaar Number (12 digits)"
                value={kyc.aadhaar}
                maxLength={12}
                onChange={(v) => update("aadhaar", v.replace(/\D/g, ""))}
                disabled={verified}
              />
              <Field
                label="PAN Number (10 characters)"
                value={kyc.pan}
                maxLength={10}
                onChange={(v) => update("pan", v.toUpperCase())}
                disabled={verified}
              />
            </div>
          </section>

          <section>
            <h4 className="font-semibold text-sm text-[#1E293B] mb-3 uppercase tracking-wider">
              2. Address
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field
                  label="Street Address / Premises"
                  value={kyc.address}
                  onChange={(v) => update("address", v)}
                  disabled={verified}
                />
              </div>
              <Field
                label="City / Town"
                value={kyc.city}
                onChange={(v) => update("city", v)}
                disabled={verified}
              />
              <label className="text-xs font-medium text-[#475569]">
                State
                <select
                  value={kyc.state}
                  onChange={(e) => update("state", e.target.value)}
                  disabled={verified}
                  className="mt-1 w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm disabled:bg-[#F8FAFC]"
                >
                  <option value="">Select State</option>
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="PIN Code (6 digits)"
                value={kyc.pincode}
                maxLength={6}
                onChange={(v) => update("pincode", v.replace(/\D/g, ""))}
                disabled={verified}
              />
            </div>
          </section>

          <section>
            <h4 className="font-semibold text-sm text-[#1E293B] mb-3 uppercase tracking-wider">
              3. Bank Details for Settlement
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Account Holder Name"
                value={kyc.accountHolder}
                onChange={(v) => update("accountHolder", v)}
                disabled={verified}
              />
              <Field
                label="Bank Account Number"
                value={kyc.bankAccount}
                onChange={(v) => update("bankAccount", v)}
                disabled={verified}
              />
              <Field
                label="IFSC Code (11 characters)"
                value={kyc.ifsc}
                maxLength={11}
                onChange={(v) => update("ifsc", v.toUpperCase())}
                disabled={verified}
              />
            </div>
          </section>

          <section>
            <h4 className="font-semibold text-sm text-[#1E293B] mb-3 uppercase tracking-wider">
              4. Document Uploads
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                ["panCard", "PAN Card Document"],
                ["aadhaarCard", "Aadhaar Card Document"],
                ["selfie", "Live Photo / Selfie"],
                ["bankProof", "Bank Proof / Cancelled Cheque"],
              ].map(([k, l]) => (
                <label
                  key={k}
                  className="rounded-xl border border-dashed border-[#CBD5E1] p-4 text-sm hover:border-[#1D6FE0] transition cursor-pointer bg-[#F8FAFC]"
                >
                  <span className="block font-medium text-[#1E293B] mb-2">{l}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={verified}
                    onChange={(e) =>
                      setFiles((prev) => ({
                        ...prev,
                        [k]: e.target.files?.[0] as File,
                      }))
                    }
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {files[k] && (
                    <span className="text-xs text-emerald-600 block mt-2 font-medium">
                      ✓ Selected: {files[k].name}
                    </span>
                  )}
                </label>
              ))}
            </div>
            <p className="text-xs text-[#94A3B8] mt-2">
              Maximum 5 MB per document. All documents are stored securely and only accessible via authenticated session.
            </p>
          </section>

          {!verified && (
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1D6FE0] hover:bg-[#1557B0] text-white font-semibold shadow-md shadow-blue-500/20 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting KYC...
                </>
              ) : (
                "Submit KYC for Verification"
              )}
            </button>
          )}
        </form>
      </div>

      {/* Account Activity Logs */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
        <h3 className="font-semibold text-lg text-[#0F172A] mb-4">
          Recent Account Activity
        </h3>
        {logs.length > 0 ? (
          <div className="divide-y divide-[#F1F4F9]">
            {logs.map((log) => (
              <div
                key={log.id}
                className="py-3 text-sm flex items-center justify-between"
              >
                <span className="font-medium text-[#1E293B]">{log.action}</span>
                <span className="text-xs text-[#94A3B8]">
                  {new Date(log.createdAt).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#94A3B8]">No recent activity recorded.</p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="text-xs font-medium text-[#475569] block">
      {label}
      <input
        required
        type={type}
        value={value || ""}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F172A] disabled:bg-[#F8FAFC] disabled:text-[#64748B] focus:border-[#1D6FE0] focus:ring-1 focus:ring-[#1D6FE0] outline-none transition"
      />
    </label>
  );
}

async function toDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
