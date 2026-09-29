import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, CheckCircle2, KeyRound, ShieldAlert } from "lucide-react";
import { api } from "@/shared/api/client";
import { useAuth } from "@/features/session/AppContext";

export default function ResetPassword() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [accessToken, setAccessToken] = useState("");
  const [tokenHash, setTokenHash] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(window.location.search);

    const errorDesc =
      hashParams.get("error_description") ||
      searchParams.get("error_description") ||
      hashParams.get("error") ||
      searchParams.get("error");
    if (errorDesc) {
      setError(decodeURIComponent(errorDesc).replace(/\+/g, " "));
    }

    const token = hashParams.get("access_token");
    const hash = searchParams.get("token_hash") || hashParams.get("token_hash");
    const qEmail = searchParams.get("email") || hashParams.get("email") || "";

    if (token) setAccessToken(token);
    if (hash) setTokenHash(hash);
    if (qEmail) setEmail(qEmail);

    if (token || hash) {
      setHasToken(true);
    }

    // Clean up url hash without losing page context
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [location]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      return setError("Password must be at least 8 characters");
    }
    if (password !== confirm) {
      return setError("Passwords do not match");
    }

    const payload: any = { password };

    if (accessToken) {
      payload.accessToken = accessToken;
    } else if (tokenHash) {
      payload.tokenHash = tokenHash;
    } else if (email.trim() && otp.trim()) {
      const cleanOtp = otp.trim().replace(/\D/g, "");
      if (cleanOtp.length !== 6) {
        return setError("Enter the 6-digit recovery code sent to your email");
      }
      payload.email = email.trim().toLowerCase();
      payload.otp = cleanOtp;
    } else {
      return setError(
        "Please provide your registered email and 6-digit recovery code from your email.",
      );
    }

    setLoading(true);
    try {
      const d = await api<any>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await logout();
      setMessage(d.message || "Password updated successfully. You can now sign in.");
      setTimeout(() => navigate("/login", { replace: true }), 1800);
    } catch (e: any) {
      setError(e.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-transparent flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center mb-3">
            <KeyRound className="text-blue-300" size={26} />
          </div>
          <h1 className="text-2xl font-bold text-white">Reset your password</h1>
          <p className="text-white/40 text-xs mt-1">
            {hasToken
              ? "Verified recovery session detected. Choose your new password."
              : "Enter your registered email and the 6-digit recovery code sent to your inbox."}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-400/20 bg-red-500/10 text-red-300 px-4 py-3 text-sm flex items-start gap-2.5"
          >
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300 px-4 py-3 text-sm flex items-start gap-2.5"
          >
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <div>{message}</div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {!hasToken && (
            <>
              <div>
                <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">
                  Registered Email Address
                </label>
                <input
                  aria-label="Registered Email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/20 outline-none focus:border-blue-500/60 transition"
                />
              </div>

              <div>
                <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">
                  6-Digit Recovery Code
                </label>
                <input
                  aria-label="Recovery Code"
                  required
                  maxLength={6}
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="• • • • • •"
                  className="w-full text-center text-xl font-mono tracking-[0.4em] rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-white placeholder-white/20 outline-none focus:border-blue-500/60 transition"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                aria-label="New password"
                autoComplete="new-password"
                required
                minLength={8}
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 pr-11 text-white placeholder-white/20 outline-none focus:border-blue-500/60 transition"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                aria-label="Confirm new password"
                autoComplete="new-password"
                required
                minLength={8}
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 pr-11 text-white placeholder-white/20 outline-none focus:border-blue-500/60 transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !!message}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 text-white font-semibold shadow-lg shadow-blue-900/30 hover:brightness-110 disabled:opacity-60 transition cursor-pointer"
          >
            {loading ? "Updating password…" : "Update Password →"}
          </button>
        </form>

        <p className="text-center text-white/40 text-sm mt-6">
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
