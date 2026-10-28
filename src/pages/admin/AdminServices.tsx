import { useEffect, useState, useMemo } from "react";
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
  Zap,
  Tag,
  IndianRupee,
  SlidersHorizontal,
  Check,
  Car,
  Fingerprint,
  CreditCard,
  Briefcase,
  Landmark,
  Layers,
  ChevronDown,
  ChevronRight,
  Grid,
  ListFilter,
  ShoppingBag,
  Award,
} from "lucide-react";
import { api } from "@/shared/api/client";

type Service = {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  customerPrice: number;
  commission: number;
  processingTime: string;
  documents: string[];
  color?: string;
  status?: "active" | "disabled";
  provider?: string;
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
  subCategory: "",
  customerPrice: 0,
  commission: 0,
  processingTime: "Instant",
  documents: "",
  color: "#4F46E5",
  provider: "manual",
  status: "active",
};

const CATEGORIES = [
  "Vehicle Services",
  "Aadhaar Services",
  "Voter Services",
  "PAN Card Services",
  "Citizen Documents",
  "Utilities & Banking",
  "Government",
  "PAN",
  "Tax",
  "Certificate",
  "Other",
];

export const DEFAULT_SUBCATEGORIES: Record<string, string> = {
  // Manual Voter
  "S001": "Voter ID Services",
  "VOTER-NEW": "Voter ID Services",
  "VOTER-CORRECTION": "Voter ID Services",
  "VOTER-ADDRESS": "Voter ID Services",
  "VOTER-DOWNLOAD": "Voter ID Services",
  // Manual Driving Licence
  "S002": "Driving Licence (DL)",
  "DL-NEW": "Driving Licence (DL)",
  "DL-LEARNER": "Driving Licence (DL)",
  "DL-RENEWAL": "Driving Licence (DL)",
  "DL-CORRECTION": "Driving Licence (DL)",
  "DL-DUPLICATE": "Driving Licence (DL)",
  // Manual RC
  "S003": "RC Smart Card",
  "RC-NEW": "RC Smart Card",
  "RC-TRANSFER": "RC Smart Card",
  "RC-CORRECTION": "RC Smart Card",
  "RC-DUPLICATE": "RC Smart Card",
  // Manual Tax & GST
  "S004": "Income Tax (ITR)",
  "ITR-1-REVISED": "Income Tax (ITR)",
  "S005": "GST Services",
  "GST-REG": "GST Services",
  "GST-CORRECTION": "GST Services",
  // Certificates
  "INCOME-NEW": "Income Certificate",
  "INCOME-RENEW": "Income Certificate",
  "CASTE-NEW": "Caste Certificate",
  "CASTE-CORRECTION": "Caste Certificate",
  // Live PAN
  "PAN-NEW": "PAN Card (Form 49A)",
  "PAN-CORRECTION": "PAN Correction & Reprint",
  "PAN-REPRINT": "PAN Correction & Reprint",
  "PAN-UTI": "UTI Paperless PAN",
  "PAN-FIND": "PAN Search by Aadhaar",
  "PAN-NSDL": "NSDL Paperless PAN",
  "PAN-UTI-STATUS": "PAN Status Tracking",
  "PAN-NSDL-STATUS": "PAN Status Tracking",
  "PAN-UTI-COUPON": "UTI Coupons & VLE",
  "PAN-STATUS": "PAN Status Tracking",

  // APINICE Vehicle
  "SVC-RC-PRINT": "RC Services",
  "SVC-DL-PRINT": "Driving Licence",
  "SVC-LL-PDF": "Driving Licence",
  "SVC-VEHICLE-CHALLAN": "Vehicle Verification",
  "SVC-CHASSIS-TO-RC": "Vehicle Verification",
  "SVC-RC-TO-MOBILE": "Vehicle Verification",
  "SVC-MOBILE-TO-RC": "Vehicle Verification",

  // APINICE Citizen & Identity
  "SVC-RATION-PRINT": "Civil Supplies & Ration",
  "SVC-ABHA-CARD": "Health & Social Cards",
  "SVC-ESHRAM-CARD": "Health & Social Cards",
  "SVC-AGRISTACK-FARMER": "Farmer & Social Cards",
  "SVC-AADHAAR-PVC": "Aadhaar Services",
  "SVC-AADHAAR-MANUAL": "Aadhaar Services",
  "SVC-VOTER-VERIFY": "Voter Services",
  "SVC-VOTER-PDF": "Voter Services",
  "SVC-VOTER-MOBILE-LINK": "Voter Services",
  "SVC-VOTER-MANUAL-PDF": "Voter Services",
  "SVC-PASSPORT-VERIFY": "Citizen Verification",

  // APINICE Tax & Business
  "SVC-PAN-FIND": "PAN Search & Extraction",
  "SVC-PAN-DETAILS": "PAN Search & Extraction",
  "SVC-PAN-PRINT-V2": "PAN Search & Extraction",
  "SVC-PAN-TO-AADHAAR": "PAN Search & Extraction",
  "SVC-PAN-ADDRESS-DETAILS": "PAN Search & Extraction",
  "SVC-PAN-OCR": "PAN Search & Extraction",
  "SVC-PAN-TO-GST": "GST & Business",
  "SVC-GST-TO-PAN": "GST & Business",
  "SVC-GST-DETAILS": "GST & Business",
  "SVC-UDYOG-AADHAAR": "MSME & Enterprise",

  // APINICE Banking & Utilities
  "SVC-IFSC-DETAILS": "Banking Verification",
  "SVC-NPCI-STATUS": "Banking Verification",
  "SVC-ELECTRIC-BILL": "Utility Bills",

  // APINICE Additional 40 Services
  "SVC-DL-TO-MOBILE": "Driving Licence",
  "SVC-DL-TO-MOBILE-AKFAST": "Driving Licence",
  "SVC-CHALLAN-MOBILE": "Vehicle Verification",
  "SVC-CHALLAN-DETAILS": "Vehicle Verification",
  "SVC-DL-ADVANCE": "Driving Licence",
  "SVC-DL-PDF-BLUE": "Driving Licence",
  "SVC-DL-PDF-WHITE": "Driving Licence",
  "SVC-RC-DETAILS-VERIFY": "RC Services",
  "SVC-RC-PDF-DOWNLOAD": "RC Services",
  "SVC-RC-PRINT-OTHER": "RC Services",
  "SVC-VEHICLE-RC-PDF-V2": "RC Services",
  "SVC-NSDL-ACCOUNT-OPENING": "Banking Verification",
  "SVC-MCA-CIN-SEARCH": "Corporate & Business",
  "SVC-DIN-VERIFICATION": "Corporate & Business",
  "SVC-TIN-VERIFICATION": "GST & Business",
  "SVC-MOBILE-TO-MULTI-ACCOUNT": "Banking Verification",
  "SVC-MOBILE-TO-MULTI-BANK-AKFAST": "Banking Verification",
  "SVC-MOBILE-TO-IFSC-ACCOUNT": "Banking Verification",
  "SVC-AADHAAR-PAN-LINK-CHECK": "PAN Search & Extraction",
  "SVC-MOBILE-TO-PAN-LINK": "PAN Search & Extraction",
  "SVC-PAN-TO-BANK-LINK": "PAN Search & Extraction",
  "SVC-AADHAAR-TO-PAN-V2": "PAN Search & Extraction",
  "SVC-MASK-PAN-VERIFICATION": "PAN Search & Extraction",
  "SVC-PAN-TO-DETAILS": "PAN Search & Extraction",
  "SVC-AADHAAR-MASKING": "Aadhaar Services",
  "SVC-MASK-AADHAAR-VERIFICATION": "Aadhaar Services",
  "SVC-UP-RATION-TO-AADHAAR": "Civil Supplies & Ration",
  "SVC-NPCI-STATUS-AKFAST": "Banking Verification",
  "SVC-ESHRAM-MOBILE-UPDATE": "Health & Social Cards",
  "SVC-UID-TO-FULL-DETAILS": "Aadhaar Services",
  "SVC-RATION-PDF-BY-AADHAAR": "Civil Supplies & Ration",
  "SVC-RATION-PDF-BY-RATION": "Civil Supplies & Ration",
  "SVC-RATION-TO-AADHAAR-ALL": "Civil Supplies & Ration",
  "SVC-RATION-TO-UID-ALL-V2": "Civil Supplies & Ration",
  "SVC-AGRISTACK-FARMER-STATUS": "Farmer & Social Cards",
  "SVC-FARMER-PDF-AKFAST": "Farmer & Social Cards",
  "SVC-RTPS-CERTIFICATE-BR": "Certificates",
  "SVC-VOTER-LINK-REQUEST-NEXT": "Voter Services",
  "SVC-MOBILE-DETAILS-FIND": "Telecom & Mobile",
  "SVC-MOBILE-NUMBER-INFO": "Telecom & Mobile",
};

