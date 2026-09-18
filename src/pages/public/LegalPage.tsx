import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShieldCheck, FileText, RotateCcw, Truck, Phone, Mail, MapPin, Clock, ArrowLeft } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import AnimatedBackground from "@/components/background/AnimatedBackground";

interface LegalPageProps {
  initialTab?: "terms" | "privacy" | "refund" | "shipping" | "contact";
}

export default function LegalPage({ initialTab }: LegalPageProps) {
  const location = useLocation();

  // Determine active tab from prop or route path
  const getTabFromPath = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes("privacy")) return "privacy";
    if (path.includes("refund")) return "refund";
    if (path.includes("shipping")) return "shipping";
    if (path.includes("contact")) return "contact";
    return "terms";
  };

  const activeTab = initialTab || getTabFromPath();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const tabs = [
    { id: "terms", label: "Terms of Service", path: "/terms", icon: FileText },
    { id: "privacy", label: "Privacy Policy", path: "/privacy", icon: ShieldCheck },
    { id: "refund", label: "Refund & Cancellation", path: "/refund", icon: RotateCcw },
    { id: "shipping", label: "Shipping & Delivery", path: "/shipping", icon: Truck },
    { id: "contact", label: "Contact Us", path: "/contact", icon: Phone },
  ];

  return (
    <div className="relative isolate min-h-screen bg-[#07111F] text-slate-100 flex flex-col">
      <AnimatedBackground />
      <PublicNav />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        {/* Header Breadcrumb */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Policies & Compliance
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            LD SERVICE ZONE · Official Merchant Policies, Terms of Service & Customer Charter.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/10">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <Link
                key={t.id}
                to={t.path}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* Content Card */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-white/10 p-6 sm:p-10 text-slate-300 text-sm leading-relaxed space-y-6">
          {/* ======================================================== */}
          {/* TERMS OF SERVICE                                         */}
          {/* ======================================================== */}
          {activeTab === "terms" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  Terms and Conditions
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Last updated: September 18, 2026 · Governing Law: India (Odisha Jurisdiction)
                </p>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">1. Introduction & Acceptance</h3>
                <p>
                  Welcome to <b>LD SERVICE ZONE</b> ("we", "our", "us"). By accessing or using our
                  portal (https://ldservicezone.in), mobile interface, or partnering as an authorized
                  retailer/agent, you agree to be bound by these Terms and Conditions. If you do not
                  agree with any part of these terms, you must not use our platform.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">2. Scope of Services</h3>
                <p>
                  LD SERVICE ZONE is a digital facilitation platform providing online multi-utility,
                  citizen services, UTI PSA PAN agency enablement, utility bill payments (BBPS), and
                  recharge facilities to authorized retailers, Common Service Centers (CSCs), cyber
                  cafes, and general citizens. We operate under the <b>"Services"</b> category and do
                  not manufacture or ship physical consumer goods.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">3. User & Retailer Account Obligations</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li>Users and retailers must submit accurate, authentic KYC documentation (Aadhaar, PAN, Mobile).</li>
                  <li>Account credentials, passwords, and two-factor tokens must be kept confidential. Any transaction initiated through an authorized login shall be deemed authorized by the account holder.</li>
                  <li>Retailers must charge customers only the prescribed official service rates and issue genuine acknowledgment slips.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">4. Payment & Wallet Terms</h3>
                <p>
                  All payments, wallet top-ups, and transaction settlements are denominated in Indian
                  National Rupees (INR / ₹). Top-ups can be completed via authorized payment gateways
                  (UPI, NetBanking, Debit/Credit Cards). Wallet credits are non-transferable between
                  unauthorized third parties.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">5. Intellectual Property & Fair Use</h3>
                <p>
                  All trademarks, branding, user interfaces, and software algorithms on LD SERVICE ZONE
                  are the exclusive property of LD SERVICE ZONE. Unauthorized scraping, reverse
                  engineering, or fraudulent exploitation is strictly prohibited and subject to legal
                  action under the Information Technology Act, 2000.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">6. Limitation of Liability</h3>
                <p>
                  While we endeavor to provide 99.9% uptime, we shall not be held liable for temporary
                  delays or service failures arising from government department server downtimes,
                  upstream operator disruptions, or force majeure events.
                </p>
              </section>
            </div>
          )}

          {/* ======================================================== */}
          {/* PRIVACY POLICY                                           */}
          {/* ======================================================== */}
          {activeTab === "privacy" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  Privacy Policy
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Last updated: September 18, 2026 · Compliant with Digital Personal Data Protection (DPDP) Act
                </p>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">1. Information We Collect</h3>
                <p>
                  To deliver citizen services and comply with statutory requirements, we collect:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li><b>Contact & Identity Details:</b> Full Name, Email, Mobile Number, Shop/Business Name, City, State, and Pincode.</li>
                  <li><b>Identity Verification Data:</b> Masked Aadhaar details, PAN number, and business license copies strictly for KYC compliance.</li>
                  <li><b>Transaction Records:</b> Application identifiers, wallet balance changes, payment gateway reference numbers, and IP audit logs.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">2. How We Use Your Data</h3>
                <p>
                  Your information is utilized solely for:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li>Processing service requests with designated government departments and utility operators.</li>
                  <li>Sending automated SMS / WhatsApp / Email receipts and application status updates.</li>
                  <li>Preventing fraud, money laundering, and ensuring financial security.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">3. Data Security & Storage</h3>
                <p>
                  We implement robust enterprise security standards including AES-256 encryption at
                  rest, cryptographic password hashing (scrypt), and secure TLS/HTTPS data transit.
                  We never sell or rent your personal information to third-party marketing companies.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">4. Cookies & Session Management</h3>
                <p>
                  We use essential session tokens and cookies necessary for authentication, session
                  security, and fraud detection.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">5. Grievance Redressal</h3>
                <p>
                  For any privacy inquiries or data update requests, please write to our Grievance
                  Officer at <b>bilsondigal058@gmail.com</b> or call <b>+91 6370892501</b>.
                </p>
              </section>
            </div>
          )}

          {/* ======================================================== */}
          {/* REFUND & CANCELLATION POLICY                             */}
          {/* ======================================================== */}
          {activeTab === "refund" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  Cancellation & Refund Policy
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Last updated: September 18, 2026 · Transparent Customer Protection
                </p>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">1. Service Cancellation</h3>
                <p>
                  Customers and retailers may request service cancellation under the following conditions:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li><b>Pending Applications:</b> If an application has been created but payment or verification has not been initiated with the government authority, cancellation can be requested.</li>
                  <li><b>Processed Applications:</b> Once an application has been officially submitted to a government portal (such as UTIITSL for PAN cards, or revenue portals for certificates), cancellation cannot be entertained as government fees are non-refundable.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">2. Automatic Failed Transaction Refunds</h3>
                <p>
                  In the event of a technical disruption, server timeout, or recharge failure where funds
                  have been debited from your wallet/bank:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li><b>Wallet Payments:</b> 100% of the deducted amount is automatically refunded back to your LD SERVICE ZONE wallet within <b>1 to 24 hours</b> upon reconciliation.</li>
                  <li><b>Payment Gateway (UPI / NetBanking / Cards):</b> If your bank account was debited but the order failed, funds are reversed back to your original payment source within <b>3 to 7 working days</b> as per standard RBI payment gateway guidelines.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">3. Wallet Balance Refunds</h3>
                <p>
                  If an authorized retailer chooses to close their account, unused and unencumbered wallet
                  balances can be withdrawn back to their verified bank account upon raising a support
                  request. KYC verification is mandatory prior to processing bank account transfers.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">4. Refund Request Procedure</h3>
                <p>
                  To report any billing discrepancies or request manual assistance, please contact our
                  dedicated support helpline at <b>+91 6370892501</b> or email <b>support@ldservicezone.in</b> with your
                  Application Number / Transaction ID. All refund requests are reviewed within 24–48 hours.
                </p>
              </section>
            </div>
          )}

          {/* ======================================================== */}
          {/* SHIPPING & DELIVERY POLICY (DIGITAL SERVICES)            */}
          {/* ======================================================== */}
          {activeTab === "shipping" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  Shipping and Delivery Policy (Digital Services)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Last updated: September 18, 2026 · Online Electronic Delivery
                </p>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">1. Nature of Delivery</h3>
                <p>
                  <b>LD SERVICE ZONE is an online digital technology and citizen services platform.</b>
                  All products, tokens, vouchers, UTI coupons, recharge confirmations, and application
                  acknowledgments are <b>delivered electronically</b> via our web portal, registered
                  retailer dashboard, WhatsApp, and registered email.
                </p>
                <p className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
                  ℹ️ We do not ship physical packages, courier parcels, or tangible goods. Consequently,
                  physical postal shipping charges are not applicable.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">2. Delivery Timeframes</h3>
                <ul className="list-disc pl-5 space-y-2 text-slate-300">
                  <li>
                    <b>Instant Delivery (Immediate):</b> Mobile recharges, DTH top-ups, BBPS bill payment
                    receipts, wallet credits, and UTI PSA agent logins are processed and delivered instantly
                    online within seconds.
                  </li>
                  <li>
                    <b>Service Application Acknowledgments (24 to 72 Hours):</b> Government citizen applications
                    (PAN Card acknowledgments, certificate generation, licenses) are processed and delivered
                    to your dashboard within <b>24 to 72 business hours</b>, subject to verification and government server availability.
                  </li>
                  <li>
                    <b>Physical PAN Card / Certificates:</b> If an applicant requests a physical plastic PAN
                    card, the physical card is dispatched directly by the respective government authority
                    (UTIITSL / Income Tax Department) via India Post / Speed Post to the applicant’s postal address.
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold text-white">3. Delivery Confirmation</h3>
                <p>
                  Upon successful completion of any transaction, an official digital acknowledgment receipt
                  with a unique tracking identifier is generated on the user's dashboard and can be printed
                  or downloaded in PDF/image format at any time.
                </p>
              </section>
            </div>
          )}

          {/* ======================================================== */}
          {/* CONTACT US                                               */}
          {/* ======================================================== */}
          {activeTab === "contact" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  Contact Us
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  We are here to assist you with onboarding, payments, and service queries.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
                  <div className="flex items-center gap-2.5 text-blue-400 font-semibold text-sm">
                    <Phone className="w-4 h-4" />
                    <span>Customer Support & Helpline</span>
                  </div>
                  <p className="text-white text-base font-mono font-bold">+91 6370892501</p>
                  <p className="text-xs text-slate-400">
                    Call or chat with us on WhatsApp for fast onboarding, technical support, and transaction queries.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
                  <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-sm">
                    <Mail className="w-4 h-4" />
                    <span>Email Support</span>
                  </div>
                  <p className="text-white text-sm font-mono font-semibold break-all">
                    bilsondigal058@gmail.com
                  </p>
                  <p className="text-xs text-slate-400">
                    Send official inquiries, bank verification documents, or billing dispute emails.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3 sm:col-span-2">
                  <div className="flex items-center gap-2.5 text-purple-400 font-semibold text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>Registered Business Office</span>
                  </div>
                  <div className="text-xs text-slate-300 space-y-1">
                    <p className="font-bold text-white text-sm">LD SERVICE ZONE</p>
                    <p>Proprietor: Bilson Digal</p>
                    <p>Digital Citizen Hub, Odisha, India</p>
                    <p>District: Khordha / Kandhamal · PIN: 751007</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-2 sm:col-span-2">
                  <div className="flex items-center gap-2.5 text-amber-400 font-semibold text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Operating Hours</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Monday to Saturday: <b>9:00 AM – 8:00 PM IST</b>
                  </p>
                  <p className="text-xs text-slate-400">
                    Online automated services (Recharge, BBPS, Wallet Load) operate 24x7x365.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <p>© 2026 LD SERVICE ZONE. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-slate-300">Terms</Link>
            <Link to="/privacy" className="hover:text-slate-300">Privacy</Link>
            <Link to="/refund" className="hover:text-slate-300">Refunds</Link>
            <Link to="/shipping" className="hover:text-slate-300">Delivery</Link>
            <Link to="/contact" className="hover:text-slate-300">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
