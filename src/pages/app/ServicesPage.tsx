import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/shared/api/client";
import { useWallet } from "@/features/session/AppContext";

const BASE_CATEGORIES = ["All", "Government", "PAN", "Tax", "Certificate", "Recharge", "Bills", "Other"];

const PAN_SERVICES = [
  { id: "PAN-UTI", name: "UTI PAN", icon: "🏢", commission: 10, processingTime: "Instant / 3-5 days", customerPrice: 107, documents: ["Aadhaar", "Biometric / OTP"], color: "#7C3AED", description: "Official UTI PSA Paperless PAN (ID issued via LD Service Zone)" },
  { id: "PAN-FIND", name: "PAN Find", icon: "🔍", commission: 10, processingTime: "Instant", customerPrice: 20, documents: ["Aadhaar Number", "Mobile Number"], color: "#4F46E5", description: "Find lost PAN number by Aadhaar card" },
  { id: "PAN-NSDL", name: "NSDL PAN", icon: "📑", commission: 10, processingTime: "Instant / 2 hours", customerPrice: 107, documents: ["Aadhaar", "Biometric / OTP"], color: "#1D56D8", description: "Instant paperless eKYC PAN card application" },
  { id: "PAN-UTI-STATUS", name: "UTI PAN Status", icon: "⏱️", commission: 0, processingTime: "Instant", customerPrice: 0, documents: ["Application / Coupon No"], color: "#10B981", description: "Track UTIITSL PAN application status online" },
  { id: "PAN-NSDL-STATUS", name: "NSDL PAN Status", icon: "🔎", commission: 0, processingTime: "Instant", customerPrice: 0, documents: ["15-Digit Ack No"], color: "#06B6D4", description: "Track NSDL TIN application status online" },
  { id: "PAN-UTI-COUPON", name: "UTI Coupon Add", icon: "🎟️", commission: 5, processingTime: "Instant", customerPrice: 107, documents: ["UTI VLE ID"], color: "#F59E0B", description: "Add Physical & Electronic coupons to your UTI ID" },
];

const SERVICE_SUBSERVICES: Record<string, any[]> = {
  "Voter ID Card": [
    { id: "VOTER-NEW", name: "New Voter ID", icon: "🆕", processingTime: "7-15 days", customerPrice: 100, commission: 40, documents: ["Aadhaar", "DOB Proof", "Photograph"], color: "#4F46E5" },
    { id: "VOTER-CORRECTION", name: "Voter ID Correction", icon: "✏️", processingTime: "7-15 days", customerPrice: 100, commission: 35, documents: ["Voter ID", "Aadhaar", "Supporting Proof"], color: "#F59E0B" },
    { id: "VOTER-ADDRESS", name: "Voter ID Address Change", icon: "🏠", processingTime: "7-15 days", customerPrice: 100, commission: 35, documents: ["Voter ID", "Address Proof"], color: "#06B6D4" },
    { id: "VOTER-DOWNLOAD", name: "Voter ID Download", icon: "⬇️", processingTime: "Instant", customerPrice: 30, commission: 10, documents: ["EPIC Number", "Mobile Number"], color: "#10B981" },
  ],
  "Driving Licence": [
    { id: "DL-NEW", name: "New Driving Licence", icon: "🆕", processingTime: "15-30 days", customerPrice: 500, commission: 100, documents: ["Aadhaar", "Medical Cert", "Age Proof"], color: "#1D56D8" },
    { id: "DL-LEARNER", name: "Learner Licence", icon: "📘", processingTime: "7-15 days", customerPrice: 300, commission: 70, documents: ["Aadhaar", "Age Proof"], color: "#4F46E5" },
    { id: "DL-RENEWAL", name: "Driving Licence Renewal", icon: "🔄", processingTime: "7-15 days", customerPrice: 400, commission: 80, documents: ["Driving Licence", "Aadhaar"], color: "#10B981" },
    { id: "DL-CORRECTION", name: "Driving Licence Correction", icon: "✏️", processingTime: "7-15 days", customerPrice: 400, commission: 75, documents: ["Driving Licence", "Supporting Proof"], color: "#F59E0B" },
    { id: "DL-DUPLICATE", name: "Duplicate Driving Licence", icon: "📄", processingTime: "7-15 days", customerPrice: 450, commission: 90, documents: ["Driving Licence", "Aadhaar"], color: "#7C3AED" },
  ],
  "RC Smart Card": [
    { id: "RC-NEW", name: "New RC Smart Card", icon: "🆕", processingTime: "10-20 days", customerPrice: 400, commission: 80, documents: ["RC Book", "Insurance", "PUC"], color: "#06B6D4" },
    { id: "RC-TRANSFER", name: "RC Transfer", icon: "🔄", processingTime: "10-20 days", customerPrice: 500, commission: 100, documents: ["RC Book", "Sale Agreement", "Insurance"], color: "#4F46E5" },
    { id: "RC-CORRECTION", name: "RC Correction", icon: "✏️", processingTime: "10-20 days", customerPrice: 350, commission: 70, documents: ["RC Book", "Supporting Proof"], color: "#F59E0B" },
    { id: "RC-DUPLICATE", name: "Duplicate RC", icon: "📄", processingTime: "10-20 days", customerPrice: 400, commission: 80, documents: ["Vehicle Details", "Insurance", "PUC"], color: "#7C3AED" },
  ],
  "ITR-1 Filing": [
    { id: "ITR-1", name: "ITR-1 Filing", icon: "📊", processingTime: "Same day", customerPrice: 299, commission: 120, documents: ["PAN", "Form 16", "Bank Statement"], color: "#10B981" },
    { id: "ITR-1-REVISED", name: "Revised ITR-1", icon: "✏️", processingTime: "Same day", customerPrice: 399, commission: 150, documents: ["PAN", "Form 16", "Original ITR"], color: "#F59E0B" },
  ],
  "GST Registration": [
    { id: "GST-REG", name: "New GST Registration", icon: "🆕", processingTime: "3-7 days", customerPrice: 999, commission: 300, documents: ["PAN", "Aadhaar", "Business Proof"], color: "#F59E0B" },
    { id: "GST-CORRECTION", name: "GST Amendment", icon: "✏️", processingTime: "3-7 days", customerPrice: 699, commission: 200, documents: ["GSTIN", "Supporting Proof"], color: "#4F46E5" },
  ],
  "Income Certificate": [
    { id: "INCOME-NEW", name: "New Income Certificate", icon: "🆕", processingTime: "7-10 days", customerPrice: 150, commission: 50, documents: ["Aadhaar", "Ration Card"], color: "#7C3AED" },
    { id: "INCOME-RENEW", name: "Income Certificate Renewal", icon: "🔄", processingTime: "7-10 days", customerPrice: 150, commission: 45, documents: ["Old Certificate", "Aadhaar"], color: "#10B981" },
  ],
  "Caste Certificate": [
    { id: "CASTE-NEW", name: "New Caste Certificate", icon: "🆕", processingTime: "10-15 days", customerPrice: 100, commission: 40, documents: ["Aadhaar", "Old Caste Cert"], color: "#06B6D4" },
    { id: "CASTE-CORRECTION", name: "Caste Certificate Correction", icon: "✏️", processingTime: "10-15 days", customerPrice: 100, commission: 35, documents: ["Certificate", "Supporting Proof"], color: "#F59E0B" },
  ],
};

