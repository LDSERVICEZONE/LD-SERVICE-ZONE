import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";
import KycReview from "../../components/KycReview";
import {
  Wallet,
  PlusCircle,
  MinusCircle,
  AlertCircle,
  CheckCircle2,
  X,
  Shield,
  UserPlus,
  Crown,
  Headphones,
  FileCheck2,
} from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Adjustment modal state
  const [adjustUser, setAdjustUser] = useState<any | null>(null);
  const [adjType, setAdjType] = useState<"credit" | "debit">("credit");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("Cash Deposit");
  const [adjNote, setAdjNote] = useState("");
  const [adjBusy, setAdjBusy] = useState(false);
  const [adjError, setAdjError] = useState("");
  const [adjSuccess, setAdjSuccess] = useState("");

  // Staff creation modal state
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffMobile, setStaffMobile] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState<"verification_agent" | "support_staff" | "super_admin">("verification_agent");
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [staffSuccess, setStaffSuccess] = useState("");

  // Role authorization modal state
  const [roleUser, setRoleUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<"retailer" | "admin">("admin");
  const [selectedAdminRole, setSelectedAdminRole] = useState<"super_admin" | "verification_agent" | "support_staff">("verification_agent");
  const [roleBusy, setRoleBusy] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [roleSuccess, setRoleSuccess] = useState("");

  const loadUsers = () => {
    return api<any>("/admin/users")
      .then((d) => setUsers(d.users || []))
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
    api<any>("/auth/me")
      .then((d) => setCurrentUser(d.user))
      .catch(() => {});
  }, []);

  const isSuperAdmin =
    currentUser?.role === "admin" &&
    (currentUser?.adminRole === "super_admin" || !currentUser?.adminRole);

  const openAdjustModal = (user: any) => {
    setAdjustUser(user);
    setAdjType("credit");
    setAdjAmount("");
    setAdjReason("Cash Deposit");
    setAdjNote("");
    setAdjError("");
    setAdjSuccess("");
  };

  const closeAdjustModal = () => {
    if (adjBusy) return;
    setAdjustUser(null);
  };

  async function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustUser) return;
    setAdjError("");
    setAdjSuccess("");
    const amount = Number(adjAmount);
    if (!amount || amount <= 0) {
      setAdjError("Please enter a valid amount greater than 0");
      return;
    }

    setAdjBusy(true);
    try {
      const res = await api<any>("/admin/wallet/adjust", {
        method: "POST",
        body: JSON.stringify({
          userId: adjustUser.id,
          type: adjType,
          amount,
          reason: adjReason,
          note: adjNote,
        }),
      });

      setAdjSuccess(res.message || "Adjustment applied successfully");
      await loadUsers();
      setTimeout(() => {
        setAdjustUser(null);
      }, 1200);
    } catch (err: any) {
      setAdjError(err?.message || "Failed to adjust wallet");
    } finally {
      setAdjBusy(false);
    }
  }

  async function handleStaffSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStaffError("");
    setStaffSuccess("");

    if (staffPassword.length < 8) {
      setStaffError("Password must be at least 8 characters");
      return;
    }

    setStaffBusy(true);
    try {
      const res = await api<any>("/admin/staff", {
        method: "POST",
        body: JSON.stringify({
          name: staffName,
          email: staffEmail,
          mobile: staffMobile,
          password: staffPassword,
          adminRole: staffRole,
        }),
      });

      setStaffSuccess(res.message || "Staff member created successfully");
      await loadUsers();
      setTimeout(() => {
        setShowStaffModal(false);
        setStaffName("");
        setStaffEmail("");
        setStaffMobile("");
        setStaffPassword("");
        setStaffRole("verification_agent");
        setStaffSuccess("");
      }, 1400);
    } catch (err: any) {
      setStaffError(err?.message || "Failed to create staff member");
    } finally {
      setStaffBusy(false);
    }
  }

  const openRoleModal = (user: any) => {
    setRoleUser(user);
    setSelectedRole(user.role === "admin" ? "admin" : "retailer");
    setSelectedAdminRole(user.adminRole || "verification_agent");
    setRoleError("");
    setRoleSuccess("");
  };

  const closeRoleModal = () => {
    if (roleBusy) return;
    setRoleUser(null);
  };

  async function handleRoleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roleUser) return;
    setRoleError("");
    setRoleSuccess("");

    setRoleBusy(true);
    try {
      const res = await api<any>(`/admin/users/${roleUser.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({
          role: selectedRole,
          adminRole: selectedRole === "admin" ? selectedAdminRole : undefined,
        }),
      });

      setRoleSuccess(res.message || "User role updated successfully");
      await loadUsers();
      setTimeout(() => {
        setRoleUser(null);
      }, 1200);
    } catch (err: any) {
      setRoleError(err?.message || "Failed to update role");
    } finally {
      setRoleBusy(false);
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-[1350px]">
      {loadError && <p role="alert" className="text-red-600">{loadError}</p>}
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">Users & Staff</h1>
          <p className="text-[#94A3B8] text-sm">Account overview, sub-admin role authorization, and wallet balances.</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => {
              setStaffError("");
              setStaffSuccess("");
              setShowStaffModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff Member
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-x-auto shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-sm text-[#94A3B8]">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr>
                {[
                  "Name",
                  "Identifier",
                  "Email / Mobile",
                  "Authorized Role",
                  "KYC",
                  "Status",
                  "Wallet Balance",
                  "Joined",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-semibold text-[#64748B]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[#F1F4F9] hover:bg-slate-50/50">
                  <td className="px-5 py-4 font-medium text-slate-900">
                    <div>{u.name}</div>
                    <div className="text-xs text-slate-400 font-normal">{u.businessName || "—"}</div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-600 font-medium">
                    {u.username || u.id}
                  </td>
                  <td className="px-5 py-4 text-slate-600 text-xs">
                    <div>{u.email}</div>
                    <div className="text-slate-400 font-mono">{u.mobile || "—"}</div>
                  </td>
                  <td className="px-5 py-4">
                    {u.role === "admin" ? (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          u.adminRole === "verification_agent"
                            ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                            : u.adminRole === "support_staff"
                              ? "bg-teal-100 text-teal-700 border border-teal-200"
                              : "bg-purple-100 text-purple-700 border border-purple-200"
                        }`}
                      >
                        {u.adminRole === "verification_agent" && <FileCheck2 className="w-3.5 h-3.5" />}
                        {u.adminRole === "support_staff" && <Headphones className="w-3.5 h-3.5" />}
                        {(!u.adminRole || u.adminRole === "super_admin") && <Crown className="w-3.5 h-3.5" />}
                        {u.adminRole === "verification_agent"
                          ? "Verification Agent"
                          : u.adminRole === "support_staff"
                            ? "Support Staff"
                            : "Super Admin"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        Retailer
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 capitalize">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.kycStatus === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {u.kycStatus || "unverified"}
                    </span>
                  </td>
                  <td className="px-5 py-4 capitalize">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                      u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono-data font-semibold text-slate-900">
                    ₹{Number(u.wallet || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      {isSuperAdmin && (
                        <button
                          onClick={() => openAdjustModal(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors"
                          title="Adjust wallet balance"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          Adjust
                        </button>
                      )}
                      {isSuperAdmin && (
                        <button
                          onClick={() => openRoleModal(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
                          title="Authorize or change user role"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          Role
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center text-[#94A3B8]"
                  >
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <KycReview onUpdated={() => void loadUsers()} />

      {/* Adjust Wallet Modal */}
      {adjustUser && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={closeAdjustModal}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900">Adjust Wallet Balance</h3>
                <p className="text-xs text-slate-500">{adjustUser.name} ({adjustUser.email})</p>
              </div>
              <button
                onClick={closeAdjustModal}
                disabled={adjBusy}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Current Balance</p>
                <p className="font-mono-data text-xl font-extrabold text-slate-900 mt-0.5">
                  ₹{Number(adjustUser.wallet || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <span className="px-2 py-1 rounded bg-white border border-slate-200 text-xs font-semibold text-slate-600">
                {adjustUser.role}
              </span>
            </div>

            {adjError && (
              <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adjError}</span>
              </div>
            )}

            {adjSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{adjSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Action
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjType("credit")}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      adjType === "credit"
                        ? "border-emerald-500 bg-emerald-50/70 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-600" />
                    Credit (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType("debit")}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      adjType === "debit"
                        ? "border-red-500 bg-red-50/70 text-red-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <MinusCircle className="w-4 h-4 text-red-600" />
                    Debit (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Reason
                </label>
                <select
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:outline-hidden bg-white"
                >
                  <option value="Cash Deposit">Cash Deposit at Center</option>
                  <option value="Bank NEFT/IMPS Transfer">Bank NEFT / IMPS Transfer</option>
                  <option value="UPI Direct Transfer">UPI Direct Transfer</option>
                  <option value="Commission Correction">Commission / Incentive Correction</option>
                  <option value="Dispute Resolution">Dispute Resolution / Refund</option>
                  <option value="Administrative Adjustment">Other Administrative Adjustment</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Reference Note (Optional)
                </label>
                <input
                  type="text"
                  value={adjNote}
                  onChange={(e) => setAdjNote(e.target.value)}
                  placeholder="e.g. UTR / Receipt / Note"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeAdjustModal}
                  disabled={adjBusy}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjBusy || !adjAmount}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-xs transition-colors disabled:opacity-50 ${
                    adjType === "credit"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {adjBusy ? "Saving..." : `Confirm ${adjType === "credit" ? "Credit" : "Debit"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Member Modal */}
      {showStaffModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !staffBusy && setShowStaffModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900">Add Staff Member</h3>
                <p className="text-xs text-slate-500">Authorize a new sub-admin with dedicated privileges.</p>
              </div>
              <button
                onClick={() => !staffBusy && setShowStaffModal(false)}
                disabled={staffBusy}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {staffError && (
              <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{staffError}</span>
              </div>
            )}

            {staffSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{staffSuccess}</span>
              </div>
            )}

            <form onSubmit={handleStaffSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-violet-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="staff@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-violet-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Mobile (Optional)</label>
                  <input
                    type="tel"
                    value={staffMobile}
                    onChange={(e) => setStaffMobile(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-violet-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-violet-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Authorized Sub-Role</label>
                <div className="space-y-2">
                  {[
                    {
                      id: "verification_agent",
                      title: "Verification Agent",
                      desc: "Can review KYC documents & process customer applications. No financial access.",
                      icon: FileCheck2,
                    },
                    {
                      id: "support_staff",
                      title: "Support Staff",
                      desc: "Can reply to retailer tickets & resolve help requests. No KYC or wallet access.",
                      icon: Headphones,
                    },
                    {
                      id: "super_admin",
                      title: "Super Admin",
                      desc: "Unrestricted platform privileges: wallet adjustments, pricing, & role management.",
                      icon: Crown,
                    },
                  ].map((r) => (
                    <label
                      key={r.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        staffRole === r.id
                          ? "border-violet-500 bg-violet-50/50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="staffRole"
                        checked={staffRole === r.id}
                        onChange={() => setStaffRole(r.id as any)}
                        className="mt-1 text-violet-600 focus:ring-violet-500"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                          <r.icon className="w-3.5 h-3.5 text-violet-600" />
                          {r.title}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => !staffBusy && setShowStaffModal(false)}
                  disabled={staffBusy}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={staffBusy}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 shadow-xs transition-colors disabled:opacity-50"
                >
                  {staffBusy ? "Creating..." : "Create Staff Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Authorize / Modify Role Modal */}
      {roleUser && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={closeRoleModal}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900">Authorize User Role</h3>
                <p className="text-xs text-slate-500">{roleUser.name} ({roleUser.email})</p>
              </div>
              <button
                onClick={closeRoleModal}
                disabled={roleBusy}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {roleError && (
              <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{roleError}</span>
              </div>
            )}

            {roleSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{roleSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Platform Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("retailer")}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      selectedRole === "retailer"
                        ? "border-blue-500 bg-blue-50/70 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    Retailer
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("admin")}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      selectedRole === "admin"
                        ? "border-purple-500 bg-purple-50/70 text-purple-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    Staff / Admin
                  </button>
                </div>
              </div>

              {selectedRole === "admin" && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Administrative Sub-Role
                  </label>
                  <div className="space-y-2">
                    {[
                      {
                        id: "verification_agent",
                        title: "Verification Agent",
                        desc: "KYC verification and application approval permissions.",
                        icon: FileCheck2,
                      },
                      {
                        id: "support_staff",
                        title: "Support Staff",
                        desc: "Help request answering and ticket resolution permissions.",
                        icon: Headphones,
                      },
                      {
                        id: "super_admin",
                        title: "Super Admin",
                        desc: "Full administrative and financial wallet control.",
                        icon: Crown,
                      },
                    ].map((r) => (
                      <label
                        key={r.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedAdminRole === r.id
                            ? "border-purple-500 bg-purple-50/50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="adminRoleSelection"
                          checked={selectedAdminRole === r.id}
                          onChange={() => setSelectedAdminRole(r.id as any)}
                          className="mt-1 text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                            <r.icon className="w-3.5 h-3.5 text-purple-600" />
                            {r.title}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeRoleModal}
                  disabled={roleBusy}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={roleBusy}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition-colors disabled:opacity-50"
                >
                  {roleBusy ? "Updating..." : "Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
