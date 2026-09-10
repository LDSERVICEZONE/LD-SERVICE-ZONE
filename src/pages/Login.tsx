import { useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole, ShieldCheck, X } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import ldLogo from "@/imports/ChatGPT_Image_Aug_26__2026_at_03_14_08_PM-1.png";
import { api, setSession } from "../lib/api";
import SupportWidget from "../components/SupportWidget";

interface Props { onLogin: (role: "retailer" | "admin") => void; }

export default function Login({ onLogin }: Props) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ credential: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setResetOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function demoSignIn() {
    setLoading(true); setError("");
    try {
      const data = await api<any>("/auth/demo-login", { method: "POST" });
      setSession(data.token, data.user);
      onLogin(data.user.role);
      navigate("/dashboard");
    } catch (e: any) {
      setError(e.message || "Unable to open demo account");
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const data = await api<any>("/auth/login", { method: "POST", body: JSON.stringify(form) });
      setSession(data.token, data.user); onLogin(data.user.role); navigate(data.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (e: any) { setError(e.message || "Unable to sign in"); }
    finally { setLoading(false); }
  }

  return <div className="min-h-screen bg-transparent flex">
    <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20"/><div className="absolute -right-20 top-1/3 w-96 h-96 bg-blue-600/20 blur-3xl rounded-full"/>
      <div className="relative flex items-center gap-3"><img src={ldLogo} className="h-11 w-11 rounded-full"/><div><b className="text-white text-xl">LD SERVICE ZONE</b><p className="text-white/40 text-xs">Partner Portal</p></div></div>
      <div className="relative max-w-xl"><span className="inline-flex px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">SECURE PARTNER ACCESS</span><h2 className="font-display text-5xl font-extrabold text-white mt-5 leading-tight">Run every digital service from <span className="gradient-text">one place.</span></h2><p className="text-white/45 mt-5 leading-7">Applications, payments, commissions, customer records and government services — managed in a single professional workspace.</p><div className="grid grid-cols-2 gap-3 mt-8">{["Service applications", "Secure payments", "Live commissions", "Admin approval workflow"].map(x=><div key={x} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">✓ {x}</div>)}</div></div>
      <p className="relative text-white/25 text-xs">© 2026 LD SERVICE ZONE</p>
    </div>
    <div className="flex-1 flex items-center justify-center p-6"><div className="w-full max-w-md">
      <div className="lg:hidden flex items-center gap-3 mb-7"><img src={ldLogo} className="h-9 w-9 rounded-full"/><b className="text-white">LD SERVICE ZONE</b></div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur p-8 shadow-2xl"><h1 className="text-3xl font-display font-bold text-white">Welcome back 👋</h1><p className="text-white/40 text-sm mt-1 mb-7">Sign in to your retailer or admin account.</p>
        {error && <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 text-red-300 px-4 py-3 text-sm">{error}</div>}
        <form onSubmit={submit} className="space-y-4"><Field label="Email or Mobile Number" placeholder="you@gmail.com or 9876543210" value={form.credential} onChange={v=>setForm({...form,credential:v})}/><div>
          <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">Password</label>
          <div className="relative">
            <LockKeyhole size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
            <input required minLength={8} type={showPassword ? "text" : "password"} placeholder="Minimum 8 characters" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="w-full rounded-xl bg-white/5 border border-white/10 pl-11 pr-11 py-3.5 text-white placeholder-white/20 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"/>
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/35 hover:text-white">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          </div>
        </div>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3.5 text-white font-semibold shadow-lg shadow-blue-900/20 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition">{loading ? "Signing in…" : "Sign In →"}</button>
          <button type="button" onClick={()=>{setResetOpen(true);setResetMessage("");setError("")}} className="w-full text-center text-xs text-blue-300 hover:text-blue-200">Forgot password?</button>
          <a href="https://wa.me/916370892501?text=Hello%20LD%20SERVICE%20ZONE%2C%20I%20need%20help%20with%20login." target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/5 px-4 py-2.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10 transition-colors">
            <span>WhatsApp Login Support</span><span className="text-emerald-200/50">63708 92501</span>
          </a>
        </form>
        <p className="text-center text-white/40 text-sm mt-6">New partner? <Link to="/register" className="text-blue-400 font-semibold">Create an account</Link></p>
        <div className="mt-6 pt-5 border-t border-white/10 text-xs text-white/30 text-center">Use your registered Gmail/email or Indian mobile number with your password. Mobile OTP can be enabled later when an SMS provider is configured.</div>
      </div>
    </div></div>
    {resetOpen && (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setResetOpen(false)}>
        <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#07111F] p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4"><div><h2 className="text-white font-semibold">Reset your password</h2><p className="text-white/40 text-xs mt-1">Account recovery support</p></div><button aria-label="Close password reset dialog" onClick={()=>setResetOpen(false)} className="p-2 text-white/40 hover:text-white"><X size={17}/></button></div>
          <p className="text-white/60 text-sm leading-6">Enter the email used during signup. We will send a real password-reset link to that inbox.</p>
          {resetMessage && <div role="status" className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300 px-3 py-2 text-xs">{resetMessage}</div>}
          <form onSubmit={async e=>{e.preventDefault();setResetLoading(true);setResetMessage("");try{const d=await api<any>("/auth/forgot-password",{method:"POST",body:JSON.stringify({email:resetEmail})});setResetMessage(d.message)}catch(err:any){setResetMessage(err.message||"Unable to send reset email")}finally{setResetLoading(false)}}} className="mt-5 space-y-3">
            <input required type="email" value={resetEmail} onChange={e=>setResetEmail(e.target.value)} placeholder="you@gmail.com" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/20 outline-none focus:border-blue-500/60"/>
            <button disabled={resetLoading} className="w-full rounded-xl bg-[#1D6FE0] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{resetLoading?"Sending…":"Send Reset Link"}</button>
          </form>
        </div>
      </div>
    )}
    <SupportWidget />
  </div>
}
function Field({label,placeholder,type="text",value,onChange}:{label:string;placeholder:string;type?:string;value:string;onChange:(v:string)=>void}){return <div><label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">{label}</label><input required type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/20 outline-none focus:border-blue-500/60"/></div>}