export function getServiceSubCategory(s: Service): string {
  if (s.subCategory && s.subCategory.trim()) return s.subCategory.trim();
  if (DEFAULT_SUBCATEGORIES[s.id]) return DEFAULT_SUBCATEGORIES[s.id];
  if (/voter/i.test(s.name) || /voter/i.test(s.id)) return "Voter Services";
  if (/driving|dl\b|licence/i.test(s.name) || /^dl/i.test(s.id)) return "Driving Licence";
  if (/rc\b|vehicle|chassis/i.test(s.name) || /^rc/i.test(s.id)) return "RC Services";
  if (/pan/i.test(s.name) || /^pan/i.test(s.id)) return "PAN Services";
  if (/gst|itr|tax/i.test(s.name)) return "Tax & GST";
  if (/aadhaar/i.test(s.name)) return "Aadhaar Services";
  if (/caste|income|certificate/i.test(s.name)) return "Certificates";
  return "General Services";
}

export function getSubCategoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("rc")) return <Car size={15} className="text-cyan-600" />;
  if (n.includes("driving") || n.includes("licence") || n.includes("dl")) return <ShieldCheck size={15} className="text-blue-600" />;
  if (n.includes("voter")) return <Award size={15} className="text-amber-600" />;
  if (n.includes("pan")) return <CreditCard size={15} className="text-violet-600" />;
  if (n.includes("gst") || n.includes("tax") || n.includes("itr") || n.includes("msme") || n.includes("corporate")) return <Briefcase size={15} className="text-emerald-600" />;
  if (n.includes("aadhaar")) return <Fingerprint size={15} className="text-indigo-600" />;
  if (n.includes("ration") || n.includes("civil")) return <ShoppingBag size={15} className="text-rose-600" />;
  if (n.includes("bank") || n.includes("ifsc") || n.includes("npci")) return <Landmark size={15} className="text-teal-600" />;
  if (n.includes("bill") || n.includes("electric") || n.includes("utilit")) return <Zap size={15} className="text-amber-500" />;
  if (n.includes("telecom") || n.includes("mobile")) return <Zap size={15} className="text-blue-500" />;
  if (n.includes("certificate") || n.includes("caste") || n.includes("income")) return <Award size={15} className="text-purple-600" />;
  return <Layers size={15} className="text-slate-600" />;
}

