import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/shared/api/client";
import { useWallet } from "@/features/session/AppContext";

const BASE_CATEGORIES = ["All", "Government", "PAN", "Tax", "Certificate", "Recharge", "Bills", "Other"];

const PAN_SERVICES = [
  { id: "PAN-NEW", name: "New PAN", icon: "🆕", commission: 32, processingTime: "7-15 days", customerPrice: 107, documents: ["Aadhaar", "DOB Proof", "Photograph"], color: "#F87171" },
  { id: "PAN-CORRECTION", name: "PAN Correction", icon: "✏️", commission: 28, processingTime: "7-15 days", customerPrice: 107, documents: ["PAN Card", "Aadhaar", "Supporting Proof"], color: "#F59E0B" },
  { id: "PAN-REPRINT", name: "PAN Reprint", icon: "🖨️", commission: 20, processingTime: "7-15 days", customerPrice: 50, documents: ["PAN Number", "Aadhaar"], color: "#06B6D4" },
  { id: "PAN-FIND", name: "PAN Find", icon: "🔍", commission: 10, processingTime: "Instant", customerPrice: 20, documents: ["Aadhaar"], color: "#4F46E5" },
  { id: "PAN-STATUS", name: "PAN Status", icon: "📋", commission: 0, processingTime: "Instant", customerPrice: 0, documents: ["Acknowledgement Number"], color: "#10B981" },
  { id: "PAN-UTI", name: "UTI Services", icon: "🏢", commission: 40, processingTime: "7-15 days", customerPrice: 120, documents: ["Aadhaar", "PAN"], color: "#7C3AED" },
  { id: "PAN-NSDL", name: "NSDL Services", icon: "📑", commission: 35, processingTime: "7-15 days", customerPrice: 120, documents: ["Aadhaar", "PAN"], color: "#1D56D8" },
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

  useEffect(() => { api<any>("/services").then(d => setServices(d.services || [])).catch(() => setServices([])).finally(() => setCatalogLoading(false)); }, []);

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
      if (selectedService.id === "PAN-STATUS") return ["Acknowledgement Number", "Mobile Number"];
      if (selectedService.id === "PAN-REPRINT") return ["Full Name", "PAN Number", "Aadhaar Number", "Mobile Number"];
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
              <div><div className="inline-flex px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-[10px] font-bold uppercase">PAN</div><h3 className="font-display font-extrabold text-[#0F172A] text-xl mt-2">PAN Card Services</h3><p className="text-xs text-[#64748B] mt-1">Choose New PAN, Correction, Reprint, Find, Status, UTI or NSDL.</p></div>
              <button onClick={() => setShowPanServices(false)} className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] text-xl">×</button>
            </div>
            <div className="p-5 sm:p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PAN_SERVICES.filter(p => services.some(s => s.id === p.id)).map(p => ({ ...p, ...services.find(s => s.id === p.id) })).map(p => (
                <button key={p.id} type="button" onClick={() => { setShowPanServices(false); openApplication({ ...p, category: "PAN" }); }}
                  className="group rounded-3xl border border-[#E2E8F0] bg-white p-5 text-left hover:border-violet-300 hover:shadow-xl hover:-translate-y-1 transition-all">
                  <div className="flex items-start justify-between"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: p.color + "20" }}>{p.icon}</div><span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700">PAN SERVICE</span></div>
                  <h4 className="font-bold text-[#0F172A] mt-4">{p.name}</h4><p className="text-xs text-[#64748B] mt-1">⏱ {p.processingTime}</p>
                  <div className="grid grid-cols-2 gap-2 mt-4"><div className="rounded-xl bg-[#F8FAFC] p-3"><p className="text-[9px] text-[#94A3B8]">Customer Price</p><p className="font-bold text-sm">{p.customerPrice === 0 ? "Free" : `₹${p.customerPrice}`}</p></div><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[9px] text-emerald-600">Your Commission</p><p className="font-bold text-sm text-emerald-700">{p.commission === 0 ? "Free" : `₹${p.commission}`}</p></div></div>
                  <div className="flex flex-wrap gap-1.5 mt-4">{p.documents.map((d: string) => <span key={d} className="text-[9px] px-2 py-1 rounded-full bg-[#F1F4F9] text-[#475569]">{d}</span>)}</div>
                  <div className="mt-4 text-sm font-bold text-[#4F46E5] group-hover:translate-x-1 transition-transform">Open {p.name} →</div>
                </button>
              ))}
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
