import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Printer,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Car,
  FileCheck,
  Shield,
  Clock,
  RefreshCw,
  Search,
  Smartphone,
} from "lucide-react";
import { api } from "@/shared/api/client";
import { useWallet } from "@/features/session/AppContext";

function downloadBase64Pdf(base64Data: string, filename: string) {
  try {
    const cleanBase64 = base64Data.replace(/^data:application\/pdf;base64,/, "").trim();
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e: any) {
    alert("Could not download PDF: " + (e.message || "Unknown error"));
  }
}

function openBase64Pdf(base64Data: string) {
  try {
    const cleanBase64 = base64Data.replace(/^data:application\/pdf;base64,/, "").trim();
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch (e: any) {
    alert("Could not open PDF: " + (e.message || "Unknown error"));
  }
}

const BASE_CATEGORIES = [
  "All Services",
  "Voter Services",
  "Vehicle Services",
  "Citizen Documents",
  "New PAN",
  "Correction & Reprint",
  "UTI PAN",
  "NSDL PAN",
  "Coupons & VLE",
  "Status Tracking",
];

const PRINT_SERVICES = [
  {
    id: "SVC-RC-PRINT",
    name: "RC Smart Card Print",
    category: "Vehicle Services",
    badge: "VEHICLE PRINT",
    icon: "🚗",
    processingTime: "Instant",
    defaultPrice: 30,
    documents: ["Vehicle Registration Number"],
    color: "#06B6D4",
    description: "Official Printable Vehicle RC Smart Card PDF (Parivahan Digital Format)",
  },
  {
    id: "SVC-DL-PRINT",
    name: "Driving Licence Print",
    category: "Vehicle Services",
    badge: "DL PRINT",
    icon: "🛵",
    processingTime: "Instant",
    defaultPrice: 25,
    documents: ["DL Number", "Date of Birth"],
    color: "#1D56D8",
    description: "Official Printable Driving Licence Smart Card PDF (Sarathi Digital Format)",
  },
  {
    id: "SVC-RATION-PRINT",
    name: "Ration Card Print",
    category: "Citizen Documents",
    badge: "CITIZEN PRINT",
    icon: "🍚",
    processingTime: "Instant",
    defaultPrice: 25,
    documents: ["Ration Card Number"],
    color: "#10B981",
    description: "Official Printable Citizen Ration Card Document PDF (NFSA Format)",
  },
  {
    id: "SVC-VEHICLE-CHALLAN",
    name: "Vehicle e-Challan Check",
    category: "Vehicle Services",
    badge: "TRAFFIC CHALLAN",
    icon: "🚨",
    processingTime: "Instant",
    defaultPrice: 15,
    documents: ["Vehicle Registration Number"],
    color: "#F59E0B",
    description: "Instant Traffic Violation & Pending Fine Lookup with Full Offence Details",
  },
  {
    id: "SVC-ABHA-CARD",
    name: "ABHA Health Card Print",
    category: "Citizen Documents",
    badge: "HEALTH CARD",
    icon: "🏥",
    processingTime: "Instant",
    defaultPrice: 35,
    documents: ["Aadhaar Number", "Date of Birth"],
    color: "#059669",
    description: "Ayushman Bharat Digital Mission (ABDM) Health ID Card Instant Print",
  },
  {
    id: "SVC-VOTER-VERIFY",
    name: "Voter ID Verification",
    category: "Voter Services",
    badge: "VOTER VERIFY",
    icon: "🗳️",
    processingTime: "Instant",
    defaultPrice: 10,
    documents: ["EPIC / Voter ID Number"],
    color: "#6366F1",
    description: "Instant Voter Record & Polling Station verification with printable customer slip",
  },
  {
    id: "SVC-VOTER-PDF",
    name: "Voter Card PDF Download",
    category: "Voter Services",
    badge: "VOTER PDF",
    icon: "🪪",
    processingTime: "Instant / 1-2 hrs",
    defaultPrice: 55,
    documents: ["EPIC / Voter ID Number", "State"],
    color: "#8B5CF6",
    description: "Official Printable Digital Voter Card (e-EPIC) PDF Download",
  },
  {
    id: "SVC-VOTER-MOBILE-LINK",
    name: "Voter Mobile Link Without OTP",
    category: "Voter Services",
    badge: "VOTER LINK",
    icon: "📲",
    processingTime: "Instant (5 mins)",
    defaultPrice: 25,
    documents: ["EPIC / Voter ID Number", "10-digit Mobile Number"],
    color: "#EC4899",
    description: "Direct instant mobile number linking with Voter ID without citizen OTP",
  },
  {
    id: "SVC-LL-PDF",
    name: "Learning Licence (LL) PDF",
    category: "Vehicle Services",
    badge: "LL PDF",
    icon: "📜",
    processingTime: "Instant",
    defaultPrice: 25,
    documents: ["Learning Licence Number / Application ID"],
    color: "#0284C7",
    description: "Official Printable Learning Licence (LL) document PDF (Sarathi Format)",
  },
  {
    id: "SVC-CHASSIS-TO-RC",
    name: "Chassis to RC Details",
    category: "Vehicle Services",
    badge: "CHASSIS SEARCH",
    icon: "🔍",
    processingTime: "Instant",
    defaultPrice: 60,
    documents: ["Vehicle Chassis Number"],
    color: "#D97706",
    description: "Find vehicle plate number, owner, RTO office & registration dates using chassis number",
  },
  {
    id: "SVC-RC-TO-MOBILE",
    name: "RC to Mobile Number Search",
    category: "Vehicle Services",
    badge: "RC MOBILE",
    icon: "📞",
    processingTime: "Instant",
    defaultPrice: 35,
    documents: ["Vehicle Registration Number"],
    color: "#2563EB",
    description: "Instant lookup for registered vehicle owner contact mobile number",
  },
  {
    id: "SVC-ESHRAM-CARD",
    name: "e-Shram Card Print",
    category: "Citizen Documents",
    badge: "ESHRAM CARD",
    icon: "👷",
    processingTime: "Instant",
    defaultPrice: 25,
    documents: ["Aadhaar Number", "Date of Birth"],
    color: "#EA580C",
    description: "Official Printable e-Shram Unorganised Worker Card PDF Instant Download",
  },
];

const PAN_SERVICES = [
  { id: "PAN-NEW", name: "New PAN Card", icon: "🆕", processingTime: "7-15 days", customerPrice: 107, documents: ["Aadhaar", "DOB Proof", "Photograph"], color: "#F87171", description: "Direct citizen Form 49A application with physical PAN card dispatch" },
  { id: "PAN-CORRECTION", name: "PAN Correction", icon: "✏️", processingTime: "7-15 days", customerPrice: 107, documents: ["PAN Card", "Aadhaar", "Supporting Proof"], color: "#F59E0B", description: "Update name, photo, father name, or DOB on existing PAN card" },
  { id: "PAN-REPRINT", name: "PAN Reprint", icon: "🔄", processingTime: "7-15 days", customerPrice: 50, documents: ["PAN Copy", "Aadhaar"], color: "#06B6D4", description: "Reprint damaged or lost physical PAN card with existing details" },
  { id: "PAN-UTI", name: "UTI PAN", icon: "🏢", processingTime: "Instant / 3-5 days", customerPrice: 107, documents: ["Aadhaar", "Biometric / OTP"], color: "#7C3AED", description: "Official UTI PSA Paperless PAN (ID issued via LD Service Zone)" },
  { id: "PAN-FIND", name: "PAN Find", icon: "🔍", processingTime: "Instant", customerPrice: 20, documents: ["Aadhaar Number", "Mobile Number"], color: "#4F46E5", description: "Find lost PAN number by Aadhaar card" },
  { id: "PAN-NSDL", name: "NSDL PAN", icon: "📑", processingTime: "Instant / 2 hours", customerPrice: 107, documents: ["Aadhaar", "Biometric / OTP"], color: "#1D56D8", description: "Instant paperless eKYC PAN card application" },
  { id: "PAN-UTI-STATUS", name: "UTI PAN Status", icon: "⏱️", processingTime: "Instant", customerPrice: 0, documents: ["Application / Coupon No"], color: "#10B981", description: "Track UTIITSL PAN application status online" },
  { id: "PAN-NSDL-STATUS", name: "NSDL PAN Status", icon: "🔎", processingTime: "Instant", customerPrice: 0, documents: ["15-Digit Ack No"], color: "#06B6D4", description: "Track NSDL TIN application status online" },
  { id: "PAN-UTI-COUPON", name: "UTI Coupon Add", icon: "🎟️", processingTime: "Instant", customerPrice: 107, documents: ["UTI VLE ID"], color: "#F59E0B", description: "Add Physical & Electronic coupons to your UTI ID" },
];

/*
// Non-implemented services temporarily commented out until live API integrations are active:
const SERVICE_SUBSERVICES: Record<string, any[]> = {
  "Voter ID Card": [
    { id: "VOTER-NEW", name: "New Voter ID", icon: "🆕", processingTime: "7-15 days", customerPrice: 100, documents: ["Aadhaar", "DOB Proof", "Photograph"], color: "#4F46E5" },
    { id: "VOTER-CORRECTION", name: "Voter ID Correction", icon: "✏️", processingTime: "7-15 days", customerPrice: 100, documents: ["Voter ID", "Aadhaar", "Supporting Proof"], color: "#F59E0B" },
    { id: "VOTER-ADDRESS", name: "Voter ID Address Change", icon: "🏠", processingTime: "7-15 days", customerPrice: 100, documents: ["Voter ID", "Address Proof"], color: "#06B6D4" },
    { id: "VOTER-DOWNLOAD", name: "Voter ID Download", icon: "⬇️", processingTime: "Instant", customerPrice: 30, documents: ["EPIC Number", "Mobile Number"], color: "#10B981" },
  ],
  "Driving Licence": [
    { id: "DL-NEW", name: "New Driving Licence", icon: "🆕", processingTime: "15-30 days", customerPrice: 500, documents: ["Aadhaar", "Medical Cert", "Age Proof"], color: "#1D56D8" },
    { id: "DL-LEARNER", name: "Learner Licence", icon: "📘", processingTime: "7-15 days", customerPrice: 300, documents: ["Aadhaar", "Age Proof"], color: "#4F46E5" },
    { id: "DL-RENEWAL", name: "Driving Licence Renewal", icon: "🔄", processingTime: "7-15 days", customerPrice: 400, documents: ["Driving Licence", "Aadhaar"], color: "#10B981" },
    { id: "DL-CORRECTION", name: "Driving Licence Correction", icon: "✏️", processingTime: "7-15 days", customerPrice: 400, documents: ["Driving Licence", "Supporting Proof"], color: "#F59E0B" },
    { id: "DL-DUPLICATE", name: "Duplicate Driving Licence", icon: "📄", processingTime: "7-15 days", customerPrice: 450, documents: ["Driving Licence", "Aadhaar"], color: "#7C3AED" },
  ],
  "RC Smart Card": [
    { id: "RC-NEW", name: "New RC Smart Card", icon: "🆕", processingTime: "10-20 days", customerPrice: 400, documents: ["RC Book", "Insurance", "PUC"], color: "#06B6D4" },
    { id: "RC-TRANSFER", name: "RC Transfer", icon: "🔄", processingTime: "10-20 days", customerPrice: 500, documents: ["RC Book", "Sale Agreement", "Insurance"], color: "#4F46E5" },
    { id: "RC-CORRECTION", name: "RC Correction", icon: "✏️", processingTime: "10-20 days", customerPrice: 350, documents: ["RC Book", "Supporting Proof"], color: "#F59E0B" },
    { id: "RC-DUPLICATE", name: "Duplicate RC", icon: "📄", processingTime: "10-20 days", customerPrice: 400, documents: ["Vehicle Details", "Insurance", "PUC"], color: "#7C3AED" },
  ],
  "ITR-1 Filing": [
    { id: "ITR-1", name: "ITR-1 Filing", icon: "📊", processingTime: "Same day", customerPrice: 299, documents: ["PAN", "Form 16", "Bank Statement"], color: "#10B981" },
    { id: "ITR-1-REVISED", name: "Revised ITR-1", icon: "✏️", processingTime: "Same day", customerPrice: 399, documents: ["PAN", "Form 16", "Original ITR"], color: "#F59E0B" },
  ],
  "GST Registration": [
    { id: "GST-REG", name: "New GST Registration", icon: "🆕", processingTime: "3-7 days", customerPrice: 999, documents: ["PAN", "Aadhaar", "Business Proof"], color: "#F59E0B" },
    { id: "GST-CORRECTION", name: "GST Amendment", icon: "✏️", processingTime: "3-7 days", customerPrice: 699, documents: ["GSTIN", "Supporting Proof"], color: "#4F46E5" },
  ],
  "Income Certificate": [
    { id: "INCOME-NEW", name: "New Income Certificate", icon: "🆕", processingTime: "7-10 days", customerPrice: 150, documents: ["Aadhaar", "Ration Card"], color: "#7C3AED" },
    { id: "INCOME-RENEW", name: "Income Certificate Renewal", icon: "🔄", processingTime: "7-10 days", customerPrice: 150, documents: ["Old Certificate", "Aadhaar"], color: "#10B981" },
  ],
  "Caste Certificate": [
    { id: "CASTE-NEW", name: "New Caste Certificate", icon: "🆕", processingTime: "10-15 days", customerPrice: 100, documents: ["Aadhaar", "Old Caste Cert"], color: "#06B6D4" },
    { id: "CASTE-CORRECTION", name: "Caste Certificate Correction", icon: "✏️", processingTime: "10-15 days", customerPrice: 100, documents: ["Certificate", "Supporting Proof"], color: "#F59E0B" },
  ],
};
*/

const iconFor = (category: string) =>
  category === "Government" ? "🏛️" : category === "Tax" ? "📊" : category === "Certificate" ? "📜" : "🪪";

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("All Services");
  const [search, setSearch] = useState("");
  const [selectedService, setSelectedService] = useState<any>(null);
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

  // Dynamic service price & status helper
  const getDynamicService = (serviceId: string, defaultPrice: number) => {
    const match = services.find((s) => s.id === serviceId);
    const price = match && Number.isFinite(Number(match.customerPrice)) ? Number(match.customerPrice) : defaultPrice;
    const status = match?.status || "active";
    const name = match?.name;
    return { price, status, name };
  };

  // RC Print modal states
  const [rcModalOpen, setRcModalOpen] = useState(false);
  const [rcNo, setRcNo] = useState("");
  const [rcCardType, setRcCardType] = useState("2"); // 1=Old, 2=New
  const [rcChipType, setRcChipType] = useState("1"); // 1=Chip, 2=Non-chip
  const [rcLoading, setRcLoading] = useState(false);
  const [rcError, setRcError] = useState("");
  const [rcResultPdf, setRcResultPdf] = useState<string | null>(null);

  // DL Print modal states
  const [dlModalOpen, setDlModalOpen] = useState(false);
  const [dlNo, setDlNo] = useState("");
  const [dlDob, setDlDob] = useState("");
  const [dlCardType, setDlCardType] = useState("1"); // 1=White, 2=Light Blue
  const [dlLoading, setDlLoading] = useState(false);
  const [dlError, setDlError] = useState("");
  const [dlResultPdf, setDlResultPdf] = useState<string | null>(null);

  // Ration Print modal states
  const [rationModalOpen, setRationModalOpen] = useState(false);
  const [rationNo, setRationNo] = useState("");
  const [rationCardType, setRationCardType] = useState("1"); // 1=Photo, 2=Simple
  const [rationLoading, setRationLoading] = useState(false);
  const [rationError, setRationError] = useState("");
  const [rationResultPdf, setRationResultPdf] = useState<string | null>(null);

  // Vehicle Challan modal states
  const [challanModalOpen, setChallanModalOpen] = useState(false);
  const [challanVehicleNo, setChallanVehicleNo] = useState("");
  const [challanLoading, setChallanLoading] = useState(false);
  const [challanError, setChallanError] = useState("");
  const [challanResult, setChallanResult] = useState<any>(null);

  // ABHA Health Card modal states
  const [abhaModalOpen, setAbhaModalOpen] = useState(false);
  const [abhaUid, setAbhaUid] = useState("");
  const [abhaDob, setAbhaDob] = useState("");
  const [abhaLoading, setAbhaLoading] = useState(false);
  const [abhaError, setAbhaError] = useState("");
  const [abhaResult, setAbhaResult] = useState<any>(null);

  // Voter ID Verification modal states
  const [voterVerifyModalOpen, setVoterVerifyModalOpen] = useState(false);
  const [voterVerifyEpic, setVoterVerifyEpic] = useState("");
  const [voterVerifyState, setVoterVerifyState] = useState("");
  const [voterVerifyLoading, setVoterVerifyLoading] = useState(false);
  const [voterVerifyError, setVoterVerifyError] = useState("");
  const [voterVerifyResult, setVoterVerifyResult] = useState<any>(null);

  // Voter Card PDF modal states
  const [voterPdfModalOpen, setVoterPdfModalOpen] = useState(false);
  const [voterPdfEpic, setVoterPdfEpic] = useState("");
  const [voterPdfState, setVoterPdfState] = useState("OD");
  const [voterPdfName, setVoterPdfName] = useState("");
  const [voterPdfLoading, setVoterPdfLoading] = useState(false);
  const [voterPdfError, setVoterPdfError] = useState("");
  const [voterPdfResult, setVoterPdfResult] = useState<any>(null);

  // Voter Mobile Link modal states
  const [voterLinkModalOpen, setVoterLinkModalOpen] = useState(false);
  const [voterLinkEpic, setVoterLinkEpic] = useState("");
  const [voterLinkMobile, setVoterLinkMobile] = useState("");
  const [voterLinkLoading, setVoterLinkLoading] = useState(false);
  const [voterLinkError, setVoterLinkError] = useState("");
  const [voterLinkResult, setVoterLinkResult] = useState<any>(null);

  // Learning Licence (LL) PDF modal states
  const [llModalOpen, setLlModalOpen] = useState(false);
  const [llId, setLlId] = useState("");
  const [llLoading, setLlLoading] = useState(false);
  const [llError, setLlError] = useState("");
  const [llPdfBase64, setLlPdfBase64] = useState<string | null>(null);

  // Chassis to RC modal states
  const [chassisModalOpen, setChassisModalOpen] = useState(false);
  const [chassisNo, setChassisNo] = useState("");
  const [chassisLoading, setChassisLoading] = useState(false);
  const [chassisError, setChassisError] = useState("");
  const [chassisResult, setChassisResult] = useState<any>(null);

  // RC to Mobile modal states
  const [rcMobileModalOpen, setRcMobileModalOpen] = useState(false);
  const [rcMobileVehicle, setRcMobileVehicle] = useState("");
  const [rcMobileLoading, setRcMobileLoading] = useState(false);
  const [rcMobileError, setRcMobileError] = useState("");
  const [rcMobileResult, setRcMobileResult] = useState<any>(null);

  // e-Shram Card modal states
  const [eshramModalOpen, setEshramModalOpen] = useState(false);
  const [eshramUid, setEshramUid] = useState("");
  const [eshramDob, setEshramDob] = useState("");
  const [eshramLoading, setEshramLoading] = useState(false);
  const [eshramError, setEshramError] = useState("");
  const [eshramPdfBase64, setEshramPdfBase64] = useState<string | null>(null);

  const handleRcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRc = rcNo.trim().toUpperCase();
    if (!cleanRc) {
      setRcError("Please enter vehicle registration number");
      return;
    }
    const dynamic = getDynamicService("SVC-RC-PRINT", 30);
    if (dynamic.status === "disabled") {
      setRcError("This service is temporarily disabled by admin.");
      return;
    }
    if (Number(wallet?.balance || 0) < dynamic.price) {
      setRcError(`Insufficient wallet balance. Required: ₹${dynamic.price.toFixed(2)}, Current: ₹${Number(wallet?.balance || 0).toFixed(2)}`);
      return;
    }

    setRcLoading(true);
    setRcError("");
    try {
      const res = await api<any>("/apinice/rc-print", {
        method: "POST",
        body: JSON.stringify({ rcno: cleanRc, cardtype: rcCardType, chiptype: rcChipType }),
      });
      if (res.balance !== undefined) {
        updateBalance(res.balance);
      } else {
        refreshWallet();
      }
      if (res.pdf) {
        setRcResultPdf(res.pdf);
      } else {
        setRcError("Document generated, but no download stream was returned.");
      }
    } catch (err: any) {
      setRcError(err.message || "Failed to generate RC print");
    } finally {
      setRcLoading(false);
    }
  };

  const handleDlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDl = dlNo.trim().toUpperCase();
    const cleanDob = dlDob.trim();
    if (!cleanDl) {
      setDlError("Please enter driving licence number");
      return;
    }
    if (!cleanDob) {
      setDlError("Please select date of birth");
      return;
    }
    const dynamic = getDynamicService("SVC-DL-PRINT", 25);
    if (dynamic.status === "disabled") {
      setDlError("This service is temporarily disabled by admin.");
      return;
    }
    if (Number(wallet?.balance || 0) < dynamic.price) {
      setDlError(`Insufficient wallet balance. Required: ₹${dynamic.price.toFixed(2)}, Current: ₹${Number(wallet?.balance || 0).toFixed(2)}`);
      return;
    }

    setDlLoading(true);
    setDlError("");
    try {
      const res = await api<any>("/apinice/dl-print", {
        method: "POST",
        body: JSON.stringify({ dlno: cleanDl, dob: cleanDob, cardtype: dlCardType }),
      });
      if (res.balance !== undefined) {
        updateBalance(res.balance);
      } else {
        refreshWallet();
      }
      if (res.pdf) {
        setDlResultPdf(res.pdf);
      } else {
        setDlError("Document generated, but no download stream was returned.");
      }
    } catch (err: any) {
      setDlError(err.message || "Failed to generate Driving Licence print");
    } finally {
      setDlLoading(false);
    }
  };

  const handleRationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRation = rationNo.trim();
    if (!cleanRation) {
      setRationError("Please enter ration card number");
      return;
    }
    const dynamic = getDynamicService("SVC-RATION-PRINT", 25);
    if (dynamic.status === "disabled") {
      setRationError("This service is temporarily disabled by admin.");
      return;
    }
    if (Number(wallet?.balance || 0) < dynamic.price) {
      setRationError(`Insufficient wallet balance. Required: ₹${dynamic.price.toFixed(2)}, Current: ₹${Number(wallet?.balance || 0).toFixed(2)}`);
      return;
    }

    setRationLoading(true);
    setRationError("");
    try {
      const res = await api<any>("/apinice/ration-print", {
        method: "POST",
        body: JSON.stringify({ rationno: cleanRation, card_type: rationCardType }),
      });
      if (res.balance !== undefined) {
        updateBalance(res.balance);
      } else {
        refreshWallet();
      }
      if (res.pdf) {
        setRationResultPdf(res.pdf);
      } else {
        setRationError("Document generated, but no download stream was returned.");
      }
    } catch (err: any) {
      setRationError(err.message || "Failed to generate Ration Card print");
    } finally {
      setRationLoading(false);
    }
  };

  const handleChallanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVehicle = challanVehicleNo.trim().toUpperCase().replace(/[\s-]/g, "");
    if (!cleanVehicle) {
      setChallanError("Please enter vehicle registration number");
      return;
    }
    const dynamic = getDynamicService("SVC-VEHICLE-CHALLAN", 15);
    if (dynamic.status === "disabled") {
      setChallanError("This service is temporarily disabled by admin.");
      return;
    }
    if (Number(wallet?.balance || 0) < dynamic.price) {
      setChallanError(
        `Insufficient wallet balance. Required: ₹${dynamic.price.toFixed(2)}, Current: ₹${Number(wallet?.balance || 0).toFixed(2)}`
      );
      return;
    }

    setChallanLoading(true);
    setChallanError("");
    try {
      const res = await api<any>("/apinice/vehicle-challan", {
        method: "POST",
        body: JSON.stringify({ vehicle: cleanVehicle }),
      });
      if (res.balance !== undefined) {
        updateBalance(res.balance);
      } else {
        refreshWallet();
      }
      if (res.data) {
        setChallanResult(res.data);
      } else {
        setChallanError("No challan details returned by server.");
      }
    } catch (err: any) {
      setChallanError(err.message || "Failed to check vehicle challan");
    } finally {
      setChallanLoading(false);
    }
  };

  const printChallanSlip = (data: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const challansHtml = (data.challans || [])
      .map(
        (c: any, i: number) => `
      <div style="border-bottom:1px solid #e2e8f0;padding:10px 0;">
        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:13px;">
          <span>#${i + 1} Challan: ${c.challan_no || "N/A"}</span>
          <span style="color:${String(c.challan_status).toLowerCase() === "paid" ? "#059669" : "#dc2626"};">₹${c.challan_amount || 0} (${c.challan_status || "Pending"})</span>
        </div>
        <div style="font-size:12px;color:#475569;margin-top:4px;line-height:1.5;">
          <strong>Offence:</strong> ${c.offences || "Traffic Violation"}<br/>
          <strong>Location / RTO:</strong> ${c.challan_place || ""} ${c.office_name ? "· " + c.office_name : ""}<br/>
          <strong>Date:</strong> ${c.challan_date || "N/A"} ${c.owner_name ? "<br/><strong>Owner:</strong> " + c.owner_name : ""}
        </div>
      </div>
    `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>e-Challan Report - ${data.vehicleNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; max-width: 650px; margin: auto; }
            .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; }
            .summary { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
            .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0;color:#1e293b;letter-spacing:0.5px;">LD SERVICE ZONE</h2>
            <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Official E-Governance & Digital Citizen Services Center</p>
            <h3 style="margin:8px 0 0;color:#d97706;">Vehicle Traffic e-Challan Report</h3>
          </div>
          <div class="meta">
            <div><strong>Vehicle No:</strong> ${data.vehicleNumber}</div>
            <div><strong>Report Date:</strong> ${new Date().toLocaleString("en-IN")}</div>
          </div>
          <div class="summary">
            <div style="font-size:13px;font-weight:bold;margin-bottom:4px;">Challan Status Summary:</div>
            <div style="font-size:13px;">
              Total Challans: <strong>${data.challanCount}</strong> &nbsp;|&nbsp; 
              Total Pending Fine: <strong style="color:${data.totalAmount > 0 ? "#dc2626" : "#059669"};">₹${data.totalAmount}</strong>
            </div>
          </div>
          ${data.challanCount === 0 ? '<div style="padding:20px;background:#ecfdf5;color:#065f46;text-align:center;border-radius:8px;font-weight:bold;font-size:14px;border:1px solid #a7f3d0;">✅ NO PENDING CHALLANS FOUND. VEHICLE RECORD IS 100% CLEAN.</div>' : challansHtml}
          <div class="footer">
            This is a verified computerized electronic enquiry report issued by LD Service Zone.<br/>
            To pay or dispute traffic challans, please visit your local traffic department or the official Parivahan e-Challan portal.
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleAbhaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUid = abhaUid.trim().replace(/[\s-]/g, "");
    const cleanDob = abhaDob.trim();
    if (!cleanUid || cleanUid.length !== 12) {
      setAbhaError("Please enter a valid 12-digit Aadhaar / UID number");
      return;
    }
    if (!cleanDob) {
      setAbhaError("Please enter Date of Birth (DD-MM-YYYY)");
      return;
    }
    const dynamic = getDynamicService("SVC-ABHA-CARD", 35);
    if (dynamic.status === "disabled") {
      setAbhaError("This service is temporarily disabled by admin.");
      return;
    }
    if (Number(wallet?.balance || 0) < dynamic.price) {
      setAbhaError(
        `Insufficient wallet balance. Required: ₹${dynamic.price.toFixed(2)}, Current: ₹${Number(wallet?.balance || 0).toFixed(2)}`
      );
      return;
    }

    setAbhaLoading(true);
    setAbhaError("");
    try {
      const res = await api<any>("/apinice/abha-card", {
        method: "POST",
        body: JSON.stringify({ uidNumber: cleanUid, dob: cleanDob }),
      });
      if (res.balance !== undefined) {
        updateBalance(res.balance);
      } else {
        refreshWallet();
      }
      if (res.imageBase64 || res.pdf || (res.data && (res.data.image_base64 || res.data.pdf))) {
        setAbhaResult({
          imageBase64: res.imageBase64 || res.data?.image_base64,
          pdf: res.pdf || res.data?.pdf,
          fields: res.data?.fields,
          uidNumber: cleanUid,
        });
      } else {
        setAbhaError("ABHA card generated, but no image or PDF was returned.");
      }
    } catch (err: any) {
      setAbhaError(err.message || "Failed to download ABHA Health Card");
    } finally {
      setAbhaLoading(false);
    }
  };

  const printAbhaCard = (imageBase64: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print ABHA Card</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: sans-serif; background: #fff; }
            img { max-width: 100%; height: auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-radius: 8px; }
          </style>
        </head>
        <body>
          <img src="${imageBase64}" onload="window.print();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleVoterVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEpic = voterVerifyEpic.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanEpic) {
      setVoterVerifyError("Please enter Voter ID / EPIC number");
      return;
    }
    const dynamic = getDynamicService("SVC-VOTER-VERIFY", 10);
    if (dynamic.status === "disabled") {
      setVoterVerifyError("This service is temporarily disabled by admin.");
      return;
    }
    if (Number(wallet?.balance || 0) < dynamic.price) {
      setVoterVerifyError(`Insufficient wallet balance. Required: ₹${dynamic.price.toFixed(2)}, Current: ₹${Number(wallet?.balance || 0).toFixed(2)}`);
      return;
    }

    setVoterVerifyLoading(true);
    setVoterVerifyError("");
    try {
      const res = await api<any>("/apinice/voter-verify", {
        method: "POST",
        body: JSON.stringify({ epic: cleanEpic, stateId: voterVerifyState }),
      });
      if (res.balance !== undefined) {
        updateBalance(res.balance);
      } else {
        refreshWallet();
      }
      if (res.data) {
        setVoterVerifyResult(res.data);
      } else {
        setVoterVerifyError("No voter record returned for this EPIC number.");
      }
    } catch (err: any) {
      setVoterVerifyError(err.message || "Failed to verify Voter ID");
    } finally {
      setVoterVerifyLoading(false);
    }
  };

  const printVoterSlip = (voter: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Voter Verification Slip - ${voter.epic_number || "EPIC"}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; max-width: 650px; margin: auto; }
            .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            .table td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px; }
            .table td.label { font-weight: bold; background: #f8fafc; width: 38%; color: #475569; }
            .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0;color:#1e293b;letter-spacing:0.5px;">LD SERVICE ZONE</h2>
            <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Official E-Governance & Digital Citizen Services Center</p>
            <h3 style="margin:8px 0 0;color:#4f46e5;">Voter Electoral Search & Verification Slip</h3>
          </div>
          <div class="meta">
            <div><strong>EPIC No:</strong> ${voter.epic_number || "N/A"}</div>
            <div><strong>Verified On:</strong> ${new Date().toLocaleString("en-IN")}</div>
          </div>
          <table class="table">
            <tr><td class="label">Citizen Full Name</td><td><strong>${voter.full_name || "N/A"}</strong> ${voter.full_name_l1 ? "(" + voter.full_name_l1 + ")" : ""}</td></tr>
            <tr><td class="label">Relative Name & Type</td><td>${voter.relation_name || "N/A"} (${voter.relation_type || "Father / Spouse"})</td></tr>
            <tr><td class="label">Age & Gender</td><td>${voter.age || "N/A"} Years · ${voter.gender || "N/A"}</td></tr>
            <tr><td class="label">Assembly Constituency</td><td>${voter.assembly || "N/A"}</td></tr>
            <tr><td class="label">Parliamentary Constituency</td><td>${voter.parliament || "N/A"}</td></tr>
            <tr><td class="label">District & State</td><td>${voter.district || "N/A"}, ${voter.state || "N/A"}</td></tr>
            <tr><td class="label">Polling Station / Booth</td><td>${voter.polling_station || "N/A"}</td></tr>
            <tr><td class="label">Part No & Serial No</td><td>Part ${voter.part_number || "N/A"} · Serial ${voter.serial_number || "N/A"}</td></tr>
          </table>
          <div class="footer">
            This is a computerized electronic voter verification enquiry receipt issued by LD Service Zone.<br/>
            Data verified from National Election Commission electoral registry.
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleVoterPdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEpic = voterPdfEpic.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanEpic) {
      setVoterPdfError("Please enter Voter ID / EPIC number");
      return;
    }
    if (!voterPdfState) {
      setVoterPdfError("Please select state");
      return;
    }
    const dynamic = getDynamicService("SVC-VOTER-PDF", 55);
    if (dynamic.status === "disabled") {
      setVoterPdfError("This service is temporarily disabled by admin.");
      return;
    }
    if (Number(wallet?.balance || 0) < dynamic.price) {
      setVoterPdfError(`Insufficient wallet balance. Required: ₹${dynamic.price.toFixed(2)}, Current: ₹${Number(wallet?.balance || 0).toFixed(2)}`);
      return;
    }

    setVoterPdfLoading(true);
    setVoterPdfError("");
    try {
      const res = await api<any>("/apinice/voter-pdf", {
        method: "POST",
        body: JSON.stringify({ epicNumber: cleanEpic, state: voterPdfState, name: voterPdfName }),
      });
      if (res.balance !== undefined) {
        updateBalance(res.balance);
      } else {
        refreshWallet();
      }
      setVoterPdfResult(res);
    } catch (err: any) {
      setVoterPdfError(err.message || "Failed to download Voter Card PDF");
    } finally {
      setVoterPdfLoading(false);
    }
  };

  const handleVoterLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEpic = voterLinkEpic.trim().toUpperCase().replace(/\s+/g, "");
    const cleanMobile = voterLinkMobile.trim().replace(/\D/g, "");
    if (!cleanEpic) {
      setVoterLinkError("Please enter Voter ID / EPIC number");
      return;
    }
    if (!cleanMobile || cleanMobile.length !== 10) {
      setVoterLinkError("Please enter a valid 10-digit mobile number");
      return;
    }
    const dynamic = getDynamicService("SVC-VOTER-MOBILE-LINK", 25);
    if (dynamic.status === "disabled") {
      setVoterLinkError("This service is temporarily disabled by admin.");
      return;
    }
    if (Number(wallet?.balance || 0) < dynamic.price) {
      setVoterLinkError(`Insufficient wallet balance. Required: ₹${dynamic.price.toFixed(2)}, Current: ₹${Number(wallet?.balance || 0).toFixed(2)}`);
      return;
    }

    setVoterLinkLoading(true);
    setVoterLinkError("");
    try {
      const res = await api<any>("/apinice/voter-mobile-link", {
        method: "POST",
        body: JSON.stringify({ epic: cleanEpic, mobile: cleanMobile }),
      });
      if (res.balance !== undefined) {
        updateBalance(res.balance);
      } else {
        refreshWallet();
      }
      setVoterLinkResult(res);
    } catch (err: any) {
      setVoterLinkError(err.message || "Failed to link Voter Mobile number");
    } finally {
      setVoterLinkLoading(false);
    }
  };

  const printVoterLinkSlip = (result: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Voter Mobile Link Acknowledgment - ${result.refId || result.transactionId}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; max-width: 600px; margin: auto; }
            .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; }
            .box { background: #fdf2f8; border: 1px solid #fbcfe8; padding: 16px; border-radius: 8px; margin-bottom: 16px; color: #831843; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            .table td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px; }
            .table td.label { font-weight: bold; background: #f8fafc; width: 40%; color: #475569; }
            .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0;color:#1e293b;letter-spacing:0.5px;">LD SERVICE ZONE</h2>
            <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Official E-Governance & Digital Citizen Services Center</p>
            <h3 style="margin:8px 0 0;color:#db2777;">Voter Mobile Link Submission Receipt</h3>
          </div>
          <div class="box">
            <strong>Status: Processing / Successfully Submitted</strong><br/>
            Your mobile number linking request is submitted and will reflect in electoral record within 5-15 minutes.
          </div>
          <table class="table">
            <tr><td class="label">Reference ID</td><td><strong>${result.refId || result.transactionId || "N/A"}</strong></td></tr>
            <tr><td class="label">Application / Order No</td><td>${result.applicationNo || "N/A"}</td></tr>
            <tr><td class="label">EPIC / Voter ID Number</td><td><strong>${voterLinkEpic}</strong></td></tr>
            <tr><td class="label">Linked Mobile Number</td><td>${voterLinkMobile}</td></tr>
            <tr><td class="label">Date & Time</td><td>${new Date().toLocaleString("en-IN")}</td></tr>
          </table>
          <div class="footer">
            Computerized acknowledgment issued by LD Service Zone. Please keep this receipt for future reference.
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleLlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = llId.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanId) {
      setLlError("Please enter Learning Licence (LL) Number / Application ID");
      return;
    }
    const dynamic = getDynamicService("SVC-LL-PDF", 25);
    if (dynamic.status === "disabled") {
      setLlError("This service is temporarily disabled by admin.");
      return;
    }
    if (Number(wallet?.balance || 0) < dynamic.price) {
      setLlError(`Insufficient wallet balance. Required: ₹${dynamic.price.toFixed(2)}, Current: ₹${Number(wallet?.balance || 0).toFixed(2)}`);
      return;
    }

    setLlLoading(true);
    setLlError("");
    try {
      const res = await api<any>("/apinice/ll-pdf", {
        method: "POST",
        body: JSON.stringify({ idNumber: cleanId }),
      });
      if (res.balance !== undefined) {
        updateBalance(res.balance);
      } else {
        refreshWallet();
      }
      if (res.pdfBase64) {
        setLlPdfBase64(res.pdfBase64);
      } else {
        setLlError("LL document generated, but no download stream was returned.");
      }
    } catch (err: any) {
      setLlError(err.message || "Failed to download Learning Licence PDF");
    } finally {
      setLlLoading(false);
    }
  };

  const handleChassisSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanChassis = chassisNo.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanChassis) {
      setChassisError("Please enter vehicle chassis number");
      return;
    }
    const dynamic = getDynamicService("SVC-CHASSIS-TO-RC", 60);
    if (dynamic.status === "disabled") {
      setChassisError("This service is temporarily disabled by admin.");
      return;
    }
    if (Number(wallet?.balance || 0) < dynamic.price) {
      setChassisError(`Insufficient wallet balance. Required: ₹${dynamic.price.toFixed(2)}, Current: ₹${Number(wallet?.balance || 0).toFixed(2)}`);
      return;
    }

    setChassisLoading(true);
    setChassisError("");
    try {
      const res = await api<any>("/apinice/chassis-to-rc", {
        method: "POST",
        body: JSON.stringify({ chassisNumber: cleanChassis }),
      });
      if (res.balance !== undefined) {
        updateBalance(res.balance);
      } else {
        refreshWallet();
      }
      if (res.plate) {
        setChassisResult(res);
      } else {
        setChassisError("No vehicle details returned for this chassis number.");
      }
    } catch (err: any) {
      setChassisError(err.message || "Failed to find vehicle details from chassis number");
    } finally {
      setChassisLoading(false);
    }
  };

  const printChassisSlip = (res: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const q = res.queryResult || {};
    const loc = res.location?.permanent || res.location?.current || {};
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Chassis Vehicle Search - ${res.plate || "RC"}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; max-width: 650px; margin: auto; }
            .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            .table td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px; }
            .table td.label { font-weight: bold; background: #f8fafc; width: 38%; color: #475569; }
            .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0;color:#1e293b;letter-spacing:0.5px;">LD SERVICE ZONE</h2>
            <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Official E-Governance & Digital Citizen Services Center</p>
            <h3 style="margin:8px 0 0;color:#d97706;">Vehicle Chassis to RC Lookup Report</h3>
          </div>
          <div class="meta">
            <div><strong>Vehicle Plate:</strong> <span style="font-size:16px;font-weight:bold;color:#1d4ed8;">${res.plate || "N/A"}</span></div>
            <div><strong>Search Date:</strong> ${new Date().toLocaleString("en-IN")}</div>
          </div>
          <table class="table">
            <tr><td class="label">Chassis Number</td><td><strong style="font-family:monospace;">${chassisNo}</strong></td></tr>
            <tr><td class="label">Registered Owner</td><td><strong>${res.fullName || "N/A"}</strong></td></tr>
            <tr><td class="label">Father / Relative Name</td><td>${res.relationName || "N/A"}</td></tr>
            <tr><td class="label">Registration Date</td><td>${q.reg_date || "N/A"}</td></tr>
            <tr><td class="label">Fitness / RC Expiry</td><td>${q.expiry || "N/A"}</td></tr>
            <tr><td class="label">Registering RTO Office</td><td>${q.rto_office || "N/A"}</td></tr>
            <tr><td class="label">Registration Status</td><td><strong style="color:#059669;">${q.reg_status || "ACTIVE"}</strong></td></tr>
            ${loc.full_address ? `<tr><td class="label">Registered Address</td><td>${loc.full_address}</td></tr>` : ""}
          </table>
          <div class="footer">
            Computerized electronic enquiry search report issued by LD Service Zone.<br/>
            Data verified from Parivahan National Vehicle Registry.
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleRcMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVehicle = rcMobileVehicle.trim().toUpperCase().replace(/[\s-]/g, "");
    if (!cleanVehicle) {
      setRcMobileError("Please enter vehicle registration number");
      return;
    }
    const dynamic = getDynamicService("SVC-RC-TO-MOBILE", 35);
    if (dynamic.status === "disabled") {
      setRcMobileError("This service is temporarily disabled by admin.");
      return;
    }
    if (Number(wallet?.balance || 0) < dynamic.price) {
      setRcMobileError(`Insufficient wallet balance. Required: ₹${dynamic.price.toFixed(2)}, Current: ₹${Number(wallet?.balance || 0).toFixed(2)}`);
      return;
    }

    setRcMobileLoading(true);
    setRcMobileError("");
    try {
      const res = await api<any>("/apinice/rc-to-mobile", {
        method: "POST",
        body: JSON.stringify({ vehicleNumber: cleanVehicle }),
      });
      if (res.balance !== undefined) {
        updateBalance(res.balance);
      } else {
        refreshWallet();
      }
      if (res.contact || res.fullName) {
        setRcMobileResult(res);
      } else {
        setRcMobileError("No contact mobile found for this vehicle RC.");
      }
    } catch (err: any) {
      setRcMobileError(err.message || "Failed to find registered mobile number from vehicle RC");
    } finally {
      setRcMobileLoading(false);
    }
  };

  const printRcMobileSlip = (res: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>RC Mobile Contact Slip - ${rcMobileVehicle}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; max-width: 600px; margin: auto; }
            .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            .table td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px; }
            .table td.label { font-weight: bold; background: #f8fafc; width: 40%; color: #475569; }
            .contact-box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 14px; border-radius: 8px; margin-bottom: 16px; text-align: center; }
            .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0;color:#1e293b;letter-spacing:0.5px;">LD SERVICE ZONE</h2>
            <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Official E-Governance & Digital Citizen Services Center</p>
            <h3 style="margin:8px 0 0;color:#2563eb;">Vehicle RC Registered Contact Receipt</h3>
          </div>
          <div class="meta">
            <div><strong>Vehicle Plate:</strong> <span style="font-weight:bold;font-size:15px;">${rcMobileVehicle}</span></div>
            <div><strong>Search Date:</strong> ${new Date().toLocaleString("en-IN")}</div>
          </div>
          <div class="contact-box">
            <span style="font-size:12px;color:#1e40af;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Registered Mobile Number:</span><br/>
            <span style="font-size:22px;font-weight:900;color:#1d4ed8;font-family:monospace;letter-spacing:1px;">${res.contact || "N/A"}</span>
          </div>
          <table class="table">
            <tr><td class="label">Vehicle Owner</td><td><strong>${res.fullName || "N/A"}</strong></td></tr>
            <tr><td class="label">Father / Relative Name</td><td>${res.relationName || "N/A"}</td></tr>
            <tr><td class="label">Vehicle Registration No</td><td><strong>${rcMobileVehicle}</strong></td></tr>
            <tr><td class="label">Transaction Reference</td><td>${res.ledgerId || res.transactionId || "N/A"}</td></tr>
          </table>
          <div class="footer">
            Computerized verification report issued by LD Service Zone. Information retrieved from official vehicle registry records.
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleEshramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUid = eshramUid.trim().replace(/[\s-]/g, "");
    const cleanDob = eshramDob.trim();
    if (!cleanUid || cleanUid.length !== 12) {
      setEshramError("Please enter a valid 12-digit Aadhaar number");
      return;
    }
    if (!cleanDob) {
      setEshramError("Please enter date of birth");
      return;
    }
    const dynamic = getDynamicService("SVC-ESHRAM-CARD", 25);
    if (dynamic.status === "disabled") {
      setEshramError("This service is temporarily disabled by admin.");
      return;
    }
    if (Number(wallet?.balance || 0) < dynamic.price) {
      setEshramError(`Insufficient wallet balance. Required: ₹${dynamic.price.toFixed(2)}, Current: ₹${Number(wallet?.balance || 0).toFixed(2)}`);
      return;
    }

    setEshramLoading(true);
    setEshramError("");
    try {
      const res = await api<any>("/apinice/eshram-card", {
        method: "POST",
        body: JSON.stringify({ uidNumber: cleanUid, dob: cleanDob }),
      });
      if (res.balance !== undefined) {
        updateBalance(res.balance);
      } else {
        refreshWallet();
      }
      if (res.pdfBase64) {
        setEshramPdfBase64(res.pdfBase64);
      } else {
        setEshramError("e-Shram card generated, but no download stream was returned.");
      }
    } catch (err: any) {
      setEshramError(err.message || "Failed to download e-Shram card PDF");
    } finally {
      setEshramLoading(false);
    }
  };

  useEffect(() => {
    api<any>("/services").then(d => setServices(d.services || [])).catch(() => setServices([]));
    api<any>("/panmitra/vle-profile").then(setVleProfile).catch(() => {});
  }, []);

  const categories = BASE_CATEGORIES;

  const filteredServices = useMemo(() => {
    const all = [
      ...PRINT_SERVICES.map((s) => {
        const dyn = getDynamicService(s.id, s.defaultPrice);
        return {
          ...s,
          customerPrice: dyn.price,
          status: dyn.status,
          name: dyn.name || s.name,
          isPrintService: true,
        };
      }),
      ...PAN_SERVICES.map((p) => {
        const matched = services.find((s) => s.id === p.id);
        return {
          ...p,
          category: "PAN",
          customerPrice: matched && Number.isFinite(matched.customerPrice) ? matched.customerPrice : p.customerPrice,
          badge: "PAN SERVICE",
          isPrintService: false,
        };
      }),
    ];

    return all.filter((s) => {
      if ((s as any).status === "disabled") return false;

      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (activeCategory === "All Services" || activeCategory === "All") return true;
      if (activeCategory === "Voter Services") return s.category === "Voter Services";
      if (activeCategory === "Vehicle Services") return s.category === "Vehicle Services";
      if (activeCategory === "Citizen Documents") return s.category === "Citizen Documents" || s.category === "Voter Services";
      if (activeCategory === "New PAN") return s.id === "PAN-NEW" || s.id === "PAN-NSDL" || s.id === "PAN-UTI";
      if (activeCategory === "Correction & Reprint") return s.id === "PAN-CORRECTION" || s.id === "PAN-REPRINT";
      if (activeCategory === "UTI PAN") return s.id.includes("UTI") && !s.id.includes("STATUS");
      if (activeCategory === "NSDL PAN") return s.id.includes("NSDL") && !s.id.includes("STATUS");
      if (activeCategory === "Coupons & VLE") return s.id.includes("COUPON") || s.id === "PAN-UTI";
      if (activeCategory === "Status Tracking") return s.id.includes("STATUS");
      return true;
    });
  }, [search, activeCategory, services]);

  const openApplication = (service: any) => {
    setForm({});
    setFiles({});
    setSelectedFiles({});
    setSubmitMessage("");
    const current = services.find(s => s.id === service.id);
    if (!current) {
      setSelectedService({
        ...service,
        customerPrice: service.customerPrice ?? 107,
        documents: service.documents || [],
      });
      return;
    }
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
      if (selectedService.id === "PAN-CORRECTION") return ["Full Name", "PAN Number", "Date of Birth", "Mobile Number", "Father's Name", "Aadhaar Number"];
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
          commission: 0, applicant: form,
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
              ✨ Official PAN Card Agency & Services Hub
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F172A] mt-3">PAN Card Services</h1>
            <p className="text-[#64748B] text-sm mt-1 max-w-xl">Official paperless PAN card issuance, lost PAN search, UTI PSA agency enablement, and live application tracking.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 min-w-[290px]">
            {[
              ["24/7", "Digital Access", "bg-blue-50 text-blue-700"],
              ["UTIITSL", "PSA Channel", "bg-emerald-50 text-emerald-700"],
              ["Fast", "e-KYC & Status", "bg-violet-50 text-violet-700"],
            ].map(([v, l, c]) => (
              <div key={l} className={`rounded-2xl p-3 ${c}`}>
                <p className="font-bold text-sm">{v}</p><p className="text-[10px] mt-0.5 opacity-80">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VLE Agency Banner */}
      {vleProfile?.hasVle ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl border border-violet-700/50">
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Official UTI PSA Agency Active
                </span>
                <span className="text-[10px] text-violet-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                  via LD Service Zone & PanMitra
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-3">
                <h4 className="font-display text-xl font-extrabold text-white">UTIITSL Paperless Agent Portal</h4>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-800/40 border border-violet-500/40">
                  <span className="text-xs text-violet-300">PSA Login ID:</span>
                  <span className="font-mono text-sm font-black text-amber-300 tracking-wide select-all">{vleProfile.vleId}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(vleProfile.vleId);
                      alert("PSA Login ID copied: " + vleProfile.vleId);
                    }}
                    title="Copy PSA ID"
                    className="ml-1 text-[11px] px-1.5 py-0.5 rounded bg-violet-700/60 hover:bg-violet-600 text-white font-medium"
                  >
                    Copy
                  </button>
                </div>
                {vleProfile.registrationCode && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-900/40 border border-emerald-500/40">
                    <span className="text-xs text-emerald-300">Reg Code:</span>
                    <span className="font-mono text-sm font-black text-emerald-200 tracking-wide select-all">{vleProfile.registrationCode}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                🔐 <strong>First Login Instructions:</strong> Log in at UTI PSA portal using your ID <span className="font-mono text-amber-300 font-semibold">{vleProfile.vleId}</span>. Check your email ({vleProfile.user?.email || "registered email"}) for your initial login password sent by UTIITSL/PanMitra.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setBuyCouponOpen(true)}
                className="px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-xs font-bold transition shadow-lg shadow-violet-600/30 flex items-center gap-2"
              >
                <span>🎟️</span> Buy PAN Coupons
              </button>
              <a
                href={vleProfile.psaLoginUrl || "https://www.psaonline.utiitsl.com/psapanservices/forms/login.html/loginHome"}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs font-bold transition shadow-lg shadow-emerald-700/30 flex items-center gap-1.5"
              >
                <span>↗</span> Launch PSA Login Portal
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

      {couponFeedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex justify-between items-center">
          <span>{couponFeedback}</span>
          <button onClick={() => setCouponFeedback("")} className="text-emerald-700 font-bold text-sm">×</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
          <input
            aria-label="Search services"
            placeholder="Search PAN services, UTI, NSDL, tracking..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#E2E8F0] bg-white text-[#0F172A] text-sm shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#1D56D8] placeholder-[#A0AEC0]"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`whitespace-nowrap px-4 py-3 rounded-2xl text-sm font-semibold border transition-all ${
                activeCategory === c
                  ? "bg-[#1D56D8] text-white border-[#1D56D8] shadow-md shadow-blue-200"
                  : "bg-white border-[#E2E8F0] text-[#475569] hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Direct Grid of PAN Services */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display font-bold text-[#0F172A]">Available Services</h2>
            <p className="text-xs text-[#94A3B8]">Select an option to apply, buy coupons, or track status.</p>
          </div>
          <span className="text-xs font-semibold text-[#64748B] bg-[#F8FAFC] px-3 py-1.5 rounded-full border border-[#E2E8F0]">
            {filteredServices.length} Services Available
          </span>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredServices.map((item: any) => {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === "SVC-RC-PRINT") {
                    setRcModalOpen(true);
                    return;
                  }
                  if (item.id === "SVC-DL-PRINT") {
                    setDlModalOpen(true);
                    return;
                  }
                  if (item.id === "SVC-RATION-PRINT") {
                    setRationModalOpen(true);
                    return;
                  }
                  if (item.id === "SVC-VEHICLE-CHALLAN") {
                    setChallanModalOpen(true);
                    return;
                  }
                  if (item.id === "SVC-ABHA-CARD") {
                    setAbhaModalOpen(true);
                    return;
                  }
                  if (item.id === "SVC-VOTER-VERIFY") {
                    setVoterVerifyModalOpen(true);
                    return;
                  }
                  if (item.id === "SVC-VOTER-PDF") {
                    setVoterPdfModalOpen(true);
                    return;
                  }
                  if (item.id === "SVC-VOTER-MOBILE-LINK") {
                    setVoterLinkModalOpen(true);
                    return;
                  }
                  if (item.id === "SVC-LL-PDF") {
                    setLlModalOpen(true);
                    return;
                  }
                  if (item.id === "SVC-CHASSIS-TO-RC") {
                    setChassisModalOpen(true);
                    return;
                  }
                  if (item.id === "SVC-RC-TO-MOBILE") {
                    setRcMobileModalOpen(true);
                    return;
                  }
                  if (item.id === "SVC-ESHRAM-CARD") {
                    setEshramModalOpen(true);
                    return;
                  }
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
                  openApplication({ ...item, category: item.category || "PAN" });
                }}
                className="group rounded-3xl border border-[#E2E8F0] bg-white p-5 text-left hover:border-violet-300 hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner" style={{ backgroundColor: (item.color || "#4F46E5") + "20" }}>
                    {item.icon}
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    item.badge === "VEHICLE PRINT"
                      ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                      : item.badge === "TRAFFIC CHALLAN"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : item.badge === "CITIZEN PRINT"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : item.badge === "HEALTH CARD"
                      ? "bg-teal-50 text-teal-700 border border-teal-200"
                      : item.badge === "VOTER VERIFY"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : item.badge === "VOTER PDF"
                      ? "bg-purple-50 text-purple-700 border border-purple-200"
                      : item.badge === "VOTER LINK"
                      ? "bg-pink-50 text-pink-700 border border-pink-200"
                      : item.badge === "LL PDF"
                      ? "bg-sky-50 text-sky-700 border border-sky-200"
                      : item.badge === "CHASSIS SEARCH"
                      ? "bg-orange-50 text-orange-700 border border-orange-200"
                      : item.badge === "RC MOBILE"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : item.badge === "ESHRAM CARD"
                      ? "bg-orange-50 text-orange-700 border border-orange-200"
                      : "bg-violet-50 text-violet-700"
                  }`}>
                    {item.badge || "PAN SERVICE"}
                  </span>
                </div>
                <h4 className="font-bold text-[#0F172A] mt-4">{item.name}</h4>
                <p className="text-xs text-[#64748B] mt-1">⏱ {item.processingTime}</p>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{item.description}</p>
                <div className="mt-4 rounded-xl bg-[#F8FAFC] border border-[#EEF2F7] p-3 flex justify-between items-center">
                  <span className="text-[11px] text-[#64748B]">Service Fee</span>
                  <span className="font-bold text-sm text-[#0F172A]">
                    {item.customerPrice === 0 ? "Free" : `₹${Number(item.customerPrice).toFixed(2)}`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {item.documents?.map((d: string) => (
                    <span key={d} className="text-[9px] px-2 py-1 rounded-full bg-[#F1F4F9] text-[#475569]">{d}</span>
                  ))}
                </div>
                <div className="mt-4 text-sm font-bold text-[#4F46E5] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  <span>Open {item.name}</span>
                  <span>→</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["🏛️", "Authorized Channel", "Direct UTIITSL & NSDL paperless portal access", "bg-emerald-50"],
          ["⚡", "Fast Processing", "Instant biometric & OTP verification", "bg-amber-50"],
          ["🛡️", "Secure & Safe", "Protected government application workflow", "bg-blue-50"],
          ["🎧", "24/7 Support", "Help your customers with confidence", "bg-violet-50"],
        ].map(([i, t, d, bg]) => (
          <div key={t} className={`rounded-2xl border border-[#E2E8F0] ${bg} p-4`}>
            <div className="text-2xl">{i}</div>
            <p className="font-bold text-sm text-[#0F172A] mt-2">{t}</p>
            <p className="text-[11px] text-[#64748B] mt-1">{d}</p>
          </div>
        ))}
      </section>

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
                      const s = services.find(x => x.id === "PAN-NEW") || { id: "PAN-NEW", name: "New PAN Card", customerPrice: 107, commission: 0, documents: ["Aadhaar", "DOB Proof", "Photograph"] };
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
              <div><div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase">{selectedService.category || "SERVICE"}</div><h3 className="font-display font-extrabold text-[#0F172A] text-xl mt-2">{selectedService.name}</h3><div className="flex gap-2 mt-2"><span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">Government Processing Fee: ₹{selectedService.customerPrice}</span></div></div>
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

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: RC SMART CARD PRINT                                  */}
      {/* ------------------------------------------------------------- */}
      {rcModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#07111F]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-cyan-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center text-xl">
                  🚗
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-lg">RC Smart Card Print</h3>
                  <p className="text-xs text-slate-500">Official Printable RC PDF via Parivahan API</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setRcModalOpen(false);
                  setRcError("");
                  setRcResultPdf(null);
                }}
                className="w-8 h-8 rounded-full bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center border border-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-cyan-50/60 border border-cyan-100 text-xs">
                <div className="flex items-center gap-2 text-cyan-900">
                  <Clock size={16} className="text-cyan-600" />
                  <span>Instant Verification & PDF Generation</span>
                </div>
                <span className="font-extrabold text-sm text-cyan-700">
                  Fee: ₹{getDynamicService("SVC-RC-PRINT", 30).price.toFixed(2)}
                </span>
              </div>

              {rcError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-500" />
                  <span>{rcError}</span>
                </div>
              )}

              {rcResultPdf ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-2">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                    <h4 className="font-bold text-sm">Vehicle RC PDF Generated Successfully!</h4>
                    <p className="text-xs text-emerald-700">
                      RC Smart Card for <strong className="font-mono">{rcNo.toUpperCase()}</strong> is ready to print.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => downloadBase64Pdf(rcResultPdf, `RC_${rcNo.toUpperCase()}.pdf`)}
                      className="py-3 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition"
                    >
                      <Download size={16} />
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => openBase64Pdf(rcResultPdf)}
                      className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
                    >
                      <Printer size={16} />
                      Open & Print
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setRcResultPdf(null);
                      setRcNo("");
                    }}
                    className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition"
                  >
                    Print Another Vehicle RC
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRcSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Vehicle Registration Number (RC No) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. OD02AB1234 or DL01AB1234"
                      value={rcNo}
                      onChange={(e) => setRcNo(e.target.value.toUpperCase().replace(/[\s-]/g, ""))}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-sm uppercase tracking-wider focus:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Enter complete vehicle registration number without spaces</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Card Design Format
                      </label>
                      <select
                        value={rcCardType}
                        onChange={(e) => setRcCardType(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="2">New Smart Card Format</option>
                        <option value="1">Classical Format</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Smart Chip Style
                      </label>
                      <select
                        value={rcChipType}
                        onChange={(e) => setRcChipType(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="1">With Smart Chip</option>
                        <option value="2">Without Chip</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-600">Your Wallet Balance:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{Number(wallet?.balance || 0).toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={rcLoading || !rcNo}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-cyan-600/20 transition flex items-center justify-center gap-2"
                  >
                    {rcLoading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Verifying & Generating RC PDF...</span>
                      </>
                    ) : (
                      <>
                        <Printer size={16} />
                        <span>Pay ₹{getDynamicService("SVC-RC-PRINT", 30).price.toFixed(2)} & Generate RC PDF</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: DRIVING LICENCE PRINT                                */}
      {/* ------------------------------------------------------------- */}
      {dlModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#07111F]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl">
                  🛵
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-lg">Driving Licence Print</h3>
                  <p className="text-xs text-slate-500">Official Printable DL PDF via Sarathi API</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDlModalOpen(false);
                  setDlError("");
                  setDlResultPdf(null);
                }}
                className="w-8 h-8 rounded-full bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center border border-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs">
                <div className="flex items-center gap-2 text-blue-900">
                  <Clock size={16} className="text-blue-600" />
                  <span>Instant Verification & PDF Generation</span>
                </div>
                <span className="font-extrabold text-sm text-blue-700">
                  Fee: ₹{getDynamicService("SVC-DL-PRINT", 25).price.toFixed(2)}
                </span>
              </div>

              {dlError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-500" />
                  <span>{dlError}</span>
                </div>
              )}

              {dlResultPdf ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-2">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                    <h4 className="font-bold text-sm">Driving Licence PDF Generated Successfully!</h4>
                    <p className="text-xs text-emerald-700">
                      Smart Card for DL <strong className="font-mono">{dlNo.toUpperCase()}</strong> is ready to print.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => downloadBase64Pdf(dlResultPdf, `DL_${dlNo.toUpperCase()}.pdf`)}
                      className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition"
                    >
                      <Download size={16} />
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => openBase64Pdf(dlResultPdf)}
                      className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
                    >
                      <Printer size={16} />
                      Open & Print
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDlResultPdf(null);
                      setDlNo("");
                    }}
                    className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition"
                  >
                    Print Another Driving Licence
                  </button>
                </div>
              ) : (
                <form onSubmit={handleDlSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Driving Licence Number (DL No) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. OD0220190012345 or DL-0420110012345"
                      value={dlNo}
                      onChange={(e) => setDlNo(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-sm uppercase tracking-wider focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Date of Birth (DOB) *
                      </label>
                      <input
                        type="date"
                        required
                        value={dlDob}
                        onChange={(e) => setDlDob(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Card Color Style
                      </label>
                      <select
                        value={dlCardType}
                        onChange={(e) => setDlCardType(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="1">White Background Style</option>
                        <option value="2">Light Blue Background Style</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-600">Your Wallet Balance:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{Number(wallet?.balance || 0).toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={dlLoading || !dlNo || !dlDob}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2"
                  >
                    {dlLoading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Verifying & Generating DL PDF...</span>
                      </>
                    ) : (
                      <>
                        <Printer size={16} />
                        <span>Pay ₹{getDynamicService("SVC-DL-PRINT", 25).price.toFixed(2)} & Generate DL PDF</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: RATION CARD PRINT                                    */}
      {/* ------------------------------------------------------------- */}
      {rationModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#07111F]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl">
                  🍚
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-lg">Ration Card Print</h3>
                  <p className="text-xs text-slate-500">Official Citizen Ration Card Document PDF</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setRationModalOpen(false);
                  setRationError("");
                  setRationResultPdf(null);
                }}
                className="w-8 h-8 rounded-full bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center border border-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-xs">
                <div className="flex items-center gap-2 text-emerald-900">
                  <Clock size={16} className="text-emerald-600" />
                  <span>Instant Verification & PDF Generation</span>
                </div>
                <span className="font-extrabold text-sm text-emerald-700">
                  Fee: ₹{getDynamicService("SVC-RATION-PRINT", 25).price.toFixed(2)}
                </span>
              </div>

              {rationError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-500" />
                  <span>{rationError}</span>
                </div>
              )}

              {rationResultPdf ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-2">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                    <h4 className="font-bold text-sm">Ration Card PDF Generated Successfully!</h4>
                    <p className="text-xs text-emerald-700">
                      Ration Document for <strong className="font-mono">{rationNo}</strong> is ready to print.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => downloadBase64Pdf(rationResultPdf, `Ration_${rationNo}.pdf`)}
                      className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition"
                    >
                      <Download size={16} />
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => openBase64Pdf(rationResultPdf)}
                      className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
                    >
                      <Printer size={16} />
                      Open & Print
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setRationResultPdf(null);
                      setRationNo("");
                    }}
                    className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition"
                  >
                    Print Another Ration Card
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRationSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ration Card Number (RC/NFSA No) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 101010101010 or State Ration ID"
                      value={rationNo}
                      onChange={(e) => setRationNo(e.target.value.replace(/\s+/g, ""))}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-sm tracking-wider focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Design Template
                    </label>
                    <select
                      value={rationCardType}
                      onChange={(e) => setRationCardType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="1">Photo Layout Design</option>
                      <option value="2">Simple Layout Design</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-600">Your Wallet Balance:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{Number(wallet?.balance || 0).toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={rationLoading || !rationNo}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                  >
                    {rationLoading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Verifying & Generating Ration PDF...</span>
                      </>
                    ) : (
                      <>
                        <Printer size={16} />
                        <span>Pay ₹{getDynamicService("SVC-RATION-PRINT", 25).price.toFixed(2)} & Generate Ration PDF</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: VEHICLE E-CHALLAN CHECK                               */}
      {/* ------------------------------------------------------------- */}
      {challanModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#07111F]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl">
                  🚨
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-lg">Vehicle e-Challan Check</h3>
                  <p className="text-xs text-slate-500">Live Traffic Violation & Pending Fine Enquiry</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setChallanModalOpen(false);
                  setChallanError("");
                  setChallanResult(null);
                }}
                className="w-8 h-8 rounded-full bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center border border-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 text-xs">
                <div className="flex items-center gap-2 text-amber-900">
                  <Clock size={16} className="text-amber-600" />
                  <span>Real-time Traffic Police & Parivahan Database Lookup</span>
                </div>
                <span className="font-extrabold text-sm text-amber-700">
                  Fee: ₹{getDynamicService("SVC-VEHICLE-CHALLAN", 15).price.toFixed(2)}
                </span>
              </div>

              {challanError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-500" />
                  <span>{challanError}</span>
                </div>
              )}

              {challanResult ? (
                <div className="space-y-4 py-1">
                  {challanResult.challanCount === 0 ? (
                    <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-2">
                      <CheckCircle2 size={36} className="mx-auto text-emerald-600" />
                      <h4 className="font-bold text-base">Vehicle is 100% Clean!</h4>
                      <p className="text-xs text-emerald-700">
                        No pending challans or fines found for <strong className="font-mono">{challanResult.vehicleNumber}</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={20} className="text-rose-600" />
                          <h4 className="font-bold text-sm">
                            {challanResult.challanCount} Pending Challan{challanResult.challanCount > 1 ? "s" : ""} Found
                          </h4>
                        </div>
                        <span className="font-extrabold text-base text-rose-700 font-mono">
                          Total: ₹{challanResult.totalAmount}
                        </span>
                      </div>
                      <p className="text-xs text-rose-700">
                        Vehicle <strong className="font-mono">{challanResult.vehicleNumber}</strong> has pending traffic violation fines.
                      </p>
                    </div>
                  )}

                  {/* List of Challans */}
                  {challanResult.challans && challanResult.challans.length > 0 && (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {challanResult.challans.map((c: any, idx: number) => (
                        <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-slate-800">
                              #{idx + 1} {c.challan_no || "Challan Record"}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                String(c.challan_status).toLowerCase() === "paid"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              ₹{c.challan_amount || 0} · {c.challan_status || "Pending"}
                            </span>
                          </div>
                          <div className="text-slate-600 text-[11px] space-y-0.5">
                            <div><strong className="text-slate-700">Offence:</strong> {c.offences || "Traffic rule violation"}</div>
                            <div><strong className="text-slate-700">Location:</strong> {c.challan_place || "N/A"} {c.office_name ? `(${c.office_name})` : ""}</div>
                            {c.challan_date && <div><strong className="text-slate-700">Date:</strong> {c.challan_date}</div>}
                            {c.owner_name && <div><strong className="text-slate-700">Owner:</strong> {c.owner_name}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => printChallanSlip(challanResult)}
                      className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
                    >
                      <Printer size={16} />
                      Print Challan Slip
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChallanResult(null);
                        setChallanVehicleNo("");
                      }}
                      className="py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
                    >
                      Check Another
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleChallanSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Vehicle Registration Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. OD02AB1234, DL01AB9999, HR03AM4335"
                      value={challanVehicleNo}
                      onChange={(e) => setChallanVehicleNo(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-sm tracking-wider uppercase focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Enter full vehicle registration number without spaces or special symbols.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-600">Your Wallet Balance:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{Number(wallet?.balance || 0).toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={challanLoading || !challanVehicleNo}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
                  >
                    {challanLoading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Fetching Live Challan Records...</span>
                      </>
                    ) : (
                      <>
                        <Printer size={16} />
                        <span>Pay ₹{getDynamicService("SVC-VEHICLE-CHALLAN", 15).price.toFixed(2)} & Check Challans</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: ABHA HEALTH CARD DOWNLOAD */}
      {abhaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setAbhaModalOpen(false);
                setAbhaError("");
                setAbhaResult(null);
                setAbhaUid("");
                setAbhaDob("");
              }}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl shadow-inner">
                🏥
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">ABHA Health Card Print</h3>
                <p className="text-xs text-slate-500">
                  Fee: ₹{getDynamicService("SVC-ABHA-CARD", 35).price.toFixed(2)} · Instant Digital Card Print
                </p>
              </div>
            </div>

            {abhaError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{abhaError}</span>
              </div>
            )}

            {abhaResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-emerald-600" />
                    <div>
                      <h4 className="font-bold text-sm">ABHA Card Generated!</h4>
                      <p className="text-xs text-emerald-700">
                        UID: {abhaResult.uidNumber?.slice(0, 4)}XXXX{abhaResult.uidNumber?.slice(8)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>

                {abhaResult.imageBase64 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 flex justify-center">
                    <img
                      src={abhaResult.imageBase64}
                      alt="ABHA Card Preview"
                      className="max-h-72 w-auto rounded-xl shadow-md object-contain"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {abhaResult.imageBase64 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => printAbhaCard(abhaResult.imageBase64)}
                        className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition"
                      >
                        <Printer size={16} />
                        Print ABHA Card
                      </button>
                      <a
                        href={abhaResult.imageBase64}
                        download={`ABHA-Card-${abhaResult.uidNumber || "Download"}.png`}
                        className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
                      >
                        <Download size={16} />
                        Download Image
                      </a>
                    </>
                  ) : abhaResult.pdf ? (
                    <a
                      href={abhaResult.pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="col-span-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
                    >
                      <Download size={16} />
                      Download / View PDF
                    </a>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAbhaResult(null);
                    setAbhaUid("");
                    setAbhaDob("");
                  }}
                  className="w-full py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
                >
                  Download Another Card
                </button>
              </div>
            ) : (
              <form onSubmit={handleAbhaSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    12-Digit Aadhaar / UID Number *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    placeholder="e.g. 1234 5678 9012"
                    value={abhaUid}
                    onChange={(e) => setAbhaUid(e.target.value.replace(/[^\d\s-]/g, ""))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-sm tracking-wider focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter citizen's 12-digit Aadhaar number linked to ABHA ID.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Date of Birth (as per Aadhaar) *
                  </label>
                  <input
                    type="date"
                    required
                    value={abhaDob}
                    onChange={(e) => setAbhaDob(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Select citizen's exact Date of Birth as registered in Aadhaar.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-600">Your Wallet Balance:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{Number(wallet?.balance || 0).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={abhaLoading || !abhaUid || !abhaDob}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
                >
                  {abhaLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Generating ABHA Health Card...</span>
                    </>
                  ) : (
                    <>
                      <Printer size={16} />
                      <span>
                        Pay ₹{getDynamicService("SVC-ABHA-CARD", 35).price.toFixed(2)} & Download Card
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 6: VOTER ID VERIFICATION */}
      {voterVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setVoterVerifyModalOpen(false);
                setVoterVerifyError("");
                setVoterVerifyResult(null);
                setVoterVerifyEpic("");
              }}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl shadow-inner">
                🗳️
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Voter ID Verification</h3>
                <p className="text-xs text-slate-500">
                  Fee: ₹{getDynamicService("SVC-VOTER-VERIFY", 10).price.toFixed(2)} · Instant Electoral Roll Verification
                </p>
              </div>
            </div>

            {voterVerifyError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{voterVerifyError}</span>
              </div>
            )}

            {voterVerifyResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-indigo-600" />
                      <h4 className="font-bold text-sm">Voter Record Verified!</h4>
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900">
                      {voterVerifyResult.epic_number || voterVerifyEpic}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-700">
                    Official electoral record matched in national voter database.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Citizen Name:</span>
                    <span className="font-bold text-slate-900">{voterVerifyResult.full_name || "N/A"} {voterVerifyResult.full_name_l1 ? `(${voterVerifyResult.full_name_l1})` : ""}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Relative Name:</span>
                    <span className="font-semibold text-slate-800">{voterVerifyResult.relation_name || "N/A"} ({voterVerifyResult.relation_type || "Father/Spouse"})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Age & Gender:</span>
                    <span className="font-semibold text-slate-800">{voterVerifyResult.age || "N/A"} Years · {voterVerifyResult.gender || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Assembly:</span>
                    <span className="font-semibold text-slate-800">{voterVerifyResult.assembly || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Parliament:</span>
                    <span className="font-semibold text-slate-800">{voterVerifyResult.parliament || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">District & State:</span>
                    <span className="font-semibold text-slate-800">{voterVerifyResult.district || "N/A"}, {voterVerifyResult.state || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Polling Booth:</span>
                    <span className="font-semibold text-slate-800 text-right max-w-[60%]">{voterVerifyResult.polling_station || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Part & Serial:</span>
                    <span className="font-mono font-bold text-indigo-700">Part: {voterVerifyResult.part_number || "N/A"} · Serial: {voterVerifyResult.serial_number || "N/A"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => printVoterSlip(voterVerifyResult)}
                    className="py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition"
                  >
                    <Printer size={16} />
                    Print Customer Slip
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVoterVerifyResult(null);
                      setVoterVerifyEpic("");
                    }}
                    className="py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    Verify Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleVoterVerifySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    EPIC / Voter ID Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC1234567, OD02123456"
                    value={voterVerifyEpic}
                    onChange={(e) => setVoterVerifyEpic(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-sm tracking-wider uppercase focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter the citizen's 10-character Voter ID (EPIC) number.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-600">Your Wallet Balance:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{Number(wallet?.balance || 0).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={voterVerifyLoading || !voterVerifyEpic}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2"
                >
                  {voterVerifyLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Verifying Electoral Record...</span>
                    </>
                  ) : (
                    <>
                      <Search size={16} />
                      <span>
                        Pay ₹{getDynamicService("SVC-VOTER-VERIFY", 10).price.toFixed(2)} & Verify Voter ID
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 7: VOTER CARD PDF DOWNLOAD */}
      {voterPdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setVoterPdfModalOpen(false);
                setVoterPdfError("");
                setVoterPdfResult(null);
                setVoterPdfEpic("");
                setVoterPdfName("");
              }}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-2xl shadow-inner">
                🪪
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Voter Card PDF Download</h3>
                <p className="text-xs text-slate-500">
                  Fee: ₹{getDynamicService("SVC-VOTER-PDF", 55).price.toFixed(2)} · Official e-EPIC PDF Card
                </p>
              </div>
            </div>

            {voterPdfError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{voterPdfError}</span>
              </div>
            )}

            {voterPdfResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-purple-600" />
                      <h4 className="font-bold text-sm">Voter PDF Generated!</h4>
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
                      {voterPdfResult.orderId || voterPdfResult.transactionId}
                    </span>
                  </div>
                  <p className="text-xs text-purple-700">
                    EPIC: <strong className="font-mono">{voterPdfEpic}</strong> (State: {voterPdfState})
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {voterPdfResult.pdfUrl ? (
                    <a
                      href={voterPdfResult.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="col-span-2 py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition"
                    >
                      <Download size={16} />
                      Download Voter Card PDF
                    </a>
                  ) : (
                    <div className="col-span-2 p-3 text-center text-xs text-slate-600 bg-slate-50 rounded-2xl border border-slate-200">
                      Order ID <strong>{voterPdfResult.orderId}</strong> created. Card will be available for download shortly.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setVoterPdfResult(null);
                      setVoterPdfEpic("");
                      setVoterPdfName("");
                    }}
                    className="col-span-2 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
                  >
                    Download Another Card
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleVoterPdfSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select State *
                  </label>
                  <select
                    value={voterPdfState}
                    onChange={(e) => setVoterPdfState(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-500"
                  >
                    <option value="OD">Odisha (OD)</option>
                    <option value="BR">Bihar (BR)</option>
                    <option value="UP">Uttar Pradesh (UP)</option>
                    <option value="WB">West Bengal (WB)</option>
                    <option value="JH">Jharkhand (JH)</option>
                    <option value="MP">Madhya Pradesh (MP)</option>
                    <option value="MH">Maharashtra (MH)</option>
                    <option value="RJ">Rajasthan (RJ)</option>
                    <option value="DL">Delhi (DL)</option>
                    <option value="GJ">Gujarat (GJ)</option>
                    <option value="AP">Andhra Pradesh (AP)</option>
                    <option value="TS">Telangana (TS)</option>
                    <option value="TN">Tamil Nadu (TN)</option>
                    <option value="KA">Karnataka (KA)</option>
                    <option value="KL">Kerala (KL)</option>
                    <option value="PB">Punjab (PB)</option>
                    <option value="HR">Haryana (HR)</option>
                    <option value="CT">Chhattisgarh (CT)</option>
                    <option value="AS">Assam (AS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    EPIC / Voter ID Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC1234567, OD02123456"
                    value={voterPdfEpic}
                    onChange={(e) => setVoterPdfEpic(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-sm tracking-wider uppercase focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter the citizen's 10-character Voter ID (EPIC) number.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Citizen Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Full name as printed on Voter Card"
                    value={voterPdfName}
                    onChange={(e) => setVoterPdfName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-600">Your Wallet Balance:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{Number(wallet?.balance || 0).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={voterPdfLoading || !voterPdfEpic || !voterPdfState}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-purple-500/20 transition flex items-center justify-center gap-2"
                >
                  {voterPdfLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Generating Voter Card PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>
                        Pay ₹{getDynamicService("SVC-VOTER-PDF", 55).price.toFixed(2)} & Download Voter PDF
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 8: VOTER MOBILE LINK WITHOUT OTP */}
      {voterLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setVoterLinkModalOpen(false);
                setVoterLinkError("");
                setVoterLinkResult(null);
                setVoterLinkEpic("");
                setVoterLinkMobile("");
              }}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center text-2xl shadow-inner">
                📲
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Voter Mobile Link Without OTP</h3>
                <p className="text-xs text-slate-500">
                  Fee: ₹{getDynamicService("SVC-VOTER-MOBILE-LINK", 25).price.toFixed(2)} · Direct Instant Electoral Mobile Link
                </p>
              </div>
            </div>

            {voterLinkError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{voterLinkError}</span>
              </div>
            )}

            {voterLinkResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-pink-50 border border-pink-200 text-pink-900 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-pink-600" />
                      <h4 className="font-bold text-sm">Request Submitted Successfully!</h4>
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-pink-200 text-pink-900">
                      Processing
                    </span>
                  </div>
                  <p className="text-xs text-pink-700">
                    {voterLinkResult.message || "Number linked pending. Complete within 5 minutes."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Reference ID:</span>
                    <span className="font-mono font-bold text-slate-900">{voterLinkResult.refId || voterLinkResult.transactionId || "N/A"}</span>
                  </div>
                  {voterLinkResult.applicationNo && (
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Application No:</span>
                      <span className="font-mono font-semibold text-slate-800">{voterLinkResult.applicationNo}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">EPIC Number:</span>
                    <span className="font-mono font-bold text-slate-800">{voterLinkEpic}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Mobile Number:</span>
                    <span className="font-mono font-bold text-pink-700">{voterLinkMobile}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => printVoterLinkSlip(voterLinkResult)}
                    className="py-3 px-4 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-600/20 transition"
                  >
                    <Printer size={16} />
                    Print Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVoterLinkResult(null);
                      setVoterLinkEpic("");
                      setVoterLinkMobile("");
                    }}
                    className="py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    Link Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleVoterLinkSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    EPIC / Voter ID Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC1234567, OD02123456"
                    value={voterLinkEpic}
                    onChange={(e) => setVoterLinkEpic(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-sm tracking-wider uppercase focus:bg-white focus:outline-none focus:ring-4 focus:ring-pink-100 focus:border-pink-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter the citizen's 10-character Voter ID (EPIC) number.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    New 10-Digit Mobile Number to Link *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={voterLinkMobile}
                    onChange={(e) => setVoterLinkMobile(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-sm tracking-wider focus:bg-white focus:outline-none focus:ring-4 focus:ring-pink-100 focus:border-pink-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    ⚡ No citizen OTP required. Linking is processed automatically.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-600">Your Wallet Balance:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{Number(wallet?.balance || 0).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={voterLinkLoading || !voterLinkEpic || voterLinkMobile.length !== 10}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-pink-500/20 transition flex items-center justify-center gap-2"
                >
                  {voterLinkLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Submitting Mobile Link Request...</span>
                    </>
                  ) : (
                    <>
                      <Smartphone size={16} />
                      <span>
                        Pay ₹{getDynamicService("SVC-VOTER-MOBILE-LINK", 25).price.toFixed(2)} & Link Mobile
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 9: LEARNING LICENCE (LL) PDF */}
      {llModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setLlModalOpen(false);
                setLlError("");
                setLlPdfBase64(null);
                setLlId("");
              }}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center text-2xl shadow-inner">
                📜
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Learning Licence (LL) PDF</h3>
                <p className="text-xs text-slate-500">
                  Fee: ₹{getDynamicService("SVC-LL-PDF", 25).price.toFixed(2)} · Official Sarathi LL Download
                </p>
              </div>
            </div>

            {llError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{llError}</span>
              </div>
            )}

            {llPdfBase64 ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-sky-600" />
                      <h4 className="font-bold text-sm">Learning Licence Generated!</h4>
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-sky-200 text-sky-900">
                      {llId}
                    </span>
                  </div>
                  <p className="text-xs text-sky-700">
                    Your official Learning Licence document PDF is ready for download.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => downloadBase64Pdf(llPdfBase64, `Learning-Licence-${llId}.pdf`)}
                    className="col-span-2 py-3.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition"
                  >
                    <Download size={16} />
                    Download Learning Licence PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLlPdfBase64(null);
                      setLlId("");
                    }}
                    className="col-span-2 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
                  >
                    Download Another Licence
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLlSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Learning Licence Number / Application ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DL0420230000000, OD02LL12345"
                    value={llId}
                    onChange={(e) => setLlId(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-sm tracking-wider uppercase focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter Sarathi Learning Licence number or application reference ID.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-600">Your Wallet Balance:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{Number(wallet?.balance || 0).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={llLoading || !llId}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2"
                >
                  {llLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Fetching Learning Licence PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>
                        Pay ₹{getDynamicService("SVC-LL-PDF", 25).price.toFixed(2)} & Download LL
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 10: CHASSIS NUMBER TO RC DETAILS */}
      {chassisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setChassisModalOpen(false);
                setChassisError("");
                setChassisResult(null);
                setChassisNo("");
              }}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl shadow-inner">
                🔍
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Chassis to RC Details</h3>
                <p className="text-xs text-slate-500">
                  Fee: ₹{getDynamicService("SVC-CHASSIS-TO-RC", 60).price.toFixed(2)} · Instant Parivahan Vehicle Lookup
                </p>
              </div>
            </div>

            {chassisError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{chassisError}</span>
              </div>
            )}

            {chassisResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-amber-600" />
                      <h4 className="font-bold text-sm">Vehicle Record Found!</h4>
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      Matched
                    </span>
                  </div>
                  <div className="text-xs text-amber-800 pt-1 flex items-center justify-between">
                    <span>Registration Plate:</span>
                    <span className="font-mono font-black text-base text-blue-700">{chassisResult.plate}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Registered Owner:</span>
                    <span className="font-bold text-slate-900">{chassisResult.fullName || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Relative / Father Name:</span>
                    <span className="font-semibold text-slate-800">{chassisResult.relationName || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Chassis Number:</span>
                    <span className="font-mono font-semibold text-slate-800">{chassisNo}</span>
                  </div>
                  {chassisResult.queryResult?.reg_date && (
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Registration Date:</span>
                      <span className="font-semibold text-slate-800">{chassisResult.queryResult.reg_date}</span>
                    </div>
                  )}
                  {chassisResult.queryResult?.expiry && (
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">Fitness / Expiry Date:</span>
                      <span className="font-semibold text-slate-800">{chassisResult.queryResult.expiry}</span>
                    </div>
                  )}
                  {chassisResult.queryResult?.rto_office && (
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">RTO Office:</span>
                      <span className="font-semibold text-slate-800">{chassisResult.queryResult.rto_office}</span>
                    </div>
                  )}
                  {chassisResult.location?.permanent?.full_address && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Registered Address:</span>
                      <span className="font-semibold text-slate-800 text-right max-w-[65%]">{chassisResult.location.permanent.full_address}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => printChassisSlip(chassisResult)}
                    className="py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition"
                  >
                    <Printer size={16} />
                    Print Vehicle Slip
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChassisResult(null);
                      setChassisNo("");
                    }}
                    className="py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    Search Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleChassisSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Vehicle Chassis Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MBLJFW240GH09017, MA3ER... (17 chars)"
                    value={chassisNo}
                    onChange={(e) => setChassisNo(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-sm tracking-wider uppercase focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter the complete 17-digit chassis number stamped on the vehicle.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-600">Your Wallet Balance:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{Number(wallet?.balance || 0).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={chassisLoading || !chassisNo}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
                >
                  {chassisLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Searching Vehicle Registry...</span>
                    </>
                  ) : (
                    <>
                      <Search size={16} />
                      <span>
                        Pay ₹{getDynamicService("SVC-CHASSIS-TO-RC", 60).price.toFixed(2)} & Find RC
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 11: RC TO MOBILE SEARCH */}
      {rcMobileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setRcMobileModalOpen(false);
                setRcMobileError("");
                setRcMobileResult(null);
                setRcMobileVehicle("");
              }}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl shadow-inner">
                📞
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">RC to Mobile Number Search</h3>
                <p className="text-xs text-slate-500">
                  Fee: ₹{getDynamicService("SVC-RC-TO-MOBILE", 35).price.toFixed(2)} · Instant Registered Owner Mobile Lookup
                </p>
              </div>
            </div>

            {rcMobileError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{rcMobileError}</span>
              </div>
            )}

            {rcMobileResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-blue-600" />
                      <h4 className="font-bold text-sm">Owner Contact Found!</h4>
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
                      {rcMobileVehicle}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-blue-200 text-center">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Registered Mobile Number</span>
                    <div className="font-mono font-black text-2xl text-blue-700 tracking-wider mt-0.5">
                      {rcMobileResult.contact || "Not Available"}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Vehicle Owner:</span>
                    <span className="font-bold text-slate-900">{rcMobileResult.fullName || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Father / Relative:</span>
                    <span className="font-semibold text-slate-800">{rcMobileResult.relationName || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Vehicle Registration:</span>
                    <span className="font-mono font-bold text-slate-800">{rcMobileVehicle}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => printRcMobileSlip(rcMobileResult)}
                    className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition"
                  >
                    <Printer size={16} />
                    Print Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRcMobileResult(null);
                      setRcMobileVehicle("");
                    }}
                    className="py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    Search Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRcMobileSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Vehicle Registration Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OD02AB1234, BR01AB2254"
                    value={rcMobileVehicle}
                    onChange={(e) => setRcMobileVehicle(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-sm tracking-wider uppercase focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter the vehicle plate number without spaces or special symbols.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-600">Your Wallet Balance:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{Number(wallet?.balance || 0).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={rcMobileLoading || !rcMobileVehicle}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2"
                >
                  {rcMobileLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Searching Registered Contact...</span>
                    </>
                  ) : (
                    <>
                      <Smartphone size={16} />
                      <span>
                        Pay ₹{getDynamicService("SVC-RC-TO-MOBILE", 35).price.toFixed(2)} & Find Mobile
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 12: E-SHRAM CARD PDF DOWNLOAD */}
      {eshramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setEshramModalOpen(false);
                setEshramError("");
                setEshramPdfBase64(null);
                setEshramUid("");
                setEshramDob("");
              }}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center text-2xl shadow-inner">
                👷
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">e-Shram Card PDF Download</h3>
                <p className="text-xs text-slate-500">
                  Fee: ₹{getDynamicService("SVC-ESHRAM-CARD", 25).price.toFixed(2)} · Official e-Shram UAN Card
                </p>
              </div>
            </div>

            {eshramError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{eshramError}</span>
              </div>
            )}

            {eshramPdfBase64 ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-orange-900 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-orange-600" />
                      <h4 className="font-bold text-sm">e-Shram Card Generated!</h4>
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-orange-200 text-orange-900">
                      {eshramUid.slice(0, 4)}XXXX{eshramUid.slice(8)}
                    </span>
                  </div>
                  <p className="text-xs text-orange-700">
                    Your official e-Shram worker card document PDF is ready for download.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => downloadBase64Pdf(eshramPdfBase64, `eShram-Card-${eshramUid}.pdf`)}
                    className="col-span-2 py-3.5 px-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 transition"
                  >
                    <Download size={16} />
                    Download e-Shram Card PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEshramPdfBase64(null);
                      setEshramUid("");
                      setEshramDob("");
                    }}
                    className="col-span-2 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
                  >
                    Download Another Card
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEshramSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    12-digit Aadhaar (UID) Number *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="Enter 12-digit Aadhaar number"
                    value={eshramUid}
                    onChange={(e) => setEshramUid(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-sm tracking-widest focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Date of Birth (as per Aadhaar) *
                  </label>
                  <input
                    type="date"
                    required
                    value={eshramDob}
                    onChange={(e) => setEshramDob(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Select citizen's exact date of birth matching their Aadhaar record.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-600">Your Wallet Balance:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{Number(wallet?.balance || 0).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={eshramLoading || eshramUid.length !== 12 || !eshramDob}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2"
                >
                  {eshramLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Fetching e-Shram Card...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>
                        Pay ₹{getDynamicService("SVC-ESHRAM-CARD", 25).price.toFixed(2)} & Download Card
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
