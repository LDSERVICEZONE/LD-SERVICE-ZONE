import { useState, useEffect } from "react";
import { CheckCircle2, Eye, EyeOff, MailCheck, ArrowRight, RefreshCw, KeyRound } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import ldLogo from "@/imports/ChatGPT_Image_Aug_26__2026_at_03_14_08_PM-1.png";
import { api } from "@/shared/api/client";

interface Props {
  onLogin?: (token: string, user: any) => void;
}

export default function Register({ onLogin }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    email: "",
    mobile: "",
    password: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otp, setOtp] = useState("");
  const [memberId, setMemberId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check if routed here with an unconfirmed email from login
  useEffect(() => {
    const state = location.state as { email?: string; verifyOnly?: boolean } | null;
    if (state?.email) {
      setForm((f) => ({ ...f, email: state.email || "" }));
      setPending(true);
      setSuccess("Enter the 6-digit verification code sent to your email.");
    }
  }, [location.state]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const email = form.email.trim().toLowerCase();
    const mobile = form.mobile.replace(/\D/g, "");

    if (!form.name.trim() || !form.businessName.trim()) {
      return setError("Enter your full name and business name");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError("Enter a valid email address");
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return setError("Enter a valid 10-digit Indian mobile number");
    }
    if (form.password !== form.confirm) {
      return setError("Passwords do not match");
    }
    if (form.password.length < 8) {
      return setError("Password must be at least 8 characters");
    }

    setLoading(true);
    try {
      const d = await api<any>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          businessName: form.businessName,
          email,
          mobile,
          password: form.password,
        }),
      });
      setForm((v) => ({ ...v, email }));
      if (d.username) setMemberId(d.username);
      setPending(true);
      setCooldown(60);
      setSuccess(
        d.message ||
          "Account created! Check your email for the 6-digit verification code or confirmation link.",
      );
    } catch (e: any) {
      setError(e.message || "Unable to create account");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const cleanOtp = otp.trim().replace(/\D/g, "");
    if (cleanOtp.length !== 6) {
      return setError("Enter the 6-digit verification code received in your email");
    }
    setVerifying(true);
    try {
      const data = await api<any>("/auth/signup/verify-email", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          code: cleanOtp,
        }),
      });

      if (data.token && data.user && onLogin) {
        onLogin(data.token, data.user);
        navigate("/dashboard", { replace: true });
      } else {
        setSuccess(data.message || "Email verified successfully! You can now sign in.");
        setTimeout(() => navigate("/login", { replace: true }), 1500);
      }
    } catch (e: any) {
      setError(e.message || "Invalid or expired verification code");
    } finally {
      setVerifying(false);
    }
  }

  async function resendEmail() {
    if (cooldown > 0) return;
    setError("");
    setSuccess("");
    setResending(true);
    try {
      const d = await api<any>("/auth/signup/resend-email", {
        method: "POST",
        body: JSON.stringify({ email: form.email.trim().toLowerCase() }),
      });
      setCooldown(60);
      setSuccess(d.message || "A new 6-digit verification code was sent to your email.");
    } catch (e: any) {
      setError(e.message || "Unable to resend verification code");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center p-5">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between gap-4 mb-7">
          <div className="flex items-center gap-3">
            <img src={ldLogo} alt="LD Service Zone" className="h-10 w-10 rounded-full" />
            <div>
              <b className="text-white text-lg">LD SERVICE ZONE</b>
              <p className="text-white/35 text-xs">Retailer Partner Registration</p>
            </div>
          </div>
          <Link
            to="/login"
            className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-300 hover:bg-blue-500/20 transition-colors"
          >
            Sign In
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-md">
          {!pending ? (
            <>
              <div className="mb-7">
                <span className="text-blue-300 text-xs font-bold uppercase tracking-widest">
                  Create your partner account
                </span>
                <h1 className="text-3xl text-white font-display font-bold mt-2">
                  Start growing your service business.
                </h1>
                <p className="text-white/40 text-sm mt-1">
                  We send a secure 6-digit OTP code to your Gmail via Supabase SMTP for instant verification.
                </p>
              </div>

              {error && <Notice tone="error">{error}</Notice>}

              <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Full Name"
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                />
                <Field
                  label="Business / Shop Name"
                  placeholder="Enter shop or agency name"
                  value={form.businessName}
                  onChange={(v) => setForm({ ...form, businessName: v })}
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Gmail / Email Address"
                    type="email"
                    value={form.email}
                    onChange={(v) => setForm({ ...form, email: v })}
                    placeholder="you@gmail.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field
                    label="Indian Mobile Number"
                    type="tel"
                    value={form.mobile}
                    onChange={(v) =>
                      setForm({ ...form, mobile: v.replace(/\D/g, "").slice(0, 10) })
                    }
                    placeholder="9876543210"
                  />
                </div>
                <PasswordField
                  label="Password"
                  value={form.password}
                  show={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  onChange={(v) => setForm({ ...form, password: v })}
                />
                <PasswordField
                  label="Confirm Password"
                  value={form.confirm}
                  show={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                  onChange={(v) => setForm({ ...form, confirm: v })}
                />
                <label className="sm:col-span-2 flex items-start gap-2 text-xs text-white/50 cursor-pointer">
                  <input required type="checkbox" className="mt-0.5 accent-blue-600 rounded" />
                  <span>
                    I agree to the partner terms and understand that KYC verification is required before services are enabled.
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="sm:col-span-2 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold disabled:opacity-60 shadow-lg shadow-blue-900/30 hover:brightness-110 transition cursor-pointer"
                >
                  {loading ? "Creating account…" : "Create Partner Account →"}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
                <span>Already registered?</span>
                <button
                  type="button"
                  onClick={() => {
                    setPending(true);
                    setError("");
                    setSuccess("");
                  }}
                  className="text-blue-300 hover:text-blue-200 font-medium"
                >
                  Enter 6-digit email OTP →
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-7">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-violet-600/20 border border-blue-400/20 flex items-center justify-center shadow-inner">
                  <MailCheck className="text-blue-300 h-8 w-8" />
                </div>
                {memberId && (
                  <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">
                    <KeyRound size={13} /> Member ID: {memberId}
                  </div>
                )}
                <h1 className="text-2xl text-white font-bold mt-3">Verify your email</h1>
                <p className="text-white/50 text-sm mt-1.5 max-w-md mx-auto">
                  We sent a 6-digit verification code to{" "}
                  <strong className="text-white font-semibold">{form.email || "your email"}</strong>.
                  Enter the code below to complete activation.
                </p>
              </div>

              {error && <Notice tone="error">{error}</Notice>}
              {success && (
                <Notice tone="success">
                  <CheckCircle2 size={17} className="shrink-0 mt-0.5" />
                  <span>{success}</span>
                </Notice>
              )}

              <form onSubmit={verifyOtp} className="space-y-4 max-w-sm mx-auto">
                {!form.email && (
                  <Field
                    label="Email Address"
                    type="email"
                    placeholder="you@gmail.com"
                    value={form.email}
                    onChange={(v) => setForm({ ...form, email: v })}
                  />
                )}
                <div>
                  <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 text-center">
                    Enter 6-Digit OTP Code
                  </label>
                  <input
                    aria-label="6-Digit Verification Code"
                    autoFocus
                    required
                    maxLength={6}
                    pattern="\d{6}"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="• • • • • •"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full text-center text-2xl font-mono tracking-[0.5em] rounded-2xl bg-white/5 border border-white/15 px-4 py-4 text-white placeholder-white/20 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifying || otp.length !== 6}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold disabled:opacity-50 shadow-lg shadow-blue-900/30 hover:brightness-110 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {verifying ? "Verifying code…" : "Verify OTP & Continue"}
                  <ArrowRight size={16} />
                </button>
              </form>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-white/50">
                <button
                  disabled={resending || cooldown > 0 || !form.email}
                  onClick={resendEmail}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-blue-300 hover:bg-white/5 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={13} className={resending ? "animate-spin" : ""} />
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : resending ? "Sending…" : "Resend code"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPending(false);
                    setError("");
                    setSuccess("");
                  }}
                  className="text-white/40 hover:text-white px-2 py-1"
                >
                  Edit registration info
                </button>
              </div>

              <p className="text-center text-white/30 text-xs mt-6">
                You can also click the confirmation link sent to your inbox.
              </p>
            </>
          )}

          <p className="text-center text-white/40 text-sm mt-6">
            Already registered?{" "}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Notice({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-4 rounded-xl border px-3.5 py-2.5 text-sm flex items-start gap-2.5 ${
        tone === "error"
          ? "border-red-400/20 bg-red-500/10 text-red-300"
          : "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
      }`}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        aria-label={label}
        required
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/20 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 transition"
      />
    </div>
  );
}

function PasswordField({
  label,
  value,
  show,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          aria-label={label}
          required
          minLength={8}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Minimum 8 characters"
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 pr-11 text-white outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 transition"
        />
        <button
          type="button"
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/35 hover:text-white"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
