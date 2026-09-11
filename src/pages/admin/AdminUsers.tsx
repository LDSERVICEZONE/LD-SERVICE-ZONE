import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<any>("/admin/users")
      .then((d) => setUsers(d.users || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-5 max-w-[1300px]">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Users</h1>
        <p className="text-[#94A3B8] text-sm">Real registered accounts only.</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-[#94A3B8]">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr>
                {[
                  "Name",
                  "Business",
                  "Email",
                  "Role",
                  "KYC",
                  "Status",
                  "Wallet",
                  "Joined",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs text-[#94A3B8]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[#F1F4F9]">
                  <td className="px-5 py-4 font-medium">{u.name}</td>
                  <td className="px-5 py-4">{u.businessName}</td>
                  <td className="px-5 py-4">{u.email}</td>
                  <td className="px-5 py-4 capitalize">{u.role}</td>
                  <td className="px-5 py-4 capitalize">{u.kycStatus}</td>
                  <td className="px-5 py-4 capitalize">{u.status}</td>
                  <td className="px-5 py-4">
                    ₹{Number(u.wallet || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-4 text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td
                    colSpan={8}
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
    </div>
  );
}