export const APINICE_SERVICE_IDS = new Set([
  "SVC-RC-PRINT",
  "SVC-DL-PRINT",
  "SVC-RATION-PRINT",
  "SVC-VEHICLE-CHALLAN",
  "SVC-ABHA-CARD",
  "SVC-VOTER-VERIFY",
  "SVC-VOTER-PDF",
  "SVC-VOTER-MOBILE-LINK",
  "SVC-LL-PDF",
  "SVC-CHASSIS-TO-RC",
  "SVC-RC-TO-MOBILE",
  "SVC-ESHRAM-CARD",
  "SVC-AADHAAR-PVC",
  "SVC-AGRISTACK-FARMER",
  "SVC-UDYOG-AADHAAR",
  "SVC-NPCI-STATUS",
  "SVC-GST-DETAILS",
  "SVC-PASSPORT-VERIFY",
  "SVC-IFSC-DETAILS",
  "SVC-ELECTRIC-BILL",
  "SVC-PAN-FIND",
  "SVC-PAN-DETAILS",
  "SVC-VOTER-MANUAL-PDF",
  "SVC-AADHAAR-MANUAL",
  "SVC-PAN-PRINT-V2",
  "SVC-GST-TO-PAN",
  "SVC-PAN-TO-GST",
  "SVC-PAN-TO-AADHAAR",
  "SVC-MOBILE-TO-RC",
  "SVC-PAN-ADDRESS-DETAILS",
  "SVC-PAN-OCR",
  // 40 new services
  "SVC-DL-TO-MOBILE",
  "SVC-DL-TO-MOBILE-AKFAST",
  "SVC-CHALLAN-MOBILE",
  "SVC-CHALLAN-DETAILS",
  "SVC-DL-ADVANCE",
  "SVC-DL-PDF-BLUE",
  "SVC-DL-PDF-WHITE",
  "SVC-RC-DETAILS-VERIFY",
  "SVC-RC-PDF-DOWNLOAD",
  "SVC-RC-PRINT-OTHER",
  "SVC-VEHICLE-RC-PDF-V2",
  "SVC-NSDL-ACCOUNT-OPENING",
  "SVC-MCA-CIN-SEARCH",
  "SVC-DIN-VERIFICATION",
  "SVC-TIN-VERIFICATION",
  "SVC-MOBILE-TO-MULTI-ACCOUNT",
  "SVC-MOBILE-TO-MULTI-BANK-AKFAST",
  "SVC-MOBILE-TO-IFSC-ACCOUNT",
  "SVC-AADHAAR-PAN-LINK-CHECK",
  "SVC-MOBILE-TO-PAN-LINK",
  "SVC-PAN-TO-BANK-LINK",
  "SVC-AADHAAR-TO-PAN-V2",
  "SVC-MASK-PAN-VERIFICATION",
  "SVC-PAN-TO-DETAILS",
  "SVC-AADHAAR-MASKING",
  "SVC-MASK-AADHAAR-VERIFICATION",
  "SVC-UP-RATION-TO-AADHAAR",
  "SVC-NPCI-STATUS-AKFAST",
  "SVC-ESHRAM-MOBILE-UPDATE",
  "SVC-UID-TO-FULL-DETAILS",
  "SVC-RATION-PDF-BY-AADHAAR",
  "SVC-RATION-PDF-BY-RATION",
  "SVC-RATION-TO-AADHAAR-ALL",
  "SVC-RATION-TO-UID-ALL-V2",
  "SVC-AGRISTACK-FARMER-STATUS",
  "SVC-FARMER-PDF-AKFAST",
  "SVC-RTPS-CERTIFICATE-BR",
  "SVC-VOTER-LINK-REQUEST-NEXT",
  "SVC-MOBILE-DETAILS-FIND",
  "SVC-MOBILE-NUMBER-INFO",
]);

export const isApiniceService = (s: Service) =>
  APINICE_SERVICE_IDS.has(s.id) || (s as any).provider === "apinice" || s.id.startsWith("SVC-");