const serviceColor = (service: any) => service?.color || "#4F46E5";

const iconFor = (category: string) =>
  category === "Government" ? "🏛️" : category === "Tax" ? "📊" : category === "Certificate" ? "📜" : "🪪";

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedParentService, setSelectedParentService] = useState<any>(null);
  const [showPanServices, setShowPanServices] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { wallet, refreshWallet, updateBalance } = useWallet();

  // PanMitra VLE agency state
  const [vleProfile, setVleProfile] = useState<any>(null);
  const [buyCouponOpen, setBuyCouponOpen] = useState(false);
  const [buyQty, setBuyQty] = useState(5);
  const [buyType, setBuyType] = useState("1"); // 1: Physical, 2: Electronic
  const [buyingCoupon, setBuyingCoupon] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState("");
  // Client 6-item PAN workflow states
  const [utiModalOpen, setUtiModalOpen] = useState(false);
  const [requestingVle, setRequestingVle] = useState(false);
  const [requestVleMsg, setRequestVleMsg] = useState("");
  const [utiStatusOpen, setUtiStatusOpen] = useState(false);
  const [utiAppNo, setUtiAppNo] = useState("");
  const [utiDob, setUtiDob] = useState("");
  const [nsdlStatusOpen, setNsdlStatusOpen] = useState(false);
  const [nsdlAckNo, setNsdlAckNo] = useState("");
  const [nsdlModalOpen, setNsdlModalOpen] = useState(false);

  useEffect(() => {
    api<any>("/services").then(d => setServices(d.services || [])).catch(() => setServices([])).finally(() => setCatalogLoading(false));
    api<any>("/panmitra/vle-profile").then(setVleProfile).catch(() => {});
  }, []);

  const categories = useMemo(() => Array.from(new Set([...BASE_CATEGORIES, ...services.map(s => s.category).filter(Boolean)])), [services]);

  const filtered = useMemo(() => services.filter(s =>
    s.category !== "PAN" &&
    (activeCategory === "All" || s.category === activeCategory) &&
    s.name.toLowerCase().includes(search.toLowerCase())
  ), [services, activeCategory, search]);

  const livePan = services.find(s => s.category === "PAN");

  const openApplication = (service: any) => {
    setForm({});
    setFiles({});
    setSelectedFiles({});
    setSubmitMessage("");
    const current = services.find(s => s.id === service.id);
    if (!current) { setSubmitMessage("This service is currently unavailable. Refresh the catalogue."); return; }
    setSelectedService({ ...service, ...current });
  };

  const fieldDefs = useMemo(() => {
    if (!selectedService) return [];
    const names = ["Full Name", "Date of Birth", "Mobile Number", "Email Address", "Father's Name"];
    if (selectedService.id?.startsWith("PAN-")) {
      if (selectedService.id === "PAN-FIND") return ["Aadhaar Number", "Mobile Number"];
      if (selectedService.id === "PAN-STATUS" || selectedService.id === "PAN-UTI-STATUS") return ["Application / Coupon No", "Date of Birth"];
      if (selectedService.id === "PAN-NSDL-STATUS") return ["15-Digit Acknowledgement No"];
      if (selectedService.id === "PAN-REPRINT") return ["Full Name", "PAN Number", "Aadhaar Number", "Mobile Number"];
      if (selectedService.id === "PAN-NSDL") return ["Full Name", "Date of Birth", "Mobile Number", "Email Address", "Aadhaar Number"];
      return ["Full Name", "Date of Birth", "Mobile Number", "Email Address", "Father's Name", "Aadhaar Number"];
    }
    if (selectedService.id?.startsWith("VOTER-")) return [...names, "Aadhaar Number", "Address"];
    if (selectedService.id?.startsWith("DL-")) return [...names, "Aadhaar Number", "Address", "Licence Number"];
    if (selectedService.id?.startsWith("RC-")) return [...names, "Aadhaar Number", "Vehicle Registration Number"];
    if (selectedService.id?.startsWith("ITR-")) return [...names, "PAN Number", "Assessment Year"];
    if (selectedService.id?.startsWith("GST-")) return [...names, "PAN Number", "Business Name", "Business Address"];
    return [...names, "Aadhaar Number", "Address"];
  }, [selectedService]);

  const submitApplication = async () => {
    if (!selectedService) return;
    const required = fieldDefs.filter(f => f !== "Email Address");
    const missing = required.find(f => !(form[f] || "").trim());
    if (missing) { setSubmitMessage(`Please enter ${missing}.`); return; }
    const missingDocument = selectedService.documents.find((name: string) => !selectedFiles[name]);
    if (missingDocument) { setSubmitMessage(`Please upload ${missingDocument}.`); return; }
    setSubmitting(true); setSubmitMessage("");
    try {
      const created = await api<any>("/applications", {
        method: "POST",
        body: JSON.stringify({
          serviceId: selectedService.id, serviceName: selectedService.name,
          category: selectedService.category || "Government", customerPrice: selectedService.customerPrice,
          commission: selectedService.commission, applicant: form,
          documents: selectedService.documents.map((name: string) => ({ name, fileName: files[name] || null })),
        }),
      });
      const application = created.application;
      for (const doc of selectedService.documents) {
        const file = selectedFiles[doc];
        if (!file) continue;
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error(`Could not read ${doc}`)); reader.readAsDataURL(file);
        });
        await api(`/applications/${application.applicationId}/documents`, { method: "POST", body: JSON.stringify({ documentName: doc, fileName: file.name, mimeType: file.type, data: dataUrl }) });
      }
      const price = Number(selectedService.customerPrice || 0);
      if (price <= 0) {
        setSubmitMessage(`Application ${application.applicationId} submitted successfully.`);
        setForm({}); setFiles({}); setSelectedFiles({});
        return;
      }

      const currentBalance = Number(wallet?.balance || 0);
      if (currentBalance < price) {
        setSubmitMessage(
          `Application ${application.applicationId} saved! Insufficient LD Wallet balance (Available: ₹${currentBalance.toFixed(2)}, Required: ₹${price.toFixed(2)}). Under platform policy, all services are paid from your wallet. Please top up your wallet in the Wallet page or Applications tab to complete payment.`
        );
        setForm({}); setFiles({}); setSelectedFiles({});
        return;
      }

      const res = await api<any>("/payments/pay-wallet", {
        method: "POST",
        body: JSON.stringify({ applicationId: application.applicationId }),
      });
      if (res.wallet?.balance !== undefined) {
        updateBalance(res.wallet.balance);
      } else {
        await refreshWallet();
      }
      setSubmitMessage(
        `Application ${application.applicationId} submitted successfully! ₹${price} paid from your LD Wallet. Remaining balance: ₹${Number(res.wallet?.balance || 0).toFixed(2)}.`
      );
      setForm({}); setFiles({}); setSelectedFiles({});
    } catch (e: any) { setSubmitMessage(e.message || "Unable to submit application"); }
    finally { setSubmitting(false); }
  };

  const handleBuyCoupons = async () => {
    setBuyingCoupon(true);
    setCouponFeedback("");
    try {
      const res = await api<any>("/panmitra/buy-coupons", {
        method: "POST",
        body: JSON.stringify({ quantity: buyQty, type: buyType }),
      });
      if (res.walletBalance !== undefined) {
        updateBalance(res.walletBalance);
      } else {
        await refreshWallet();
      }
      setCouponFeedback(res.message || "Coupons allocated successfully!");
      setBuyCouponOpen(false);
      api<any>("/panmitra/vle-profile").then(setVleProfile).catch(() => {});
    } catch (err: any) {
      setCouponFeedback(err.message || "Failed to purchase coupons");
    } finally {
      setBuyingCoupon(false);
    }
  };

  const handleRequestVle = async () => {
    setRequestingVle(true);
    setRequestVleMsg("");
    try {
      const res = await api<any>("/panmitra/request-vle", { method: "POST" });
      setRequestVleMsg(res.message || "Request submitted successfully to LD Service Zone!");
      api<any>("/panmitra/vle-profile").then(setVleProfile).catch(() => {});
    } catch (e: any) {
      setRequestVleMsg(e.message || "Failed to submit request.");
    } finally {
      setRequestingVle(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1180px]">
      <section className="relative overflow-hidden rounded-3xl border border-[#E2E8F0] bg-gradient-to-br from-white via-[#F7F9FF] to-[#EEF4FF] p-6 sm:p-7 shadow-sm">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#6D5DFB]/10 blur-2xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0] text-xs font-semibold text-[#4F46E5] shadow-sm">
              ✨ Retailer Service Hub
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F172A] mt-3">Government & Digital Services</h1>
            <p className="text-[#64748B] text-sm mt-1 max-w-xl">Apply for government documents, certificates, tax services and digital services — with clear pricing and retailer commission.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 min-w-[290px]">
            {[
              ["24/7", "Service access", "bg-blue-50 text-blue-700"],
              ["100%", "Digital process", "bg-emerald-50 text-emerald-700"],
              ["Fast", "Application flow", "bg-violet-50 text-violet-700"],
            ].map(([v, l, c]) => (
              <div key={l} className={`rounded-2xl p-3 ${c}`}>
                <p className="font-bold text-sm">{v}</p><p className="text-[10px] mt-0.5 opacity-80">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
          <input aria-label="Search services" placeholder="Search services, customers, transactions..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#E2E8F0] bg-white text-[#0F172A] text-sm shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#1D56D8] placeholder-[#A0AEC0]" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(c => (
            <button key={c} onClick={() => setActiveCategory(c)}
              className={`whitespace-nowrap px-4 py-3 rounded-2xl text-sm font-semibold border transition-all ${activeCategory === c ? "bg-[#1D56D8] text-white border-[#1D56D8] shadow-md shadow-blue-200" : "bg-white border-[#E2E8F0] text-[#475569] hover:border-blue-300 hover:bg-blue-50/50"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div><h2 className="font-display font-bold text-[#0F172A]">Choose a Service</h2><p className="text-xs text-[#94A3B8]">Select a main service to see its available options.</p></div>
          <span className="text-xs font-semibold text-[#64748B] bg-[#F8FAFC] px-3 py-1.5 rounded-full border border-[#E2E8F0]">{filtered.length + ((activeCategory === "All" || activeCategory === "PAN") ? 1 : 0)} services</span>
        </div>

        {catalogLoading && <div className="col-span-full rounded-2xl bg-white border border-[#E2E8F0] p-8 text-center text-sm text-[#94A3B8]">Loading live service catalogue…</div>}
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {(activeCategory === "All" || activeCategory === "PAN") && (
            <button type="button" onClick={() => setShowPanServices(true)}
              className="group relative overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-white via-violet-50/60 to-blue-50 p-5 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="absolute right-0 top-0 w-28 h-28 rounded-full bg-violet-200/30 blur-2xl" />
              <div className="relative flex items-start justify-between"><div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center text-2xl shadow-inner">🪪</div><span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">PAN</span></div>
              <h3 className="relative font-display font-bold text-lg text-[#0F172A] mt-4">PAN Card</h3>
              <p className="relative text-xs text-[#64748B] mt-1">7 professional PAN services available</p>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="rounded-2xl bg-white/90 border border-white p-3"><p className="text-[10px] text-[#94A3B8]">Customer Price</p><p className="font-bold text-[#0F172A] mt-1">From ₹20{livePan ? ` · New ₹${livePan.customerPrice}` : ""}</p></div>
                <div className="rounded-2xl bg-emerald-50/90 border border-emerald-100 p-3"><p className="text-[10px] text-emerald-600">Your Commission</p><p className="font-bold text-emerald-700 mt-1">Up to ₹40{livePan ? ` · New ₹${livePan.commission}` : ""}</p></div>
              </div>
              <span className="relative mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#1D56D8] text-white text-sm font-bold shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300">Open PAN Services <span>→</span></span>
            </button>
          )}

          {filtered.map(s => {
            const count = SERVICE_SUBSERVICES[s.name]?.length || 1;
            return (
              <button key={s.id} type="button" onClick={() => setSelectedParentService(s)}
                className="group relative overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white p-5 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="absolute right-0 top-0 w-28 h-28 rounded-full opacity-40 blur-2xl" style={{ backgroundColor: serviceColor(s) + "30" }} />
                <div className="relative flex items-start justify-between"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner" style={{ backgroundColor: serviceColor(s) + "18" }}>{iconFor(s.category)}</div><span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]">{s.category}</span></div>
                <h3 className="relative font-display font-bold text-lg text-[#0F172A] mt-4">{s.name}</h3>
                <div className="relative flex items-center gap-2 text-xs text-[#64748B] mt-1"><span>⏱</span>{s.processingTime}<span className="text-[#CBD5E1]">•</span><span>{count} options</span></div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="rounded-2xl bg-[#F8FAFC] border border-[#EEF2F7] p-3"><p className="text-[10px] text-[#94A3B8]">Customer Price</p><p className="font-bold text-[#0F172A] mt-1">₹{s.customerPrice}</p></div>
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3"><p className="text-[10px] text-emerald-600">Your Commission</p><p className="font-bold text-emerald-700 mt-1">₹{s.commission}</p></div>
                </div>
                <div className="mt-4 flex items-center justify-between"><span className="text-[11px] text-[#94A3B8]">Documents ready</span><span className="text-sm font-bold text-[#1D56D8] group-hover:translate-x-1 transition-transform">Open Services →</span></div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["💰", "Best Commission", "Transparent earnings on every service", "bg-emerald-50"],
          ["⚡", "Fast Processing", "Simple digital application flow", "bg-amber-50"],
          ["🛡️", "Secure & Safe", "Protected form submission workflow", "bg-blue-50"],
          ["🎧", "24/7 Support", "Help your customers with confidence", "bg-violet-50"],
        ].map(([i, t, d, bg]) => <div key={t} className={`rounded-2xl border border-[#E2E8F0] ${bg} p-4`}><div className="text-2xl">{i}</div><p className="font-bold text-sm text-[#0F172A] mt-2">{t}</p><p className="text-[11px] text-[#64748B] mt-1">{d}</p></div>)}
      </section>

      {selectedParentService && (
        <div className="fixed inset-0 bg-[#07111F]/65 backdrop-blur-sm z-40 flex items-center justify-center p-3 sm:p-6" onClick={() => setSelectedParentService(null)}>
          <div className="bg-[#F8FAFC] w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl border border-white/40" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#E2E8F0] p-5 sm:p-6 flex items-center justify-between">
              <div><div className="inline-flex px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase">{selectedParentService.category}</div><h3 className="font-display font-extrabold text-[#0F172A] text-xl mt-2">{selectedParentService.name} Services</h3><p className="text-xs text-[#64748B] mt-1">Choose an option below to start the application.</p></div>
              <button onClick={() => setSelectedParentService(null)} className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] text-xl">×</button>
            </div>
            <div className="p-5 sm:p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(SERVICE_SUBSERVICES[selectedParentService.name] || [selectedParentService]).filter((sub: any) => services.some(s => s.id === sub.id)).map((sub: any) => ({ ...sub, ...services.find(s => s.id === sub.id) })).map((sub: any) => (
                <button key={sub.id} type="button" onClick={() => { setSelectedParentService(null); openApplication({ ...sub, category: selectedParentService.category }); }}
                  className="group rounded-3xl border border-[#E2E8F0] bg-white p-5 text-left hover:border-[#8B5CF6]/40 hover:shadow-xl hover:-translate-y-1 transition-all">
                  <div className="flex items-start justify-between"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: sub.color + "20" }}>{sub.icon || "📄"}</div><span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">START</span></div>
                  <h4 className="font-bold text-[#0F172A] mt-4">{sub.name}</h4><p className="text-xs text-[#64748B] mt-1">⏱ {sub.processingTime}</p>
                  <div className="grid grid-cols-2 gap-2 mt-4"><div className="rounded-xl bg-[#F8FAFC] p-3"><p className="text-[9px] text-[#94A3B8]">Customer</p><p className="font-bold text-sm">₹{sub.customerPrice}</p></div><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[9px] text-emerald-600">Commission</p><p className="font-bold text-sm text-emerald-700">₹{sub.commission}</p></div></div>
                  <div className="flex flex-wrap gap-1.5 mt-4">{sub.documents.map((d: string) => <span key={d} className="text-[9px] px-2 py-1 rounded-full bg-[#F1F4F9] text-[#475569]">{d}</span>)}</div>
                  <div className="mt-4 text-sm font-bold text-[#1D56D8] group-hover:translate-x-1 transition-transform">Open application →</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showPanServices && (
        <div className="fixed inset-0 bg-[#07111F]/65 backdrop-blur-sm z-40 flex items-center justify-center p-3 sm:p-6" onClick={() => setShowPanServices(false)}>
          <div className="bg-[#F8FAFC] w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#E2E8F0] p-5 sm:p-6 flex items-center justify-between">
              <div><div className="inline-flex px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-[10px] font-bold uppercase">PAN AGENCY</div><h3 className="font-display font-extrabold text-[#0F172A] text-xl mt-2">PAN Card & Government Agency Hub</h3><p className="text-xs text-[#64748B] mt-1">Apply for consumer PAN cards, or issue UTIITSL / NSDL coupons directly.</p></div>
              <button onClick={() => setShowPanServices(false)} className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] text-xl">×</button>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              {couponFeedback && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex justify-between items-center">
                  <span>{couponFeedback}</span>
                  <button onClick={() => setCouponFeedback("")} className="text-emerald-700 font-bold text-sm">×</button>
                </div>
              )}

              {/* VLE Agency Banner */}
              {vleProfile?.hasVle ? (
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-900 via-indigo-950 to-slate-900 p-5 text-white shadow-lg border border-violet-800/40">
                  <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Official UTI PSA Agency</span>
                        <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                          ID: {vleProfile.vleId}
                        </span>
                        <span className="text-[10px] text-violet-300 bg-white/10 px-2 py-0.5 rounded-full">via LD Service Zone</span>
                      </div>
                      <h4 className="font-display text-lg font-extrabold">UTIITSL Paperless Agent Portal Active</h4>
                      <p className="text-xs text-slate-300">
                        Available Coupons: <span className="font-bold text-emerald-400 font-mono text-sm">{vleProfile.vleStatus?.couponsAvailable ?? "Active"}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => setBuyCouponOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition shadow-md shadow-violet-500/30 flex items-center gap-1.5"
                      >
                        <span>🎟️</span> Buy / Add Coupons
                      </button>
                      <a
                        href="https://www.psaonline.utiitsl.com/psaonline/"
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <span>↗</span> Launch UTI PSA Portal
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 border border-blue-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-2xl">🏢</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-700 bg-violet-100 px-2 py-0.5 rounded-md">Direct Agent ID</span>
                        <span className="text-[11px] font-semibold text-slate-500">Issued by LD Service Zone</span>
                      </div>
                      <p className="font-bold text-sm text-[#0F172A] mt-0.5">Official UTI PSA Partner ID</p>
                      <p className="text-[11px] text-[#64748B]">
                        Get your official UTI PSA VLE credentials through LD Service Zone to process paperless PAN cards directly.
                      </p>
                      {requestVleMsg && (
                        <p className="text-xs font-semibold text-emerald-700 mt-1">{requestVleMsg}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleRequestVle}
                    disabled={requestingVle || vleProfile?.vleRequested}
                    className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-emerald-600 text-white text-xs font-bold transition shadow-md shadow-violet-500/20 whitespace-nowrap"
                  >
                    {requestingVle ? "Submitting..." : vleProfile?.vleRequested ? "✓ ID Requested (Pending Admin Approval)" : "Request UTI ID Activation →"}
                  </button>
                </div>
              )}

              {/* Grid of the 6 Client-Specified PAN Services */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {PAN_SERVICES.map(p => {
                  const matched = services.find(s => s.id === p.id);
                  const item = matched ? { ...p, ...matched } : p;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id === "PAN-UTI") {
                          setUtiModalOpen(true);
                          return;
                        }
                        if (item.id === "PAN-UTI-COUPON") {
                          setBuyCouponOpen(true);
                          return;
                        }
                        if (item.id === "PAN-UTI-STATUS") {
                          setUtiStatusOpen(true);
                          return;
                        }
                        if (item.id === "PAN-NSDL-STATUS") {
                          setNsdlStatusOpen(true);
                          return;
                        }
                        if (item.id === "PAN-NSDL") {
                          setNsdlModalOpen(true);
                          return;
                        }
                        setShowPanServices(false);
                        openApplication({ ...item, category: "PAN" });
                      }}
                      className="group rounded-3xl border border-[#E2E8F0] bg-white p-5 text-left hover:border-violet-300 hover:shadow-xl hover:-translate-y-1 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: item.color + "20" }}>
                          {item.icon}
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700">PAN SERVICE</span>
                      </div>
                      <h4 className="font-bold text-[#0F172A] mt-4">{item.name}</h4>
                      <p className="text-xs text-[#64748B] mt-1">⏱ {item.processingTime}</p>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{item.description}</p>
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="rounded-xl bg-[#F8FAFC] p-3">
                          <p className="text-[9px] text-[#94A3B8]">Customer Price</p>
                          <p className="font-bold text-sm">{item.customerPrice === 0 ? "Free" : `₹${item.customerPrice}`}</p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 p-3">
                          <p className="text-[9px] text-emerald-600">Your Commission</p>
                          <p className="font-bold text-sm text-emerald-700">{item.commission === 0 ? "Free" : `₹${item.commission}`}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {item.documents?.map((d: string) => (
                          <span key={d} className="text-[9px] px-2 py-1 rounded-full bg-[#F1F4F9] text-[#475569]">{d}</span>
                        ))}
                      </div>
                      <div className="mt-4 text-sm font-bold text-[#4F46E5] group-hover:translate-x-1 transition-transform">
                        Open {item.name} →
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buy Coupons Modal */}
      {buyCouponOpen && (
        <div className="fixed inset-0 z-50 bg-[#07111F]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-[#0F172A]">Buy UTI/NSDL PAN Coupons</h3>
                <p className="text-[11px] text-slate-400">Deducted directly from your LD Wallet balance</p>
              </div>
              <button onClick={() => setBuyCouponOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block">
                <span className="font-semibold text-slate-700 mb-1 block">Coupon Type</span>
                <select
                  value={buyType}
                  onChange={(e) => setBuyType(e.target.value)}
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
                  value={buyQty}
                  onChange={(e) => setBuyQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-violet-500"
                />
              </label>

              <div className="rounded-2xl bg-violet-50 border border-violet-100 p-3 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-violet-700 font-medium">Total Cost:</span>
                  <span className="font-mono font-bold text-violet-900 text-sm">
                    ₹{(buyQty * (buyType === "2" ? 72 : 107)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-violet-600 pt-1 border-t border-violet-200/50">
                  <span>Available Wallet Balance:</span>
                  <span className="font-mono font-bold">₹{Number(wallet?.balance || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleBuyCoupons}
              disabled={buyingCoupon || (Number(wallet?.balance || 0) < (buyQty * (buyType === "2" ? 72 : 107)))}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-violet-500/20 disabled:opacity-50"
            >
              {buyingCoupon ? "Processing Allocation..." : Number(wallet?.balance || 0) < (buyQty * (buyType === "2" ? 72 : 107)) ? "Insufficient Wallet Balance" : "Confirm & Pay from Wallet"}
            </button>
          </div>
        </div>
      )}

      {/* UTI PAN Hub Modal */}
      {utiModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#07111F]/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setUtiModalOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-xl">🏢</div>
                <div>
                  <h3 className="font-bold text-base text-[#0F172A]">UTI PSA Paperless PAN Hub</h3>
                  <p className="text-[11px] text-slate-400">Official Government Channel via LD Service Zone</p>
                </div>
              </div>
              <button onClick={() => setUtiModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>

            {vleProfile?.hasVle ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-900 to-indigo-950 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Official Agent Active</span>
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/10 font-bold text-violet-200">
                      ID: {vleProfile.vleId}
                    </span>
                  </div>
                  <p className="text-sm font-extrabold">UTIITSL PSA Authorized VLE</p>
                  <p className="text-xs text-slate-300">
                    Available Coupons: <span className="font-mono font-bold text-emerald-300">{vleProfile.vleStatus?.couponsAvailable ?? "Active"}</span>
                  </p>
                  <p className="text-[10px] text-violet-300">Credential issued & backed by LD Service Zone</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setUtiModalOpen(false);
                      setBuyCouponOpen(true);
                    }}
                    className="p-3.5 rounded-2xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-left space-y-1 transition"
                  >
                    <span className="text-lg">🎟️</span>
                    <p className="font-bold text-xs text-violet-900">Buy UTI Coupons</p>
                    <p className="text-[10px] text-violet-700">Add coupons to your UTI ID</p>
                  </button>

                  <a
                    href="https://www.psaonline.utiitsl.com/psaonline/"
                    target="_blank"
                    rel="noreferrer"
                    className="p-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-left space-y-1 transition"
                  >
                    <span className="text-lg">↗</span>
                    <p className="font-bold text-xs text-indigo-900">Launch UTI Portal</p>
                    <p className="text-[10px] text-indigo-700">Login to PSAonline</p>
                  </a>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">Need a password reset for your UTI PSA portal?</p>
                  <p className="text-[11px]">Contact your LD Service Zone distributor support or ask admin to reset your credentials instantly.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 via-indigo-50 to-blue-50 border border-violet-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700 bg-white px-2 py-0.5 rounded-md border border-violet-200">
                    ID Via LD Service Zone
                  </span>
                  <h4 className="font-bold text-sm text-[#0F172A]">Get Your Official UTI PSA ID Through Us</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    LD Service Zone is an authorized distributor providing direct government UTIITSL VLE Agent IDs.
                    With your ID, you can issue paperless biometric thumbprint & Aadhaar OTP PAN cards in minutes!
                  </p>
                </div>

                {requestVleMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    {requestVleMsg}
                  </div>
                )}

                <button
                  onClick={handleRequestVle}
                  disabled={requestingVle || vleProfile?.vleRequested}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:from-emerald-600 disabled:to-emerald-700 text-white font-bold text-xs transition shadow-lg shadow-violet-500/20"
                >
                  {requestingVle
                    ? "Submitting to LD Service Zone..."
                    : vleProfile?.vleRequested
                    ? "✓ UTI ID Requested — Admin is Activating"
                    : "Request Official UTI PSA ID Now →"}
                </button>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Need to apply for a customer right now?</span>
                  <button
                    onClick={() => {
                      setUtiModalOpen(false);
                      setShowPanServices(false);
                      const s = services.find(x => x.id === "PAN-NEW") || { id: "PAN-NEW", name: "New PAN Card", customerPrice: 107, commission: 32, documents: ["Aadhaar", "DOB Proof", "Photograph"] };
                      openApplication({ ...s, category: "PAN" });
                    }}
                    className="text-xs font-bold text-violet-700 hover:underline"
                  >
                    Use Assisted Form 49A →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UTI PAN Status Modal */}
      {utiStatusOpen && (
        <div className="fixed inset-0 z-50 bg-[#07111F]/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setUtiStatusOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⏱️</span>
                <div>
                  <h3 className="font-bold text-base text-[#0F172A]">UTI PAN Application Status</h3>
                  <p className="text-[11px] text-slate-400">Track UTIITSL Application / Coupon</p>
                </div>
              </div>
              <button onClick={() => setUtiStatusOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block">
                <span className="font-semibold text-slate-700 mb-1 block">Application / Coupon Number *</span>
                <input
                  type="text"
                  value={utiAppNo}
                  onChange={e => setUtiAppNo(e.target.value)}
                  placeholder="e.g. U-A123456789 or Coupon No"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-violet-500 font-mono uppercase"
                />
              </label>

              <label className="block">
                <span className="font-semibold text-slate-700 mb-1 block">Applicant Date of Birth (Optional)</span>
                <input
                  type="date"
                  value={utiDob}
                  onChange={e => setUtiDob(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-violet-500"
                />
              </label>
            </div>

            <div className="p-3 rounded-2xl bg-violet-50 border border-violet-100 text-[11px] text-violet-800">
              ℹ️ Opens the official Government UTIITSL Live PAN Tracking portal in real-time.
            </div>

            <a
              href="https://www.trackpan.utiitsl.com/PANONLINE/trackApp"
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-violet-500/20 flex items-center justify-center gap-2 text-center"
            >
              <span>Track Live on Official UTI Portal ↗</span>
            </a>
          </div>
        </div>
      )}

      {/* NSDL PAN Status Modal */}
      {nsdlStatusOpen && (
        <div className="fixed inset-0 z-50 bg-[#07111F]/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setNsdlStatusOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🔎</span>
                <div>
                  <h3 className="font-bold text-base text-[#0F172A]">NSDL PAN Application Status</h3>
                  <p className="text-[11px] text-slate-400">Track NSDL TIN 15-Digit Acknowledgement</p>
                </div>
              </div>
              <button onClick={() => setNsdlStatusOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block">
                <span className="font-semibold text-slate-700 mb-1 block">15-Digit Acknowledgement Number *</span>
                <input
                  type="text"
                  value={nsdlAckNo}
                  onChange={e => setNsdlAckNo(e.target.value.replace(/\D/g, "").slice(0, 15))}
                  placeholder="e.g. 881010101010101"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-mono text-sm"
                />
              </label>
            </div>

            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 text-[11px] text-blue-800">
              ℹ️ Opens the official Protean / NSDL TIN e-Gov Tracking system.
            </div>

            <a
              href="https://tin.tin.nsdl.com/pantan/StatusTrack.html"
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 text-center"
            >
              <span>Track Live on Official NSDL TIN Portal ↗</span>
            </a>
          </div>
        </div>
      )}

      {/* NSDL (Protean) PAN Portal Modal */}
      {nsdlModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#07111F]/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setNsdlModalOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl">📑</div>
                <div>
                  <h3 className="font-bold text-base text-[#0F172A]">NSDL (Protean) eKYC PAN Portal</h3>
                  <p className="text-[11px] text-slate-400">Fast Paperless Biometric & OTP PAN Application</p>
                </div>
              </div>
              <button onClick={() => setNsdlModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300">Protean Official Portal</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 font-bold text-emerald-300">Fast 2-Hour e-PAN</span>
                </div>
                <h4 className="text-sm font-extrabold">Instant Paperless Biometric PAN Application</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Retailers submit applications directly on the official Protean / NSDL portal using customer Aadhaar biometric thumbprint or mobile OTP. No physical paper sending required!
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                <p className="font-bold text-slate-900">How to process on NSDL portal:</p>
                <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600">
                  <li>Launch the official Protean / NSDL Online Services portal.</li>
                  <li>Select Application Type: <strong>New PAN - Indian Citizen (Form 49A)</strong>.</li>
                  <li>Select <strong>Paperless e-KYC & e-Sign</strong> (Scan thumbprint on biometric device).</li>
                  <li>e-PAN is generated and emailed within 2 hours; physical card is mailed to customer address.</li>
                </ol>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <a
                  href="https://onlineservices.nsdl.com/paam/endUserRegisterContact.html"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 text-center"
                >
                  <span>Launch Official NSDL Portal ↗</span>
                </a>
                <button
                  onClick={() => {
                    setNsdlModalOpen(false);
                    setNsdlStatusOpen(true);
                  }}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Track Application Status →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedService && (
        <div className="fixed inset-0 bg-[#07111F]/70 backdrop-blur-sm z-50 flex items-center justify-end" onClick={() => setSelectedService(null)}>
          <div className="bg-[#F8FAFC] w-full max-w-xl h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-[#E2E8F0] p-5 sm:p-6 flex items-start justify-between">
              <div><div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase">{selectedService.category || "SERVICE"}</div><h3 className="font-display font-extrabold text-[#0F172A] text-xl mt-2">{selectedService.name}</h3><div className="flex gap-2 mt-2"><span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">Commission ₹{selectedService.commission}</span><span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">Customer ₹{selectedService.customerPrice}</span></div></div>
              <button onClick={() => setSelectedService(null)} className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] text-xl">×</button>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-5 gap-1.5">
                {["Details", "Documents", "Review", "Payment", "Submit"].map((st, i) => <div key={st} className="text-center"><div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-gradient-to-br from-[#1D56D8] to-[#6D5DFB] text-white shadow-md" : "bg-white border border-[#E2E8F0] text-[#94A3B8]"}`}>{i + 1}</div><p className={`text-[9px] mt-1.5 ${i === 0 ? "font-bold text-[#1D56D8]" : "text-[#94A3B8]"}`}>{st}</p></div>)}
              </div>

              <div className="rounded-3xl bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-100 p-4 flex gap-3">
                <div className="w-11 h-11 shrink-0 rounded-2xl bg-white flex items-center justify-center text-2xl shadow-sm">{selectedService.id?.startsWith("PAN-") ? "🪪" : iconFor(selectedService.category)}</div>
                <div><p className="font-bold text-[#0F172A]">Start your {selectedService.name}</p><p className="text-xs text-[#64748B] mt-1">Enter applicant details below. Your application will be saved to the project backend.</p></div>
              </div>

              <section className="rounded-3xl bg-white border border-[#E2E8F0] p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4"><span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">👤</span><div><h4 className="font-bold text-[#0F172A]">Applicant Details</h4><p className="text-[10px] text-[#94A3B8]">Customer information</p></div></div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {fieldDefs.map(f => {
                    const key = f;
                    const type = f === "Email Address" ? "email" : f === "Date of Birth" ? "date" : f.includes("Number") || f === "Mobile Number" ? "tel" : "text";
                    return <label key={f} className="block"><span className="block text-[11px] font-semibold text-[#64748B] mb-1.5">{f}</span><input type={type} value={form[key] || ""} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} placeholder={`Enter ${f.toLowerCase()}`} className="w-full px-3.5 py-3 rounded-2xl border border-[#E2E8F0] bg-[#FCFDFE] text-sm text-[#0F172A] outline-none focus:border-[#1D56D8] focus:ring-4 focus:ring-blue-50 transition-all" /></label>;
                  })}
                </div>
              </section>

              <section className="rounded-3xl bg-white border border-[#E2E8F0] p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4"><span className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">📎</span><div><h4 className="font-bold text-[#0F172A]">Required Documents</h4><p className="text-[10px] text-[#94A3B8]">Attach files for the application</p></div></div>
                <div className="space-y-2.5">
                  {selectedService.documents.map((d: string) => (
                    <button key={d} type="button" onClick={() => fileRefs.current[d]?.click()} className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl border border-dashed border-[#D8E0EA] bg-[#FCFDFE] hover:bg-blue-50/40 hover:border-blue-300 transition-all text-left">
                      <div className="flex items-center gap-3"><span className={`w-10 h-10 rounded-xl flex items-center justify-center ${files[d] ? "bg-emerald-50" : "bg-slate-100"}`}>{files[d] ? "✓" : "📄"}</span><div><p className="text-sm font-semibold text-[#0F172A]">{d}</p><p className="text-[10px] text-[#94A3B8]">{files[d] || "Click to choose a file"}</p></div></div><span className="text-xs font-bold text-[#1D56D8]">{files[d] ? "Change" : "Upload"}</span><input ref={el => { fileRefs.current[d] = el; }} type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => { const file = e.target.files?.[0]; if (file) { setFiles(prev => ({ ...prev, [d]: file.name })); setSelectedFiles(prev => ({ ...prev, [d]: file })); } }} />
                    </button>
                  ))}
                </div>
              </section>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 flex gap-3"><span className="text-lg">🛡️</span><div><p className="text-xs font-bold text-blue-900">Important</p><p className="text-[10px] text-blue-700 mt-1">Use valid customer details and clear documents. Your application is stored by the backend and visible to authorized admin users.</p></div></div>

              {selectedService.customerPrice > 0 && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-700">LD Wallet Balance:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{Number(wallet?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {submitMessage && <div className={`rounded-2xl p-4 text-sm font-semibold ${submitMessage.includes("successfully") ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>{submitMessage}</div>}

              <button type="button" disabled={submitting} onClick={submitApplication} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#1D56D8] to-[#6D5DFB] hover:from-[#1849C0] hover:to-[#5B4CE0] disabled:opacity-60 text-white font-bold shadow-lg shadow-blue-200 transition-all">
                {submitting ? "Processing…" : selectedService.customerPrice > 0 ? `Pay ₹${selectedService.customerPrice} from Wallet & Submit →` : "Submit Application →"}
              </button>
              <p className="text-center text-[10px] text-[#94A3B8]">🔒 Form data is sent to your local /api/applications backend.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
