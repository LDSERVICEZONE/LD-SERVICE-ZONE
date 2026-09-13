import { useEffect, useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { BarChart3, ClipboardList, CreditCard, Menu, FileText, LayoutDashboard, LogOut, Settings, Users, Building2, ShieldCheck, Receipt, LifeBuoy } from "lucide-react";
import ldLogo from "@/imports/ChatGPT_Image_Aug_26__2026_at_03_14_08_PM-1.png";
import { api } from "@/shared/api/client";

interface Props { onLogout: () => void; }

const NAV = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { group: "Management" },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Transactions", path: "/admin/transactions", icon: Receipt },
  { label: "Applications", path: "/admin/applications", icon: FileText },
  { label: "Help Requests", path: "/admin/help", icon: LifeBuoy },
  { group: "Operations" },

  { group: "Reports" },
  { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  { label: "Reports", path: "/admin/reports", icon: ClipboardList },
  { group: "System" },
  { label: "Services", path: "/admin/services", icon: Building2 },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

export default function AdminShell({ onLogout }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const [admin, setAdmin] = useState<any>(null);
  useEffect(() => { api<any>("/auth/me").then(d => setAdmin(d.user)).catch(() => {}); }, []);
  return (
    <div className="relative isolate flex h-dvh bg-[#F1F4F9] overflow-hidden">
      <aside id="admin-navigation" className={`fixed md:relative z-30 w-56 h-full flex-shrink-0 bg-[#07111F] flex flex-col transition-transform duration-200 ${open ? "translate-x-0 visible" : "-translate-x-full md:translate-x-0 invisible md:visible"}`}>
        <div className="flex items-center gap-2.5 p-4 h-16 border-b border-white/10">
          <img src={ldLogo} alt="LD Service Zone" className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
          <div>
            <p className="font-display font-bold text-white text-xs leading-tight">LD SERVICE ZONE</p>
            <p className="text-violet-400 text-[10px] font-semibold">Admin Panel</p>
          </div>
        </div>
        <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map((item, i) => {
            if ("group" in item) {
              return <div key={i} className="px-3 pt-4 pb-1 text-[10px] font-semibold text-white/25 uppercase tracking-widest">{item.group}</div>;
            }
            return (
              <NavLink
                key={item.path}
                to={item.path!}
                onClick={() => setOpen(false)}
                end={item.path === "/admin"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive ? "bg-violet-600 text-white font-semibold" : "text-white/50 hover:text-white hover:bg-white/8"
                  }`
                }
              >
                <item.icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 text-white/40 hover:text-white/70 text-xs transition-colors rounded-xl hover:bg-white/5">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {open && <div className="md:hidden fixed inset-0 z-20 bg-black/30" onClick={() => setOpen(false)} />}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="h-16 shrink-0 bg-white border-b border-[#E2E8F0] flex items-center px-4 md:px-5 gap-3">
          <button aria-label="Toggle admin navigation" aria-expanded={open} aria-controls="admin-navigation" onClick={() => setOpen(v => !v)} className="md:hidden shrink-0 w-9 h-9 rounded-xl border border-[#E2E8F0] bg-[#F1F4F9] flex items-center justify-center text-[#475569]"><Menu size={18}/></button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100 border border-violet-200 text-violet-700 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            Admin Mode
          </div>
          <div className="ml-auto min-w-0 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">{(admin?.name || "A")[0]}</div>
            <div className="min-w-0 truncate">
              <p className="text-xs font-semibold text-[#0F172A]">{admin?.name || "Administrator"}</p>
              <p className="text-[10px] text-[#94A3B8]">{admin?.email || ""}</p>
            </div>
          </div>
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
