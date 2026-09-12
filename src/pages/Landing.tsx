import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { BarChart3, Building2, Car, CheckCircle2, CreditCard, FileBadge2, FileText, IndianRupee, LayoutDashboard, Menu, Receipt, ShieldCheck, Smartphone, Sparkles, Users, Vote, WalletCards, X, Zap } from "lucide-react";
import ldLogo from "@/imports/ChatGPT_Image_Aug_26__2026_at_03_14_08_PM-1.png";
import SupportWidget from "../components/SupportWidget";

interface Props {
  onLogin: (token: string, user: any) => void;
}

const services: Array<{ icon: LucideIcon; name: string; desc: string; color: string }> = [
  { icon: Smartphone, name: "Recharge & Utilities", desc: "Mobile, DTH, Broadband, Electricity, Gas, Water", color: "from-blue-500 to-blue-600" },
  { icon: CreditCard, name: "PAN & Tax", desc: "New PAN, Corrections, ITR Filing, GST Registration", color: "from-indigo-500 to-indigo-600" },
  { icon: Building2, name: "Government Services", desc: "Voter ID, Driving Licence, RC, Certificates", color: "from-violet-500 to-violet-600" },
  { icon: FileText, name: "Document Services", desc: "PDF Generation, Document Download & Preview", color: "from-cyan-500 to-cyan-600" },
  { icon: IndianRupee, name: "Financial Services", desc: "Money Transfer, Insurance, Loans, Investment", color: "from-emerald-500 to-emerald-600" },
  { icon: BarChart3, name: "Business Tools", desc: "Analytics, Commission Tracking, CRM, Reports", color: "from-amber-500 to-amber-600" },
  { icon: WalletCards, name: "Digital Products", desc: "Vouchers, Gift Cards, Software Licenses", color: "from-pink-500 to-pink-600" },
  { icon: Users, name: "Partner Services", desc: "B2B Store, CSP Services, Bulk Operations", color: "from-teal-500 to-teal-600" },
];

const features: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  { icon: Zap, title: "Faster Transactions", desc: "Process recharges and bill payments in under 3 seconds with our optimized infrastructure." },
  { icon: BarChart3, title: "Higher Earning Potential", desc: "Track commissions from the services enabled for your account." },
  { icon: LayoutDashboard, title: "Centralized Operations", desc: "Manage every service, customer, and transaction from a single intelligent workspace." },
  { icon: Receipt, title: "Real-Time Tracking", desc: "Monitor your business with live dashboards, instant alerts, and detailed analytics." },
  { icon: Sparkles, title: "Business Insights", desc: "AI-powered insights help you identify growth opportunities and optimize your services." },
  { icon: ShieldCheck, title: "Dedicated Support", desc: "24/7 partner support via chat, call, and ticket system with guaranteed SLA." },
];

const faqs = [
  { q: "How do I get started?", a: "Register with your mobile number, complete KYC verification, add money to your wallet, and start offering services immediately. The entire process takes under 30 minutes." },
  { q: "What documents are required for KYC?", a: "You need your Aadhaar card, PAN card, a selfie, and bank account details for settlements. Business registration documents are optional but increase your daily transaction limits." },
  { q: "How are commissions paid?", a: "Commissions are credited to your wallet instantly after each successful transaction. You can request settlement to your bank account daily, weekly, or monthly." },
  { q: "What is the minimum wallet balance required?", a: "There is no minimum balance requirement. However, you need sufficient balance to process transactions. We recommend maintaining ₹5,000+ for smooth operations." },
  { q: "Is the platform available on mobile?", a: "Yes, the platform is fully responsive and works on all devices. We also have a dedicated mobile app available for Android and iOS." },
];

