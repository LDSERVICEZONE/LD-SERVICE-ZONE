import { useEffect, useState } from "react";
import {
  Building2,
  Clock3,
  FileText,
  Pencil,
  Plus,
  Save,
  X,
  RefreshCw,
  KeyRound,
  Ticket,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  UserPlus,
  Search,
  Wallet,
  Trash2,
  Power,
  PowerOff,
} from "lucide-react";
import { api } from "@/shared/api/client";

type Service = {
  id: string;
  name: string;
  category: string;
  customerPrice: number;
  commission: number;
  processingTime: string;
  documents: string[];
  color?: string;
  status?: "active" | "disabled";
};

type VleItem = {
  id: string;
  vleId: string;
  name: string;
  email: string;
  mobile: string;
  businessName: string;
  kycStatus: string;
};

const EMPTY_SERVICE = {
  name: "",
  category: "Government",
  customerPrice: 0,
  commission: 0,
  processingTime: "",
  documents: "",
  color: "#4F46E5",
};

const CATEGORIES = [
  "Government",
  "PAN",
  "Tax",
  "Certificate",
  "Recharge",
  "Bills",
  "Other",
];

export default function AdminServices() {
  const [activeTab, setActiveTab] = useState<"catalog" | "panmitra">("catalog");

  // Catalog state
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<any>(EMPTY_SERVICE);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // PanMitra state
  const [panBalance, setPanBalance] = useState<number | null>(null);
  const [panConfigured, setPanConfigured] = useState(false);
  const [panLoading, setPanLoading] = useState(false);
  const [panError, setPanError] = useState("");
  const [panSuccess, setPanSuccess] = useState("");
  const [vleList, setVleList] = useState<VleItem[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // PanMitra Live Query tool
  const [lookupVleId, setLookupVleId] = useState("");
  const [vleStatusData, setVleStatusData] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Modals for PanMitra
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [selectedVleId, setSelectedVleId] = useState("");
  const [couponQty, setCouponQty] = useState(5);
  const [couponType, setCouponType] = useState("1"); // 1: Physical, 2: Electronic
  const [couponSubmitting, setCouponSubmitting] = useState(false);

  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [registeringUser, setRegisteringUser] = useState(false);

  const [manualVleModalOpen, setManualVleModalOpen] = useState(false);
  const [manualVleForm, setManualVleForm] = useState({
    vleId: "",
    vleName: "",
    vleMobile: "",
    vleEmail: "",
    vleShop: "",
    vleLocation: "",
    vleState: "Odisha",
    vlePin: "",
    vleAadhaar: "",
    vlePan: "",
  });

  const loadCatalog = () =>
    api<any>("/services")
      .then((d) => setServices(d.services || []))
      .catch((e) => setError(e.message));

  const loadPanMitra = async () => {
    setPanLoading(true);
    setPanError("");
    try {
      const [balRes, vlesRes, usersRes] = await Promise.all([
        api<any>("/admin/panmitra/balance"),
        api<any>("/admin/panmitra/vles"),
        api<any>("/admin/users"),
      ]);
      setPanBalance(balRes.balance ?? 0);
      setPanConfigured(Boolean(balRes.configured));
      setVleList(vlesRes.vles || []);
      setAllUsers(usersRes.users || []);
    } catch (e: any) {
      setPanError(e.message || "Failed to load PanMitra data");
    } finally {
      setPanLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
    loadPanMitra();
  }, []);

  // Catalog functions
  const startAdd = () => {
    setEditing(null);
    setForm(EMPTY_SERVICE);
    setError("");
    setOpen(true);
  };

  const startEdit = (s: Service) => {
    setEditing(s.id);
    setForm({
      ...s,
      documents: (s.documents || []).join(", "),
    });
    setError("");
    setOpen(true);
  };

  const saveCatalogService = async () => {
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: String(form.name).trim(),
        category: String(form.category).trim(),
        customerPrice: Number(form.customerPrice),
        commission: Number(form.commission),
        processingTime: String(form.processingTime).trim(),
        documents: String(form.documents)
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        color: form.color,
      };
      const d = editing
        ? await api<any>(`/services/${editing}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await api<any>("/services", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      setServices((xs) =>
        editing
          ? xs.map((x) => (x.id === d.service.id ? d.service : x))
          : [d.service, ...xs],
      );
      setOpen(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteService = async (service: Service) => {
    if (!confirm(`Are you sure you want to delete "${service.name}" (${service.id}) from the service catalog?`)) return;
    try {
      await api<any>(`/services/${service.id}`, { method: "DELETE" });
      setServices((prev) => prev.filter((s) => s.id !== service.id));
    } catch (e: any) {
      alert(e.message || "Failed to delete service");
    }
  };

  const handleToggleServiceStatus = async (service: Service) => {
    const newStatus = service.status === "disabled" ? "active" : "disabled";
    try {
      await api<any>(`/services/${service.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, status: newStatus } : s))
      );
    } catch (e: any) {
      alert(e.message || "Failed to update service status");
    }
  };

  // PanMitra actions
  const handleVleLookup = async (idToQuery?: string) => {
    const target = idToQuery || lookupVleId;
    if (!target.trim()) return;
    setLookupLoading(true);
    setPanError("");
    setVleStatusData(null);
    try {
      const res = await api<any>(
        `/admin/panmitra/vle-status?vleId=${encodeURIComponent(target.trim())}`,
      );
      setVleStatusData(res);
    } catch (e: any) {
      setPanError(e.message || "Failed to query VLE status");
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePasswordReset = async (vleId: string) => {
    if (!confirm(`Are you sure you want to reset password for VLE ID: ${vleId}?`)) return;
    setPanError("");
    setPanSuccess("");
    try {
      const res = await api<any>("/admin/panmitra/password-reset", {
        method: "POST",
        body: JSON.stringify({ vleId }),
      });
      setPanSuccess(res.message || `Password reset instruction sent for ${vleId}`);
    } catch (e: any) {
      setPanError(e.message || "Password reset failed");
    }
  };

  const handleAllocateCoupons = async () => {
    if (!selectedVleId || couponQty < 1) return;
    setCouponSubmitting(true);
    setPanError("");
    setPanSuccess("");
    try {
      const res = await api<any>("/admin/panmitra/coupons", {
        method: "POST",
        body: JSON.stringify({
          vleId: selectedVleId,
          type: couponType,
          quantity: couponQty,
        }),
      });
      setPanSuccess(res.message || `Successfully allocated ${couponQty} coupons to ${selectedVleId}`);
      setCouponModalOpen(false);
      loadPanMitra();
      if (lookupVleId === selectedVleId) {
        handleVleLookup(selectedVleId);
      }
    } catch (e: any) {
      setPanError(e.message || "Failed to allocate coupons");
    } finally {
      setCouponSubmitting(false);
    }
  };

  const handleRegisterUserAsVle = async () => {
    if (!selectedUserId) return;
    setRegisteringUser(true);
    setPanError("");
    setPanSuccess("");
    try {
      const res = await api<any>(`/admin/panmitra/register-user/${selectedUserId}`, {
        method: "POST",
      });
      setPanSuccess(res.message || "User successfully registered as PanMitra VLE");
      setRegisterModalOpen(false);
      setSelectedUserId("");
      loadPanMitra();
    } catch (e: any) {
      setPanError(e.message || "VLE registration failed");
    } finally {
      setRegisteringUser(false);
    }
  };

  const handleManualVleSubmit = async () => {
    setRegisteringUser(true);
    setPanError("");
    setPanSuccess("");
    try {
      const res = await api<any>("/admin/panmitra/vle", {
        method: "POST",
        body: JSON.stringify(manualVleForm),
      });
      setPanSuccess(res.message || `VLE ${manualVleForm.vleId} registered successfully`);
      setManualVleModalOpen(false);
      loadPanMitra();
    } catch (e: any) {
      setPanError(e.message || "VLE registration failed");
    } finally {
      setRegisteringUser(false);
    }
  };

  const unassignedRetailers = allUsers.filter(
    (u) => u.role === "retailer" && !u.panmitraVleId,
  );

  return (
    <div className="p-6 space-y-6 max-w-[1300px]">
      {/* Top Header & Tab Toggle */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-violet-600 uppercase">
            Services & Integrations
          </span>
          <h1 className="font-display text-2xl font-extrabold text-[#0F172A]">
            Services Management
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            Configure consumer services or manage live PanMitra government PAN agent network.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "catalog"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Service Catalogue ({services.length})
          </button>
          <button
            onClick={() => setActiveTab("panmitra")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === "panmitra"
                ? "bg-white text-violet-700 shadow-sm"
                : "text-slate-500 hover:text-violet-600"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            PAN Mitra Gateway (Live API)
          </button>
        </div>
      </div>

      {panSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{panSuccess}</span>
          </div>
          <button onClick={() => setPanSuccess("")} className="text-emerald-600 hover:text-emerald-900 text-xs font-bold">Dismiss</button>
        </div>
      )}

      {panError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600" />
            <span>{panError}</span>
          </div>
          <button onClick={() => setPanError("")} className="text-red-600 hover:text-red-900 text-xs font-bold">Dismiss</button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: CATALOGUE                                              */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={startAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-md shadow-violet-500/20 transition"
            >
              <Plus size={16} />
              Add Service
            </button>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {services.map((s) => (
              <article
                key={s.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Building2 size={20} />
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        s.status === "disabled"
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {s.status === "disabled" ? "Disabled" : "Active"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleServiceStatus(s)}
                      className={`p-2 rounded-lg transition ${
                        s.status === "disabled"
                          ? "bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                          : "bg-emerald-50 text-emerald-600 hover:bg-rose-50 hover:text-rose-600"
                      }`}
                      title={s.status === "disabled" ? "Click to Activate" : "Click to Disable"}
                    >
                      {s.status === "disabled" ? <PowerOff size={15} /> : <Power size={15} />}
                    </button>
                    <button
                      onClick={() => startEdit(s)}
                      className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition"
                      title="Edit Service"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteService(s)}
                      className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                      title="Delete Service"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <h2 className="font-semibold text-[#0F172A] mt-4 text-base">
                  {s.name}
                </h2>
                <p className="text-xs text-[#64748B] mt-1">
                  {s.category} · <span className="font-mono">{s.id}</span>
                </p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">
                      Customer Price
                    </p>
                    <b className="font-mono text-base text-slate-900">
                      ₹{s.customerPrice}
                    </b>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <p className="text-[10px] text-emerald-600 font-semibold uppercase">
                      Commission
                    </p>
                    <b className="font-mono text-base text-emerald-700">
                      ₹{s.commission}
                    </b>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-[#64748B]">
                  <span className="flex items-center gap-1">
                    <Clock3 size={14} />
                    {s.processingTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText size={14} />
                    {s.documents?.length || 0} docs
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: PAN MITRA GATEWAY                                      */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "panmitra" && (
        <div className="space-y-6">
          {/* PanMitra Status & Wallet Balance Widget */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0F1D] p-6 text-white shadow-xl">
            <div className="absolute right-0 top-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                    Live Provider Connected
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-slate-300 font-mono">
                    https://panmitra.com/apiekyc
                  </span>
                </div>
                <h2 className="text-2xl font-black font-display tracking-tight text-white">
                  PanMitra Government PAN Gateway
                </h2>
                <p className="text-xs text-slate-400 max-w-xl">
                  Connects your retailers directly with UTIITSL and NSDL PSA portals for digital eKYC & physical PAN applications.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 p-4 min-w-[200px]">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet size={13} /> API Wallet Balance
                  </p>
                  <p className="text-2xl font-extrabold font-mono mt-1 text-white">
                    ₹{panBalance !== null ? panBalance.toFixed(2) : "0.00"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Official PanMitra Credit
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={loadPanMitra}
                    disabled={panLoading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={panLoading ? "animate-spin" : ""} />
                    Refresh Balance
                  </button>
                  <a
                    href="https://panmitra.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition shadow-lg shadow-violet-500/30"
                  >
                    <ExternalLink size={14} />
                    Top Up on PanMitra
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Live VLE Status Lookup Tool */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Search size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Query Live VLE Status</h3>
                  <p className="text-[11px] text-slate-400">Fetch real-time data from PanMitra</p>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter VLE ID (e.g. LDVLE...)"
                  value={lookupVleId}
                  onChange={(e) => setLookupVleId(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs uppercase outline-none focus:border-violet-500"
                />
                <button
                  onClick={() => handleVleLookup()}
                  disabled={lookupLoading || !lookupVleId.trim()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
                >
                  {lookupLoading ? "Checking..." : "Query"}
                </button>
              </div>

              {vleStatusData && (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="font-semibold text-slate-600">VLE ID:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {vleStatusData.vleId || lookupVleId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        vleStatusData.status === "SUCCESS" || vleStatusData.vleStatus === "Active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {vleStatusData.vleStatus || vleStatusData.status || "Unknown"}
                    </span>
                  </div>
                  {vleStatusData.couponsAvailable !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Coupons Available:</span>
                      <span className="font-mono font-bold text-violet-700">
                        {vleStatusData.couponsAvailable}
                      </span>
                    </div>
                  )}
                  {vleStatusData.message && (
                    <p className="text-[11px] text-slate-500 pt-1">
                      {vleStatusData.message}
                    </p>
                  )}
                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedVleId(lookupVleId);
                        setCouponModalOpen(true);
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] transition"
                    >
                      Allocate Coupons
                    </button>
                    <button
                      onClick={() => handlePasswordReset(lookupVleId)}
                      className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[11px] transition"
                    >
                      Reset Pass
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* VLE Onboarding Actions */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">VLE Partner Network</h3>
                    <p className="text-[11px] text-slate-400">
                      {vleList.length} Retailers active on PanMitra gateway
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setRegisterModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                  >
                    <UserPlus size={14} />
                    1-Click Register Retailer
                  </button>
                  <button
                    onClick={() => setManualVleModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    Manual VLE
                  </button>
                </div>
              </div>

              {/* Table of active VLEs */}
              {vleList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                  No retailers registered as VLE partners yet. Click "1-Click Register Retailer" to onboard a partner.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="p-3">VLE ID</th>
                        <th className="p-3">Partner Name</th>
                        <th className="p-3">Shop / Business</th>
                        <th className="p-3">Mobile</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vleList.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/60">
                          <td className="p-3 font-mono font-bold text-violet-700">
                            {v.vleId}
                          </td>
                          <td className="p-3 font-medium text-slate-900">
                            {v.name}
                          </td>
                          <td className="p-3 text-slate-600">
                            {v.businessName || "Retail Shop"}
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            {v.mobile}
                          </td>
                          <td className="p-3 text-right space-x-1.5">
                            <button
                              onClick={() => {
                                setLookupVleId(v.vleId);
                                handleVleLookup(v.vleId);
                              }}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                              title="Check Live Status"
                            >
                              Status
                            </button>
                            <button
                              onClick={() => {
                                setSelectedVleId(v.vleId);
                                setCouponModalOpen(true);
                              }}
                              className="px-2 py-1 rounded bg-violet-100 hover:bg-violet-200 text-violet-700 font-semibold text-[11px]"
                              title="Issue Coupons"
                            >
                              Coupons
                            </button>
                            <button
                              onClick={() => handlePasswordReset(v.vleId)}
                              className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold text-[11px]"
                              title="Reset Password"
                            >
                              Reset
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Allocate Coupons                                       */}
      {/* ------------------------------------------------------------- */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Ticket className="text-violet-600" size={20} />
                <h3 className="font-bold text-base text-slate-900">Allocate PAN Coupons</h3>
              </div>
              <button onClick={() => setCouponModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Purchases and allocates UTI / NSDL application coupons to the VLE on PanMitra.
            </p>

            <div className="space-y-3 text-xs">
              <label className="block">
                <span className="font-semibold text-slate-700 mb-1 block">Target VLE ID</span>
                <input
                  type="text"
                  value={selectedVleId}
                  onChange={(e) => setSelectedVleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono uppercase outline-none focus:border-violet-500"
                />
              </label>

              <label className="block">
                <span className="font-semibold text-slate-700 mb-1 block">Coupon Type</span>
                <select
                  value={couponType}
                  onChange={(e) => setCouponType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-violet-500 bg-white"
                >
                  <option value="1">Physical PAN Card Coupon (₹107)</option>
                  <option value="2">Electronic e-PAN Coupon (₹72)</option>
                </select>
              </label>

              <label className="block">
                <span className="font-semibold text-slate-700 mb-1 block">Quantity</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={couponQty}
                  onChange={(e) => setCouponQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-violet-500"
                />
              </label>

              <div className="rounded-xl bg-violet-50 border border-violet-100 p-3 flex justify-between items-center text-xs">
                <span className="text-violet-700 font-medium">Estimated Provider Cost:</span>
                <span className="font-mono font-bold text-violet-900">
                  ₹{(couponQty * (couponType === "2" ? 72 : 107)).toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={handleAllocateCoupons}
              disabled={couponSubmitting || !selectedVleId}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-violet-500/20 disabled:opacity-50"
            >
              {couponSubmitting ? "Allocating Coupons..." : "Confirm & Allocate"}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: 1-Click Register Retailer                              */}
      {/* ------------------------------------------------------------- */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="text-emerald-600" size={20} />
                <h3 className="font-bold text-base text-slate-900">1-Click VLE Onboarding</h3>
              </div>
              <button onClick={() => setRegisterModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select any KYC-verified retailer to auto-format and register them as an authorized PanMitra VLE.
            </p>

            {unassignedRetailers.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-500">
                All existing retailers are already registered as VLE partners!
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs">
                  <span className="font-semibold text-slate-700 mb-1 block">Select Retailer</span>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="">-- Choose Retailer --</option>
                    {unassignedRetailers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.vleRequested ? "🔥 [REQUESTED UTI ID] " : ""}
                        {u.name} ({u.mobile}) · {u.businessName || "Shop"}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedUserId && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-800 space-y-1">
                    <p className="font-semibold">Selected Retailer Details:</p>
                    {(() => {
                      const u = allUsers.find((x) => x.id === selectedUserId);
                      return (
                        <>
                          <p>Name: {u?.name}</p>
                          <p>Mobile: {u?.mobile}</p>
                          <p>Email: {u?.email}</p>
                          <p>KYC Status: {u?.kycStatus || "pending"}</p>
                        </>
                      );
                    })()}
                  </div>
                )}

                <button
                  onClick={handleRegisterUserAsVle}
                  disabled={registeringUser || !selectedUserId}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {registeringUser ? "Registering on PanMitra..." : "Register as VLE"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Manual VLE Registration                                */}
      {/* ------------------------------------------------------------- */}
      {manualVleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Manual VLE Registration</h3>
              <button onClick={() => setManualVleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <label className="block">
                <span className="font-semibold text-slate-700 mb-1 block">VLE ID *</span>
                <input
                  type="text"
                  placeholder="e.g. LDVLE001"
                  value={manualVleForm.vleId}
                  onChange={(e) => setManualVleForm({ ...manualVleForm, vleId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-violet-500 uppercase"
                />
              </label>
              <label className="block">
                <span className="font-semibold text-slate-700 mb-1 block">Full Name *</span>
                <input
                  type="text"
                  placeholder="Retailer Full Name"
                  value={manualVleForm.vleName}
                  onChange={(e) => setManualVleForm({ ...manualVleForm, vleName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-violet-500"
                />
              </label>
              <label className="block">
                <span className="font-semibold text-slate-700 mb-1 block">Mobile (10 digits) *</span>
                <input
                  type="text"
                  placeholder="9876543210"
                  value={manualVleForm.vleMobile}
                  onChange={(e) => setManualVleForm({ ...manualVleForm, vleMobile: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-violet-500"
                />
              </label>
              <label className="block">
                <span className="font-semibold text-slate-700 mb-1 block">Email Address *</span>
                <input
                  type="email"
                  placeholder="partner@example.com"
                  value={manualVleForm.vleEmail}
                  onChange={(e) => setManualVleForm({ ...manualVleForm, vleEmail: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-violet-500"
                />
              </label>
              <label className="block">
                <span className="font-semibold text-slate-700 mb-1 block">Shop Name *</span>
                <input
                  type="text"
                  placeholder="Shop / Center Name"
                  value={manualVleForm.vleShop}
                  onChange={(e) => setManualVleForm({ ...manualVleForm, vleShop: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-violet-500"
                />
              </label>
              <label className="block">
                <span className="font-semibold text-slate-700 mb-1 block">Location / City *</span>
                <input
                  type="text"
                  placeholder="City / Area"
                  value={manualVleForm.vleLocation}
                  onChange={(e) => setManualVleForm({ ...manualVleForm, vleLocation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-violet-500"
                />
              </label>
              <label className="block">
                <span className="font-semibold text-slate-700 mb-1 block">State *</span>
                <input
                  type="text"
                  placeholder="State"
                  value={manualVleForm.vleState}
                  onChange={(e) => setManualVleForm({ ...manualVleForm, vleState: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-violet-500"
                />
              </label>
              <label className="block">
                <span className="font-semibold text-slate-700 mb-1 block">PIN Code (6 digits) *</span>
                <input
                  type="text"
                  placeholder="751001"
                  value={manualVleForm.vlePin}
                  onChange={(e) => setManualVleForm({ ...manualVleForm, vlePin: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-violet-500"
                />
              </label>
              <label className="block">
                <span className="font-semibold text-slate-700 mb-1 block">Aadhaar (12 digits) *</span>
                <input
                  type="text"
                  placeholder="123456789012"
                  value={manualVleForm.vleAadhaar}
                  onChange={(e) => setManualVleForm({ ...manualVleForm, vleAadhaar: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-violet-500"
                />
              </label>
              <label className="block">
                <span className="font-semibold text-slate-700 mb-1 block">PAN (10 characters) *</span>
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  value={manualVleForm.vlePan}
                  onChange={(e) => setManualVleForm({ ...manualVleForm, vlePan: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-violet-500 uppercase"
                />
              </label>
            </div>

            <button
              onClick={handleManualVleSubmit}
              disabled={registeringUser}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-violet-500/20 disabled:opacity-50"
            >
              {registeringUser ? "Submitting to PanMitra..." : "Register VLE"}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Edit / Add Service (Catalogue)                         */}
      {/* ------------------------------------------------------------- */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5 pb-2 border-b">
              <div>
                <h2 className="font-display text-xl font-bold text-[#0F172A]">
                  {editing ? "Edit Service" : "Add Service"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Retailers will see saved changes immediately in their catalog.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Service name"
                value={form.name}
                onChange={(v: any) => setForm({ ...form, name: v })}
              />
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Category
                </span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white outline-none focus:border-violet-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <Field
                label="Customer price (₹)"
                type="number"
                value={form.customerPrice}
                onChange={(v: any) => setForm({ ...form, customerPrice: v })}
              />
              <Field
                label="Retailer commission (₹)"
                type="number"
                value={form.commission}
                onChange={(v: any) => setForm({ ...form, commission: v })}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Processing time"
                  value={form.processingTime}
                  onChange={(v: any) => setForm({ ...form, processingTime: v })}
                />
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="Required documents (comma separated)"
                  value={form.documents}
                  onChange={(v: any) => setForm({ ...form, documents: v })}
                />
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              disabled={busy}
              onClick={saveCatalogService}
              className="mt-6 w-full inline-flex justify-center items-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-md shadow-violet-500/20 transition disabled:opacity-50"
            >
              <Save size={16} />
              {busy ? "Saving..." : editing ? "Save Changes" : "Create Service"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}
      </span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-violet-500"
      />
    </label>
  );
}
