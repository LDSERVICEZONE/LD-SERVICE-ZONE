import { useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole, MailCheck, KeyRound, RefreshCw, X, ArrowRight } from "lucide-react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { api } from "@/shared/api/client";
import SupportWidget from "../components/SupportWidget";

interface Props {
  onLogin: (token: string, user: any) => void;
}

export default function Login({ onLogin }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  // Tabs: 'password' | 'otp'
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");

  // Password login form
  const [form, setForm] = useState({ credential: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");

  // OTP Login state
  const [otpCredential, setOtpCredential] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpTargetEmail, setOtpTargetEmail] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Forgot password modal
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [confirmationMessage, setConfirmationMessage] = useState("");

  // Load remembered credentials
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ld_remember_credential");
      if (saved) {
        setForm((f) => ({ ...f, credential: saved }));
        setOtpCredential(saved);
        setRemember(true);
      }
    } catch {
      // ignore storage access errors
    }
  }, []);

  // OTP resend cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setTimeout(() => setOtpCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  // Handle URL tokens from Supabase confirmation / magic link / recovery
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(window.location.search);

    // 1. Check for errors in redirect URL
    const errorDesc =
      hashParams.get("error_description") ||
      searchParams.get("error_description") ||
      hashParams.get("error") ||
      searchParams.get("error");
    if (errorDesc) {
      setError(decodeURIComponent(errorDesc).replace(/\+/g, " "));
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    // 2. Check for password recovery link landing on /login
    const linkType = hashParams.get("type") || searchParams.get("type");
    if (linkType === "recovery") {
      navigate(`/reset-password${window.location.search}${window.location.hash}`, {
        replace: true,
      });
      return;
    }

    // 3. Check for confirmation link / magic link tokens
    const accessToken = hashParams.get("access_token");
    const tokenHash = searchParams.get("token_hash") || hashParams.get("token_hash");
    const code = searchParams.get("code");

    if (!accessToken && !tokenHash && !code) return;

    window.history.replaceState(null, "", window.location.pathname);
    setLoading(true);
    setError("");

    const isMagic = linkType === "magiclink";
    const endpoint = isMagic ? "/auth/magic-link/consume" : "/auth/signup/confirm-link";
    const body: any = {};
    if (accessToken) body.accessToken = accessToken;
    if (tokenHash) {
      body.tokenHash = tokenHash;
      body.type = linkType || (isMagic ? "magiclink" : "signup");
    }
    if (code) body.code = code;

    api<any>(endpoint, { method: "POST", body: JSON.stringify(body) })
      .then((data) => {
        if (data.token && data.user) {
          onLogin(data.token, data.user);
          navigate(data.user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
        } else {
          setConfirmationMessage(data.message || "Email verified! You can now sign in.");
        }
      })
      .catch((e: any) => setError(e.message || "The confirmation link is invalid or expired."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setResetOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setUnconfirmedEmail("");

    try {
      try {
        if (remember) {
          localStorage.setItem("ld_remember_credential", form.credential.trim());
        } else {
          localStorage.removeItem("ld_remember_credential");
        }
      } catch {
        // ignore storage access errors
      }

      const data = await api<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ ...form, remember }),
      });
      onLogin(data.token, data.user);
      const home = data.user.role === "admin" ? "/admin" : "/dashboard";
      const from = location.state?.from;
      navigate(
        typeof from === "string" && (from === home || from.startsWith(home + "/")) ? from : home,
        { replace: true },
      );
    } catch (e: any) {
      setError(e.message || "Unable to sign in");
      if (e.unconfirmed && e.email) {
        setUnconfirmedEmail(e.email);
      }
    } finally {
      setLoading(false);
    }
  }

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCredential.trim()) return;
    setOtpLoading(true);
    setError("");
    setConfirmationMessage("");

    try {
      const res = await api<any>("/auth/magic-link", {
        method: "POST",
        body: JSON.stringify({ credential: otpCredential.trim() }),
      });
      setOtpSent(true);
      setOtpTargetEmail(res.email || otpCredential);
      setOtpCooldown(60);
      setConfirmationMessage(res.message || "A 6-digit OTP code was sent to your email.");
    } catch (err: any) {
      setError(err.message || "Unable to send sign-in OTP");
    } finally {
      setOtpLoading(false);
    }
  }

  async function verifyOtpLogin(e: React.FormEvent) {
    e.preventDefault();
    const cleanOtp = otpCode.trim().replace(/\D/g, "");
    if (cleanOtp.length !== 6) {
      return setError("Enter the 6-digit verification code");
    }
    setOtpLoading(true);
    setError("");

    try {
      const data = await api<any>("/auth/magic-link/consume", {
        method: "POST",
        body: JSON.stringify({
          email: otpTargetEmail.trim().toLowerCase(),
          code: cleanOtp,
        }),
      });
      onLogin(data.token, data.user);
      const home = data.user.role === "admin" ? "/admin" : "/dashboard";
      navigate(home, { replace: true });
    } catch (err: any) {
      setError(err.message || "Invalid or expired sign-in OTP");
    } finally {
      setOtpLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-transparent flex">
      {/* Brand Hero Panel */}
      <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -right-20 top-1/3 w-96 h-96 bg-blue-600/20 blur-3xl rounded-full" />
        <div className="relative max-w-xl">
          <span className="inline-flex px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">
            SECURE PARTNER ACCESS
          </span>
          <h2 className="font-display text-5xl font-extrabold text-white mt-5 leading-tight">
            Run every digital service from <span className="gradient-text">one place.</span>
          </h2>
          <p className="text-white/45 mt-5 leading-7">
            Applications, payments, commissions, customer records and government services — managed
            in a single professional workspace.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-8">
            {[
              "Instant Supabase SMTP OTP",
              "Biometric & OTP PAN Cards",
              "Live Retailer Commissions",
              "Admin Approval Workflow",
            ].map((x) => (
              <div key={x} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">
                ✓ {x}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-white/25 text-xs">© 2026 LD SERVICE ZONE</p>
      </div>

      {/* Main Login Box */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur p-8 shadow-2xl">
            <h1 className="text-3xl font-display font-bold text-white">Welcome back 👋</h1>
            <p className="text-white/40 text-sm mt-1 mb-5">Sign in to your retailer or admin account.</p>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("password");
                  setError("");
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  authMode === "password"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                    : "text-white/50 hover:text-white"
                }`}
              >
                Password Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("otp");
                  setError("");
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  authMode === "otp"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                    : "text-white/50 hover:text-white"
                }`}
              >
                Email OTP Sign In
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 text-red-300 px-4 py-3 text-sm">
                <div>{error}</div>
                {unconfirmedEmail && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate("/register", {
                        state: { email: unconfirmedEmail, verifyOnly: true },
                      })
                    }
                    className="mt-2 text-xs font-semibold text-blue-300 hover:text-blue-200 underline block"
                  >
                    Enter 6-digit email OTP now →
                  </button>
                )}
              </div>
            )}

            {confirmationMessage && (
              <div
                role="status"
                className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300 px-4 py-3 text-sm"
              >
                {confirmationMessage}
              </div>
            )}

            {authMode === "password" ? (
              <form onSubmit={submitPassword} className="space-y-4">
                <Field
                  label="Username / Email / Mobile Number"
                  placeholder="Enter username, email or mobile"
                  value={form.credential}
                  onChange={(v) => setForm({ ...form, credential: v })}
                />
                <div>
                  <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <LockKeyhole
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
                    />
                    <input
                      aria-label="Password"
                      autoComplete="current-password"
                      required
                      minLength={8}
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 8 characters"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full rounded-xl bg-white/5 border border-white/10 pl-11 pr-11 py-3.5 text-white placeholder-white/20 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 transition"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/35 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-white/70 hover:text-white select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded bg-white/5 border border-white/20 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-blue-600"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetOpen(true);
                      setResetMessage("");
                      setError("");
                    }}
                    className="text-blue-300 hover:text-blue-200 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3.5 text-white font-semibold shadow-lg shadow-blue-900/20 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  {loading ? "Signing in…" : "Sign In →"}
                </button>
              </form>
            ) : (
              <div>
                {!otpSent ? (
                  <form onSubmit={requestOtp} className="space-y-4">
                    <Field
                      label="Registered Email or Indian Mobile"
                      placeholder="e.g. you@gmail.com or 9876543210"
                      value={otpCredential}
                      onChange={(v) => setOtpCredential(v)}
                    />
                    <p className="text-white/40 text-xs leading-5">
                      We will send a secure 6-digit OTP code to your registered email via Supabase SMTP.
                    </p>
                    <button
                      type="submit"
                      disabled={otpLoading || !otpCredential.trim()}
                      className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3.5 text-white font-semibold shadow-lg shadow-blue-900/20 hover:brightness-110 disabled:opacity-60 transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      {otpLoading ? "Sending OTP…" : "Send 6-Digit OTP"}
                      <ArrowRight size={16} />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={verifyOtpLogin} className="space-y-4">
                    <div className="text-center mb-3">
                      <div className="mx-auto h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-2">
                        <MailCheck className="text-blue-300" size={24} />
                      </div>
                      <p className="text-white/60 text-xs">
                        Enter code sent to <strong className="text-white">{otpTargetEmail}</strong>
                      </p>
                    </div>

                    <div>
                      <input
                        aria-label="6-Digit Verification Code"
                        autoFocus
                        required
                        maxLength={6}
                        type="text"
                        inputMode="numeric"
                        placeholder="• • • • • •"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full text-center text-2xl font-mono tracking-[0.5em] rounded-xl bg-white/5 border border-white/15 px-4 py-3.5 text-white placeholder-white/20 outline-none focus:border-blue-500 transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={otpLoading || otpCode.length !== 6}
                      className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3.5 text-white font-semibold disabled:opacity-50 transition cursor-pointer"
                    >
                      {otpLoading ? "Signing in…" : "Verify OTP & Sign In"}
                    </button>

                    <div className="flex items-center justify-between text-xs text-white/50 pt-1">
                      <button
                        type="button"
                        disabled={otpCooldown > 0 || otpLoading}
                        onClick={requestOtp}
                        className="text-blue-300 hover:text-blue-200 disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <RefreshCw size={12} className={otpLoading ? "animate-spin" : ""} />
                        {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend code"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode("");
                        }}
                        className="text-white/40 hover:text-white"
                      >
                        Change email/number
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <a
              href="https://wa.me/918280123459?text=Hello%20LD%20SERVICE%20ZONE%2C%20I%20need%20help%20with%20login."
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/5 px-4 py-2.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10 transition-colors"
            >
              <span>WhatsApp Login Support</span>
              <span className="text-emerald-200/50">82801 23459</span>
            </a>

            <p className="text-center text-white/40 text-sm mt-6">
              New partner?{" "}
              <Link to="/register" className="text-blue-400 font-semibold hover:text-blue-300">
                Create an account
              </Link>
            </p>
            <div className="mt-6 pt-5 border-t border-white/10 text-xs text-white/30 text-center">
              Use your Member ID, registered Gmail, or Indian mobile number with your password or OTP.
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {resetOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setResetOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#07111F] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-semibold">Reset your password</h2>
                <p className="text-white/40 text-xs mt-1">Supabase Account Recovery</p>
              </div>
              <button
                aria-label="Close password reset dialog"
                onClick={() => setResetOpen(false)}
                className="p-2 text-white/40 hover:text-white"
              >
                <X size={17} />
              </button>
            </div>
            <p className="text-white/60 text-sm leading-6">
              Enter your registered email or mobile. We will send a 6-digit recovery code and reset link.
            </p>
            {resetMessage && (
              <div
                role="status"
                className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300 px-3 py-2 text-xs"
              >
                <div>{resetMessage}</div>
                <button
                  type="button"
                  onClick={() => {
                    setResetOpen(false);
                    navigate(`/reset-password?email=${encodeURIComponent(resetEmail.trim())}`);
                  }}
                  className="mt-2 text-xs font-semibold text-blue-300 hover:text-blue-200 underline block"
                >
                  Enter 6-digit recovery code now →
                </button>
              </div>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setResetLoading(true);
                setResetMessage("");
                try {
                  const d = await api<any>("/auth/forgot-password", {
                    method: "POST",
                    body: JSON.stringify({ credential: resetEmail.trim() }),
                  });
                  setResetMessage(d.message);
                } catch (err: any) {
                  setResetMessage(err.message || "Unable to send reset email");
                } finally {
                  setResetLoading(false);
                }
              }}
              className="mt-5 space-y-3"
            >
              <input
                aria-label="Recovery email or mobile"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="you@gmail.com or 9876543210"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/20 outline-none focus:border-blue-500/60 transition"
              />
              <button
                disabled={resetLoading}
                className="w-full rounded-xl bg-[#1D6FE0] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 hover:brightness-110 transition cursor-pointer"
              >
                {resetLoading ? "Sending code…" : "Send Reset Code & Link"}
              </button>
            </form>
          </div>
        </div>
      )}
      <SupportWidget />
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
  placeholder: string;
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