export default function Landing({ onLogin }: Props) {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleStartBusiness = () => navigate("/register");

  return (
    <div className="min-h-screen bg-transparent text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-md bg-[#07111F]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src={ldLogo} alt="LD Service Zone" className="h-9 w-9 rounded-full object-cover" />
            <span className="font-display font-bold text-xs sm:text-lg tracking-tight">LD SERVICE ZONE</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#services" className="hover:text-white transition-colors">Services</a>
            <a href="#features" className="hover:text-white transition-colors">Platform</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/login")}
              className="hidden sm:block px-4 py-2 text-sm text-white/80 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(v => !v)}
              className="md:hidden w-9 h-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/80"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <button
              onClick={handleStartBusiness}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#1D56D8] hover:bg-[#1849C0] transition-colors"
            >
              Start Your Business
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#050B18]/95 backdrop-blur-xl px-4 py-4">
            <div className="grid gap-1 text-sm">
              {[
                ["Services", "#services"],
                ["Platform", "#features"],
                ["How it works", "#how-it-works"],
                ["FAQ", "#faq"],
              ].map(([label, href]) => (
                <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 text-white/70 hover:bg-white/5 hover:text-white">{label}</a>
              ))}
              <button onClick={() => navigate("/login")} className="mt-2 rounded-lg border border-white/10 px-3 py-3 text-left text-white/80">Sign In</button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold tracking-widest uppercase mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse-soft" />
              Built for India's Digital Entrepreneurs
            </div>
            <h1 className="font-display text-5xl sm:text-6xl font-extrabold leading-tight mb-6">
              Turn Every Service<br />
              <span className="gradient-text">Into a Business</span><br />
              Opportunity.
            </h1>
            <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-lg">
              LD Service Zone brings recharge, PAN, government services, document solutions, financial utilities and business tools into one powerful workspace.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleStartBusiness}
                className="px-7 py-3.5 rounded-xl bg-[#1D56D8] hover:bg-[#1849C0] font-semibold text-base transition-all glow-blue hover:scale-105"
              >
                Start Your Business →
              </button>
              <button
                onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
                className="px-7 py-3.5 rounded-xl border border-white/20 hover:border-white/40 font-semibold text-base transition-all"
              >
                Explore Platform
              </button>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-white/50">
              <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Free to register</span>
              <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> No monthly fees</span>
              <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Instant activation</span>
            </div>
          </div>

          {/* Dashboard preview card */}
          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 glow-blue">
              {/* Mini header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-white/40 font-mono-data">LIVE PREVIEW — Your LD Service Zone workspace</p>
                  <p className="text-sm font-semibold">Your live business dashboard</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400">Live</span>
                </div>
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Wallet Balance", value: "Live", color: "text-cyan-400" },
                  { label: "Today's Sales", value: "Live", color: "text-emerald-400" },
                  { label: "Commission", value: "Live", color: "text-amber-400" },
                  { label: "Transactions", value: "Live", color: "text-blue-400" },
                ].map(k => (
                  <div key={k.label} className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{k.label}</p>
                    <p className={`font-mono-data font-bold text-base ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Mini chart bars */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 mb-4">
                <div className="flex items-end justify-between gap-1 h-16">
                  {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-gradient-to-t from-blue-600 to-cyan-400 opacity-80"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-white/40 mt-2">Revenue — Last 7 days</p>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Recharge", "/register", Smartphone],
                  ["Add Money", "/register", WalletCards],
                  ["PAN", "/register", CreditCard],
                ].map(([label, href, Icon]) => (
                  <button key={String(label)} onClick={() => navigate(String(href))} className="rounded-lg bg-white/5 border border-white/10 p-2 text-center text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-1.5">
                    <Icon size={13} /> {String(label)}
                  </button>
                ))}
              </div>
            </div>


          </div>
        </div>
      </section>

      {/* Platform promise bar */}
      <div className="border-y border-white/10 bg-white/3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {["Live wallet ledger","Live transaction status","Backend-scoped analytics","Secure server-side payments"].map(x=><div key={x} className="text-sm text-white/60"><span className="text-blue-300">✓</span> {x}</div>)}
        </div>
      </div>

      {/* Services */}
      <section id="services" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-blue-400 text-sm font-semibold tracking-widest uppercase mb-3">Platform Services</p>
            <h2 className="font-display text-4xl font-extrabold mb-4">Everything Your Business Needs.<br />One Workspace.</h2>
            <p className="text-white/50 max-w-xl mx-auto">Multiple service categories — all managed from a single, intelligent dashboard.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {services.map(s => (
              <div key={s.name} className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-all card-hover cursor-pointer group">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <s.icon size={19} strokeWidth={1.8} />
                </div>
                <h3 className="font-semibold mb-1.5">{s.name}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard preview section */}
      <section id="pricing" className="py-24 bg-white/3 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl font-extrabold mb-4">Your Business, At a Glance.</h2>
            <p className="text-white/50">Real-time visibility into every rupee earned, every service delivered.</p>
          </div>
          <div className="grid md:grid-cols-5 gap-4 max-w-4xl mx-auto">
            {[
              { label: "Wallet Balance", value: "Live", sub: "From your backend", color: "border-cyan-500/40 bg-cyan-500/10" },
              { label: "Today's Revenue", value: "Live", sub: "Computed from transactions", color: "border-emerald-500/40 bg-emerald-500/10" },
              { label: "Today's Commission", value: "Live", sub: "Computed from records", color: "border-amber-500/40 bg-amber-500/10" },
              { label: "Transactions", value: "Live", sub: "Real-time backend data", color: "border-blue-500/40 bg-blue-500/10" },
              { label: "Success Rate", value: "Live", sub: "Computed from status", color: "border-violet-500/40 bg-violet-500/10" },
            ].map(k => (
              <div key={k.label} className={`rounded-2xl border ${k.color} p-5 text-center`}>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2">{k.label}</p>
                <p className="font-display font-extrabold text-2xl font-mono-data">{k.value}</p>
                <p className="text-white/40 text-xs mt-1">{k.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-white/[0.025] border-y border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-blue-400 text-sm font-semibold tracking-widest uppercase mb-3">How it works</p>
            <h2 className="font-display text-4xl font-extrabold mb-4">From registration to revenue in four steps.</h2>
            <p className="text-white/50 max-w-xl mx-auto">A simple operating flow built for retailers who want less friction and more throughput.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            {([
              ["01", "Create your account", "Register your business and verify your mobile number.", Users],
              ["02", "Complete KYC", "Submit the required documents for partner activation.", ShieldCheck],
              ["03", "Fund your wallet", "Add working balance and unlock the services you need.", WalletCards],
              ["04", "Serve & earn", "Process applications, payments and recharges while tracking commissions.", IndianRupee],
            ] as Array<[string, string, string, LucideIcon]>).map(([step, title, desc, Icon]) => (
              <div key={String(step)} className="relative rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between mb-6"><span className="font-mono-data text-xs text-blue-300">{step}</span><span className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-300 flex items-center justify-center"><Icon size={18}/></span></div>
                <h3 className="font-semibold mb-2">{String(title)}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{String(desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl font-extrabold mb-4">Built to Help You Grow</h2>
            <p className="text-white/50">Every feature designed to maximize your earnings and minimize your effort.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/3 p-6 hover:bg-white/6 transition-all">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-400/15 text-blue-300 flex items-center justify-center mb-4"><f.icon size={20} /></div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency section */}
      <section className="py-24 bg-white/3 border-y border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-4xl font-extrabold mb-4">No fabricated dashboard numbers.</h2>
          <p className="text-white/50 leading-relaxed">After registration, wallet balances, transactions, commissions, customer counts and analytics are populated from your authenticated backend records. A new account starts empty — exactly as it should.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl font-extrabold mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="rounded-xl border border-white/10 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium">{f.q}</span>
                  <span className="text-white/40 text-lg">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-white/60 text-sm leading-relaxed border-t border-white/10 pt-4">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-[#1D56D8]/30 to-[#4F46E5]/20 border-y border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-4xl font-extrabold mb-4">Ready to Build a Better Digital Business?</h2>
          <p className="text-white/60 text-lg mb-8">Start with a clean account and connect the services your business actually uses.</p>
          <button
            onClick={handleStartBusiness}
            className="px-8 py-4 rounded-xl bg-[#1D56D8] hover:bg-[#1849C0] font-bold text-lg transition-all glow-blue hover:scale-105"
          >
            Create Your LD Account →
          </button>
          <p className="text-white/30 text-sm mt-4">Free forever · No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src={ldLogo} alt="LD Service Zone" className="h-8 w-8 rounded-full object-cover" />
                <span className="font-display font-bold">LD SERVICE ZONE</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed mb-4">India's Digital Commerce & Service Operating System. Powering India's next generation of digital retailers.</p>
              <div className="flex gap-3">
                {["𝕏", "📘", "📸", "▶️"].map(s => (
                  <div key={s} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm cursor-pointer transition-colors">{s}</div>
                ))}
              </div>
            </div>
            {[
              { title: "Product", links: [["Platform", "#features"], ["Services", "#services"], ["Pricing", "#pricing"], ["How it works", "#how-it-works"]] },
              { title: "Account", links: [["Sign In", "/login"], ["Register", "/register"]] },
              { title: "Support", links: [
                ["FAQ", "#faq"],
                ["WhatsApp", "https://wa.me/916370892501"],
                ["Email", "mailto:bilsondigal058@gmail.com"],
                ["Call", "tel:+916370892501"],
                ["Website", "https://my-portfolio-n3b5.vercel.app/"],
              ] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-semibold text-sm mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <a
                        href={href}
                        target={href.startsWith("http") ? "_blank" : undefined}
                        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="text-white/40 text-sm hover:text-white/70 transition-colors"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-4 text-white/30 text-xs">
            <p>© 2026 LD Service Zone. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#faq" className="hover:text-white/60">Privacy Policy</a>
              <a href="#faq" className="hover:text-white/60">Terms of Service</a>
              <a href="#faq" className="hover:text-white/60">Refund Policy</a>
            </div>
          </div>
        </div>
      </footer>
      <SupportWidget />
    </div>
  );
}