export default function AdminServices() {
  const [activeTab, setActiveTab] = useState<"catalog" | "apinice" | "panmitra" | "all">("catalog");

  // Catalog state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<any>(EMPTY_SERVICE);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Search & Filter state
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("All");
  const [catalogSubCategory, setCatalogSubCategory] = useState("All");

  const [apiniceSearch, setApiniceSearch] = useState("");
  const [apiniceCategory, setApiniceCategory] = useState("All");
  const [apiniceSubCategory, setApiniceSubCategory] = useState("All");

  // Visual View Mode: "grouped" (sections by Subcategory) vs "grid" (flat list)
  const [viewMode, setViewMode] = useState<"grouped" | "grid">("grouped");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Quick Price Edit Modal
  const [quickPriceModal, setQuickPriceModal] = useState<{
    service: Service;
    customerPrice: number;
    commission: number;
  } | null>(null);
  const [quickPriceSaving, setQuickPriceSaving] = useState(false);

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

  const [apiniceBalance, setApiniceBalance] = useState<number | null>(null);
  const [apiniceLoading, setApiniceLoading] = useState(false);

  const loadCatalog = () =>
    api<any>("/services")
      .then((d) => setServices(d.services || []))
      .catch((e) => setError(e.message));

  const loadApiniceBalance = async () => {
    setApiniceLoading(true);
    try {
      const res = await api<any>("/apinice/balance");
      if (res && res.balance !== undefined) {
        setApiniceBalance(Number(res.balance));
      }
    } catch {
      // ignore
    } finally {
      setApiniceLoading(false);
    }
  };

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
    loadApiniceBalance();
    api<any>("/auth/me")
      .then((d) => setCurrentUser(d.user))
      .catch(() => {});
  }, []);

  const isSuperAdmin =
    currentUser?.role === "admin" &&
    (currentUser?.adminRole === "super_admin" || !currentUser?.adminRole);

  // Filtered Services Lists
  const apiniceServices = useMemo(() => services.filter(isApiniceService), [services]);
  const generalServices = useMemo(() => services.filter((s) => !isApiniceService(s)), [services]);

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
      subCategory: s.subCategory || getServiceSubCategory(s),
      customerPrice: s.customerPrice ?? 0,
      commission: s.commission ?? 0,
      processingTime: s.processingTime || "Instant",
      documents: (s.documents || []).join(", "),
      status: s.status || "active",
    });
    setError("");
    setOpen(true);
  };

  const saveCatalogService = async () => {
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: String(form.name).trim() || "Service",
        category: String(form.category).trim() || "General",
        subCategory: form.subCategory ? String(form.subCategory).trim() : undefined,
        customerPrice: Math.max(0, Number(form.customerPrice) || 0),
        commission: Math.max(0, Number(form.commission) || 0),
        processingTime: String(form.processingTime || "Instant").trim(),
        documents: String(form.documents || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        color: form.color || "#4F46E5",
        status: form.status === "disabled" ? "disabled" : "active",
      };
      const d = editing
        ? await api<any>(`/services/${encodeURIComponent(editing)}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await api<any>("/services", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      const saved = d.service || d;
      setServices((xs) =>
        editing
          ? xs.map((x) => (x.id === saved.id ? { ...x, ...saved } : x))
          : [saved, ...xs],
      );
      setOpen(false);
      setSuccessMsg(`Service "${saved.name}" updated successfully! Price: ₹${saved.customerPrice}, Commission: ₹${saved.commission}`);
      setTimeout(() => setSuccessMsg(""), 6000);
      loadCatalog();
    } catch (e: any) {
      setError(e.message || "Failed to save service");
    } finally {
      setBusy(false);
    }
  };

  const handleQuickPriceSave = async () => {
    if (!quickPriceModal) return;
    setQuickPriceSaving(true);
    try {
      const price = Math.max(0, Number(quickPriceModal.customerPrice) || 0);
      const comm = Math.max(0, Number(quickPriceModal.commission) || 0);
      const res = await api<any>(`/services/${encodeURIComponent(quickPriceModal.service.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          customerPrice: price,
          commission: comm,
        }),
      });
      const updated = res.service || { ...quickPriceModal.service, customerPrice: price, commission: comm };
      setServices((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
      );
      setSuccessMsg(`Price updated successfully for "${updated.name}"! Customer Price: ₹${price}, Retailer Commission: ₹${comm}`);
      setQuickPriceModal(null);
      setTimeout(() => setSuccessMsg(""), 6000);
      loadCatalog();
    } catch (e: any) {
      alert(e.message || "Failed to update price");
    } finally {
      setQuickPriceSaving(false);
    }
  };

  const handleDeleteService = async (service: Service) => {
    if (!confirm(`Are you sure you want to delete "${service.name}" (${service.id}) from the service catalog?`)) return;
    try {
      await api<any>(`/services/${encodeURIComponent(service.id)}`, { method: "DELETE" });
      setServices((prev) => prev.filter((s) => s.id !== service.id));
      setSuccessMsg(`Service "${service.name}" deleted successfully`);
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (e: any) {
      alert(e.message || "Failed to delete service");
    }
  };

  const handleToggleServiceStatus = async (service: Service) => {
    if (!isSuperAdmin) {
      alert("Permission Denied: Only Super Admin can change service visibility.");
      return;
    }
    const newStatus = service.status === "disabled" ? "active" : "disabled";
    try {
      await api<any>(`/services/${encodeURIComponent(service.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, status: newStatus } : s))
      );
      setSuccessMsg(`Service "${service.name}" is now ${newStatus === "active" ? "Visible / Active" : "Hidden / Disabled"}`);
      setTimeout(() => setSuccessMsg(""), 4000);
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
    (u) => u.role === "retailer" && !u.panmitraVleId && !u.panMitraVleId,
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

        {/* Balance Badges & Tab switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setActiveTab("catalog")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "catalog"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Building2 size={14} className="text-violet-600" />
              <span>Service Catalogue ({generalServices.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("apinice")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "apinice"
                  ? "bg-cyan-600 text-white shadow-sm shadow-cyan-500/25"
                  : "text-slate-600 hover:text-cyan-700 hover:bg-cyan-50/70"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeTab === "apinice" ? "bg-white" : "bg-cyan-500"} animate-pulse`} />
              <span>APINICE Live API ({apiniceServices.length})</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${activeTab === "apinice" ? "bg-cyan-700 text-white" : "bg-cyan-100 text-cyan-800"}`}>
                {apiniceBalance !== null ? `₹${apiniceBalance.toFixed(2)}` : "..."}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("panmitra")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "panmitra"
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/25"
                  : "text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/70"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeTab === "panmitra" ? "bg-white" : "bg-emerald-500"} animate-pulse`} />
              <span>PAN Mitra Gateway (Live API)</span>
            </button>

            <button
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "all"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span>All ({services.length})</span>
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1 rounded-lg hover:bg-emerald-100 transition">
            Dismiss
          </button>
        </div>
      )}

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

      {/* Helper to render services grouped by subcategory */}
      {(() => {
        return null;
      })()}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: GENERAL SERVICE CATALOGUE                              */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "catalog" && (() => {
        const filtered = generalServices.filter((s) => {
          const sub = getServiceSubCategory(s);
          const matchesSearch =
            !catalogSearch ||
            s.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
            s.id.toLowerCase().includes(catalogSearch.toLowerCase()) ||
            sub.toLowerCase().includes(catalogSearch.toLowerCase());
          const matchesCategory =
            catalogCategory === "All" || s.category === catalogCategory;
          const matchesSubCategory =
            catalogSubCategory === "All" || sub === catalogSubCategory;
          return matchesSearch && matchesCategory && matchesSubCategory;
        });

        const availableSubCategories = Array.from(
          new Set(
            generalServices
              .filter(
                (s) => catalogCategory === "All" || s.category === catalogCategory,
              )
              .map(getServiceSubCategory),
          ),
        ).sort();

        const subCounts: Record<string, number> = {};
        for (const s of generalServices) {
          if (catalogCategory === "All" || s.category === catalogCategory) {
            const sub = getServiceSubCategory(s);
            subCounts[sub] = (subCounts[sub] || 0) + 1;
          }
        }

        return (
          <div className="space-y-5">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Search service, subcategory or ID..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-violet-500 bg-slate-50/50"
                    />
                  </div>
                  <select
                    value={catalogCategory}
                    onChange={(e) => {
                      setCatalogCategory(e.target.value);
                      setCatalogSubCategory("All");
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-violet-500 bg-white"
                  >
                    <option value="All">All Main Categories</option>
                    {Array.from(
                      new Set(generalServices.map((s) => s.category)),
                    ).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setViewMode("grouped")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        viewMode === "grouped"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      title="Grouped by Subcategory sections"
                    >
                      <Layers size={13} />
                      <span className="hidden sm:inline">By Subcategory</span>
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        viewMode === "grid"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      title="Flat Grid view"
                    >
                      <Grid size={13} />
                      <span className="hidden sm:inline">Grid</span>
                    </button>
                  </div>

                  <button
                    onClick={startAdd}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md shadow-violet-500/20 transition shrink-0"
                  >
                    <Plus size={15} />
                    Add Service
                  </button>
                </div>
              </div>

              {/* Subcategories Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 scrollbar-none">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1 shrink-0">
                  <ListFilter size={12} /> Subcategory:
                </span>
                <button
                  onClick={() => setCatalogSubCategory("All")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 ${
                    catalogSubCategory === "All"
                      ? "bg-violet-600 text-white shadow-sm shadow-violet-500/20"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  All ({generalServices.length})
                </button>
                {availableSubCategories.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setCatalogSubCategory(sub)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                      catalogSubCategory === sub
                        ? "bg-violet-600 text-white shadow-sm shadow-violet-500/20"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {getSubCategoryIcon(sub)}
                    <span>{sub}</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      ({subCounts[sub] || 0})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rendering: Grouped vs Grid */}
            {viewMode === "grouped" ? (
              (() => {
                const groups: Record<string, Service[]> = {};
                for (const s of filtered) {
                  const sub = getServiceSubCategory(s);
                  if (!groups[sub]) groups[sub] = [];
                  groups[sub].push(s);
                }
                const subNames = Object.keys(groups).sort();

                if (subNames.length === 0) {
                  return (
                    <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                      <Layers size={36} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-700 font-bold">No services found</p>
                      <p className="text-slate-400 text-xs mt-1">
                        Try adjusting your search query or filters.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {subNames.map((subName) => {
                      const items = groups[subName];
                      const groupKey = `catalog_${subName}`;
                      const isCollapsed = Boolean(collapsedGroups[groupKey]);

                      return (
                        <section
                          key={subName}
                          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                        >
                          <div
                            onClick={() => toggleGroupCollapse(groupKey)}
                            className="flex items-center justify-between p-4 px-6 bg-slate-50/70 hover:bg-slate-100/70 border-b border-slate-100 cursor-pointer select-none transition"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                                {getSubCategoryIcon(subName)}
                              </div>
                              <div>
                                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                                  <span>{subName}</span>
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                                    {items.length} {items.length === 1 ? "service" : "services"}
                                  </span>
                                </h3>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                              <span className="hidden sm:inline text-[11px]">
                                {isCollapsed ? "Expand" : "Collapse"}
                              </span>
                              {isCollapsed ? (
                                <ChevronRight size={18} />
                              ) : (
                                <ChevronDown size={18} />
                              )}
                            </div>
                          </div>

                          {!isCollapsed && (
                            <div className="p-5 grid md:grid-cols-2 xl:grid-cols-3 gap-4 bg-slate-50/20">
                              {items.map((s) => (
                                <ServiceCard isSuperAdmin={isSuperAdmin}
                                  key={s.id}
                                  service={s}
                                  isApinice={false}
                                  onToggleStatus={() => handleToggleServiceStatus(s)}
                                  onEdit={() => startEdit(s)}
                                  onQuickPrice={() =>
                                    setQuickPriceModal({
                                      service: s,
                                      customerPrice: s.customerPrice,
                                      commission: s.commission,
                                    })
                                  }
                                  onDelete={() => handleDeleteService(s)}
                                />
                              ))}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((s) => (
                  <ServiceCard isSuperAdmin={isSuperAdmin}
                    key={s.id}
                    service={s}
                    isApinice={false}
                    onToggleStatus={() => handleToggleServiceStatus(s)}
                    onEdit={() => startEdit(s)}
                    onQuickPrice={() =>
                      setQuickPriceModal({
                        service: s,
                        customerPrice: s.customerPrice,
                        commission: s.commission,
                      })
                    }
                    onDelete={() => handleDeleteService(s)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: APINICE LIVE API SERVICES                              */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "apinice" && (() => {
        const filtered = apiniceServices.filter((s) => {
          const sub = getServiceSubCategory(s);
          const matchesSearch =
            !apiniceSearch ||
            s.name.toLowerCase().includes(apiniceSearch.toLowerCase()) ||
            s.id.toLowerCase().includes(apiniceSearch.toLowerCase()) ||
            sub.toLowerCase().includes(apiniceSearch.toLowerCase());
          const matchesCategory =
            apiniceCategory === "All" || s.category === apiniceCategory;
          const matchesSubCategory =
            apiniceSubCategory === "All" || sub === apiniceSubCategory;
          return matchesSearch && matchesCategory && matchesSubCategory;
        });

        const availableSubCategories = Array.from(
          new Set(
            apiniceServices
              .filter(
                (s) => apiniceCategory === "All" || s.category === apiniceCategory,
              )
              .map(getServiceSubCategory),
          ),
        ).sort();

        const subCounts: Record<string, number> = {};
        for (const s of apiniceServices) {
          if (apiniceCategory === "All" || s.category === apiniceCategory) {
            const sub = getServiceSubCategory(s);
            subCounts[sub] = (subCounts[sub] || 0) + 1;
          }
        }

        return (
          <div className="space-y-6">
            {/* APINICE Master Hero Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#083344] via-[#0e4860] to-[#041d28] p-6 text-white shadow-xl">
              <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                      Live Provider Connected
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-cyan-200 font-mono">
                      https://apinice.in/api/v1
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/30 text-[10px] text-cyan-200 font-bold">
                      {apiniceServices.length} Instant Automated Services
                    </span>
                  </div>
                  <h2 className="text-2xl font-black font-display tracking-tight text-white">
                    APINICE Verification & Instant Print Gateway
                  </h2>
                  <p className="text-xs text-cyan-100/80 max-w-xl">
                    Automated instant document fetching & card generation for RC, DL, Ration Card, e-Challan, ABHA Health ID, Voter PDF, and PAN searches.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 p-4 min-w-[200px]">
                    <p className="text-[10px] font-bold text-cyan-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet size={13} /> APINICE Wallet Balance
                    </p>
                    <p className="text-2xl font-extrabold font-mono mt-1 text-white">
                      {apiniceBalance !== null ? `₹${apiniceBalance.toFixed(2)}` : "Checking..."}
                    </p>
                    <p className="text-[10px] text-cyan-300/80 mt-0.5">
                      Master API Wallet Credit
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={loadApiniceBalance}
                      disabled={apiniceLoading}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={apiniceLoading ? "animate-spin" : ""} />
                      Refresh Balance
                    </button>
                    <a
                      href="https://apinice.in"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/30"
                    >
                      <ExternalLink size={14} />
                      Top Up on APINICE
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Categories */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search APINICE service, subcategory or ID..."
                    value={apiniceSearch}
                    onChange={(e) => setApiniceSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-cyan-500 bg-slate-50/50"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setViewMode("grouped")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        viewMode === "grouped"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      title="Grouped by Subcategory sections"
                    >
                      <Layers size={13} />
                      <span className="hidden sm:inline">By Subcategory</span>
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        viewMode === "grid"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      title="Flat Grid view"
                    >
                      <Grid size={13} />
                      <span className="hidden sm:inline">Grid</span>
                    </button>
                  </div>

                  <select
                    value={apiniceCategory}
                    onChange={(e) => {
                      setApiniceCategory(e.target.value);
                      setApiniceSubCategory("All");
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-cyan-500 bg-white"
                  >
                    <option value="All">All Main Categories</option>
                    {Array.from(new Set(apiniceServices.map((s) => s.category))).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subcategories Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 scrollbar-none">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1 shrink-0">
                  <ListFilter size={12} /> Subcategory:
                </span>
                <button
                  onClick={() => setApiniceSubCategory("All")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 ${
                    apiniceSubCategory === "All"
                      ? "bg-cyan-600 text-white shadow-sm shadow-cyan-500/20"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  All ({apiniceServices.length})
                </button>
                {availableSubCategories.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setApiniceSubCategory(sub)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                      apiniceSubCategory === sub
                        ? "bg-cyan-600 text-white shadow-sm shadow-cyan-500/20"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {getSubCategoryIcon(sub)}
                    <span>{sub}</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      ({subCounts[sub] || 0})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rendering: Grouped vs Grid */}
            {viewMode === "grouped" ? (
              (() => {
                const groups: Record<string, Service[]> = {};
                for (const s of filtered) {
                  const sub = getServiceSubCategory(s);
                  if (!groups[sub]) groups[sub] = [];
                  groups[sub].push(s);
                }
                const subNames = Object.keys(groups).sort();

                if (subNames.length === 0) {
                  return (
                    <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                      <Layers size={36} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-700 font-bold">No APINICE services found</p>
                      <p className="text-slate-400 text-xs mt-1">
                        Try adjusting your search query or filters.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {subNames.map((subName) => {
                      const items = groups[subName];
                      const groupKey = `apinice_${subName}`;
                      const isCollapsed = Boolean(collapsedGroups[groupKey]);

                      return (
                        <section
                          key={subName}
                          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                        >
                          <div
                            onClick={() => toggleGroupCollapse(groupKey)}
                            className="flex items-center justify-between p-4 px-6 bg-slate-50/70 hover:bg-slate-100/70 border-b border-slate-100 cursor-pointer select-none transition"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                                {getSubCategoryIcon(subName)}
                              </div>
                              <div>
                                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                                  <span>{subName}</span>
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                                    {items.length} {items.length === 1 ? "service" : "services"}
                                  </span>
                                </h3>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                              <span className="hidden sm:inline text-[11px]">
                                {isCollapsed ? "Expand" : "Collapse"}
                              </span>
                              {isCollapsed ? (
                                <ChevronRight size={18} />
                              ) : (
                                <ChevronDown size={18} />
                              )}
                            </div>
                          </div>

                          {!isCollapsed && (
                            <div className="p-5 grid md:grid-cols-2 xl:grid-cols-3 gap-4 bg-slate-50/20">
                              {items.map((s) => (
                                <ServiceCard isSuperAdmin={isSuperAdmin}
                                  key={s.id}
                                  service={s}
                                  isApinice={true}
                                  onToggleStatus={() => handleToggleServiceStatus(s)}
                                  onEdit={() => startEdit(s)}
                                  onQuickPrice={() =>
                                    setQuickPriceModal({
                                      service: s,
                                      customerPrice: s.customerPrice,
                                      commission: s.commission,
                                    })
                                  }
                                  onDelete={() => handleDeleteService(s)}
                                />
                              ))}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((s) => (
                  <ServiceCard isSuperAdmin={isSuperAdmin}
                    key={s.id}
                    service={s}
                    isApinice={true}
                    onToggleStatus={() => handleToggleServiceStatus(s)}
                    onEdit={() => startEdit(s)}
                    onQuickPrice={() =>
                      setQuickPriceModal({
                        service: s,
                        customerPrice: s.customerPrice,
                        commission: s.commission,
                      })
                    }
                    onDelete={() => handleDeleteService(s)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ------------------------------------------------------------- */}
      {/* TAB: ALL SERVICES VIEW                                        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "all" && (() => {
        const groups: Record<string, Service[]> = {};
        for (const s of services) {
          const sub = getServiceSubCategory(s);
          if (!groups[sub]) groups[sub] = [];
          groups[sub].push(s);
        }
        const subNames = Object.keys(groups).sort();

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">
                All 66 Services Segregated by Subcategory
              </span>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode("grouped")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    viewMode === "grouped"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Layers size={13} />
                  <span>By Subcategory</span>
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    viewMode === "grid"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Grid size={13} />
                  <span>Grid</span>
                </button>
              </div>
            </div>

            {viewMode === "grouped" ? (
              <div className="space-y-6">
                {subNames.map((subName) => {
                  const items = groups[subName];
                  const groupKey = `all_${subName}`;
                  const isCollapsed = Boolean(collapsedGroups[groupKey]);

                  return (
                    <section
                      key={subName}
                      className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                    >
                      <div
                        onClick={() => toggleGroupCollapse(groupKey)}
                        className="flex items-center justify-between p-4 px-6 bg-slate-50/70 hover:bg-slate-100/70 border-b border-slate-100 cursor-pointer select-none transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                            {getSubCategoryIcon(subName)}
                          </div>
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                              <span>{subName}</span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                                {items.length} services
                              </span>
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                          <span className="hidden sm:inline text-[11px]">
                            {isCollapsed ? "Expand" : "Collapse"}
                          </span>
                          {isCollapsed ? (
                            <ChevronRight size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div className="p-5 grid md:grid-cols-2 xl:grid-cols-3 gap-4 bg-slate-50/20">
                          {items.map((s) => (
                            <ServiceCard isSuperAdmin={isSuperAdmin}
                              key={s.id}
                              service={s}
                              isApinice={isApiniceService(s)}
                              onToggleStatus={() => handleToggleServiceStatus(s)}
                              onEdit={() => startEdit(s)}
                              onQuickPrice={() =>
                                setQuickPriceModal({
                                  service: s,
                                  customerPrice: s.customerPrice,
                                  commission: s.commission,
                                })
                              }
                              onDelete={() => handleDeleteService(s)}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {services.map((s) => (
                  <ServiceCard isSuperAdmin={isSuperAdmin}
                    key={s.id}
                    service={s}
                    isApinice={isApiniceService(s)}
                    onToggleStatus={() => handleToggleServiceStatus(s)}
                    onEdit={() => startEdit(s)}
                    onQuickPrice={() =>
                      setQuickPriceModal({
                        service: s,
                        customerPrice: s.customerPrice,
                        commission: s.commission,
                      })
                    }
                    onDelete={() => handleDeleteService(s)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: PAN MITRA GATEWAY                                      */}
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
                  placeholder="Enter VLE ID (e.g. PANM-LD...)"
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
                  placeholder="e.g. PANM-LD001"
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
              <div className="sm:col-span-2">
                <Field
                  label="Subcategory (e.g. RC Services, Driving Licence, Voter ID, GST)"
                  value={form.subCategory}
                  onChange={(v: any) => setForm({ ...form, subCategory: v })}
                />
              </div>
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
              <div className="sm:col-span-2">
                <label className="block">
                  <span className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Service Status & Visibility
                  </span>
                  <select
                    value={form.status || "active"}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white outline-none focus:border-violet-500"
                  >
                    <option value="active">Visible / Active (Shown to all retailers)</option>
                    <option value="disabled">Hidden / Disabled (Hidden from retailers)</option>
                  </select>
                </label>
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

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Quick Price & Commission Editor                         */}
      {/* ------------------------------------------------------------- */}
      {quickPriceModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !quickPriceSaving && setQuickPriceModal(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest flex items-center gap-1">
                  <IndianRupee size={12} />
                  Super Admin Price Setting
                </span>
                <h3 className="font-display text-lg font-bold text-slate-900 mt-0.5">
                  {quickPriceModal.service.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {quickPriceModal.service.id} · {quickPriceModal.service.category}
                </p>
              </div>
              <button
                onClick={() => setQuickPriceModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Customer Price (₹)</span>
                  <span className="text-[10px] font-normal text-slate-400">Total citizen application cost</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={quickPriceModal.customerPrice}
                    onChange={(e) => setQuickPriceModal({ ...quickPriceModal, customerPrice: Number(e.target.value) })}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
                    placeholder="0"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Retailer Commission (₹)</span>
                  <span className="text-[10px] font-normal text-slate-400">Profit margin credited to retailer</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={quickPriceModal.commission}
                    onChange={(e) => setQuickPriceModal({ ...quickPriceModal, commission: Number(e.target.value) })}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-emerald-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Estimated Platform Net:</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{Math.max(0, (quickPriceModal.customerPrice || 0) - (quickPriceModal.commission || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setQuickPriceModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={quickPriceSaving}
                onClick={handleQuickPriceSave}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-500/20 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <Save size={14} />
                {quickPriceSaving ? "Saving..." : "Save Price"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  service,
  isApinice,
  isSuperAdmin = true,
  onToggleStatus,
  onEdit,
  onQuickPrice,
  onDelete,
}: {
  service: Service;
  isApinice: boolean;
  isSuperAdmin?: boolean;
  onToggleStatus: () => void;
  onEdit: () => void;
  onQuickPrice: () => void;
  onDelete: () => void;
}) {
  const isHidden = service.status === "disabled";

  return (
    <article
      className={`rounded-2xl border transition-all flex flex-col justify-between group p-5 ${
        isHidden
          ? "bg-slate-50/70 border-rose-200 shadow-none opacity-90"
          : "bg-white border-slate-200 hover:shadow-lg hover:border-slate-300"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isHidden
                  ? "bg-rose-50 text-rose-500"
                  : isApinice
                  ? "bg-cyan-50 text-cyan-600"
                  : "bg-violet-50 text-violet-600"
              }`}
            >
              {isApinice ? <Zap size={20} /> : <Building2 size={20} />}
            </div>
            <div>
              <button
                type="button"
                onClick={onToggleStatus}
                disabled={!isSuperAdmin}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition border ${
                  !isSuperAdmin ? "opacity-75 cursor-not-allowed" : "cursor-pointer"
                } ${
                  isHidden
                    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                }`}
                title={!isSuperAdmin ? "Super Admin access required to toggle visibility" : isHidden ? "Service is currently HIDDEN from retailers. Click to Show." : "Service is VISIBLE to retailers. Click to Hide."}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isHidden ? "bg-rose-500" : "bg-emerald-500"}`} />
                <span>{isHidden ? "Hidden / Disabled" : "Visible / Active"}</span>
              </button>
              {isApinice && (
                <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-cyan-100 text-cyan-800 border border-cyan-200">
                  APINICE API
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onToggleStatus}
              className={`p-2 rounded-lg transition ${
                isHidden
                  ? "bg-rose-100 text-rose-700 hover:bg-emerald-100 hover:text-emerald-700"
                  : "bg-emerald-50 text-emerald-600 hover:bg-rose-50 hover:text-rose-600"
              }`}
              title={isHidden ? "Click to Show to Retailers (Activate)" : "Click to Hide from Retailers (Disable)"}
            >
              {isHidden ? <PowerOff size={15} /> : <Power size={15} />}
            </button>
            <button
              onClick={onEdit}
              className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition"
              title="Full Edit Service"
            >
              <Pencil size={14} />
            </button>
            {!isApinice && (
              <button
                onClick={onDelete}
                className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                title="Delete Service"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <h2 className="font-bold text-[#0F172A] mt-3.5 text-base leading-snug">
          {service.name}
        </h2>
        <div className="text-xs text-[#64748B] mt-1 flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-slate-700">{service.category}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
            {getSubCategoryIcon(getServiceSubCategory(service))}
            <span>{getServiceSubCategory(service)}</span>
          </span>
          <span>·</span>
          <span className="font-mono text-[11px] text-slate-400">{service.id}</span>
        </div>

        {/* Pricing Blocks with Quick Price Action */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div
            onClick={onQuickPrice}
            className="rounded-xl bg-slate-50 hover:bg-violet-50/50 border border-slate-100 p-2.5 transition cursor-pointer group/price"
            title="Click to quickly change customer price"
          >
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
              <span>Customer Price</span>
              <Pencil size={10} className="opacity-0 group-hover/price:opacity-100 text-violet-600 transition" />
            </div>
            <b className="font-mono text-base text-slate-900 mt-0.5 block">
              ₹{service.customerPrice}
            </b>
          </div>

          <div
            onClick={onQuickPrice}
            className="rounded-xl bg-emerald-50/70 hover:bg-emerald-100/50 border border-emerald-100/80 p-2.5 transition cursor-pointer group/comm"
            title="Click to quickly change retailer commission"
          >
            <div className="flex items-center justify-between text-[10px] text-emerald-700 font-bold uppercase">
              <span>Commission</span>
              <Pencil size={10} className="opacity-0 group-hover/comm:opacity-100 text-emerald-700 transition" />
            </div>
            <b className="font-mono text-base text-emerald-700 mt-0.5 block">
              ₹{service.commission}
            </b>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#64748B]">
        <span className="flex items-center gap-1 text-[11px]">
          <Clock3 size={13} />
          {service.processingTime || "Instant"}
        </span>
        <button
          onClick={onQuickPrice}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 hover:text-violet-800 hover:underline"
        >
          <IndianRupee size={12} />
          Edit Price
        </button>
      </div>
    </article>
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
