import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  FileText,
  Headphones,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Smartphone,
  User,
  Users,
  WalletCards,
} from "lucide-react";
import ldLogo from "@/imports/ChatGPT_Image_Aug_26__2026_at_03_14_08_PM-1.png";
import { useAuth, useWallet } from "../../context/AppContext";

interface Props {
  onLogout?: () => void;
}

const NAV = [
  { label: "Overview", path: "/dashboard", icon: LayoutDashboard },
  { group: "Money" },
  { label: "Wallet", path: "/dashboard/wallet", icon: WalletCards },
  { group: "Services" },
  { label: "Recharge", path: "/dashboard/recharge", icon: Smartphone },
  { label: "Govt Services", path: "/dashboard/services", icon: Building2 },
  { label: "My Applications", path: "/dashboard/applications", icon: FileText },
  { group: "Business" },
  { label: "Analytics", path: "/dashboard/analytics", icon: BarChart3 },
  { label: "Customers", path: "/dashboard/customers", icon: Users },
  { group: "Support" },
  { label: "Support", path: "/dashboard/support", icon: Headphones },
  { group: "Account" },
  { label: "Profile & KYC", path: "/dashboard/profile", icon: User },
];

export default function AppShell({ onLogout }: Props) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { wallet } = useWallet();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSearchOpen(false); if (window.innerWidth < 768) setSidebarOpen(false); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    } else {
      await logout();
      navigate("/login");
    }
  };

  return (
    <div className="relative isolate flex h-dvh bg-[#F1F4F9] overflow-hidden">

      {/* Sidebar */}
      <aside
        id="retailer-navigation"
        className={`${
          sidebarOpen
            ? "w-60"
            : "w-16 md:w-16 -translate-x-full md:translate-x-0"
        } ${sidebarOpen ? "visible" : "invisible md:visible"} fixed md:relative z-30 h-full shrink-0 bg-[#07111F] flex flex-col transition-all duration-300`}
      >
        <div className="flex items-center gap-3 p-4 h-16 border-b border-white/10">
          <img
            src={ldLogo}
            alt="LD Service Zone"
            className="h-8 w-8 rounded-full object-cover"
          />
          {sidebarOpen && (
            <div>
              <p className="font-display font-bold text-white text-sm">
                LD SERVICE ZONE
              </p>
              <p className="text-white/30 text-[10px]">Partner Portal</p>
            </div>
          )}
        </div>

        <nav aria-label="Retailer navigation" className="flex-1 overflow-y-auto py-3 px-2">
          {NAV.map((item, i) =>
            "group" in item ? (
              <div
                key={i}
                className={
                  sidebarOpen
                    ? "px-3 pt-4 pb-1 text-[10px] font-semibold text-white/25 uppercase tracking-widest"
                    : "h-4"
                }
              >
                {sidebarOpen && item.group}
              </div>
            ) : (
              <NavLink
                key={item.path + item.label}
                to={item.path!}
                aria-label={item.label}
                title={item.label}
                end={item.path === "/dashboard"}
                onClick={() =>
                  window.innerWidth < 768 && setSidebarOpen(false)
                }
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm ${
                    isActive
                      ? "bg-white/10 text-white font-semibold"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                <item.icon size={18} />
                {sidebarOpen && item.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            onClick={() => navigate("/dashboard/profile")}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 text-left"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
              {(user?.name || "U")[0]}
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-white/30 text-[10px] truncate">
                  {user?.email || ""}
                </p>
              </div>
            )}
          </button>
          <button
            aria-label="Collapse sidebar"
            onClick={() => setSidebarOpen((x) => !x)}
            className="w-full mt-2 flex justify-center text-white/30"
          >
            {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-20 bg-black/30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Container */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="h-16 shrink-0 bg-white border-b border-[#E2E8F0] flex items-center px-3 sm:px-4 gap-2 sm:gap-3">
          <button
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
            aria-controls="retailer-navigation"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center"
          >
            <Menu size={18} />
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search navigation"
            className="flex min-w-0 items-center gap-2 px-3 py-2 rounded-xl bg-[#F1F4F9] border border-[#E2E8F0] text-[#64748B] text-sm flex-1 max-w-sm"
          >
            <Search size={16} />
            <span className="truncate">Search pages...</span>
          </button>

          <div className="ml-auto shrink-0 flex items-center gap-2 sm:gap-3">
            {/* Live Shared Reactive Wallet Balance */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#07111F] text-white text-sm">
              <span className="text-white/50 text-xs">Balance</span>
              <b className="font-mono">
                ₹{Number(wallet?.balance || 0).toLocaleString("en-IN")}
              </b>
              <button
                onClick={() => navigate("/dashboard/wallet")}
                className="bg-[#1D56D8] hover:bg-[#1849C0] px-2 py-0.5 rounded text-xs transition-colors"
              >
                Add
              </button>
            </div>

            <button
              onClick={() => navigate("/dashboard/profile")}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xs font-bold"
            >
              {(user?.name || "U")[0]}
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-red-500 hover:text-red-700 font-semibold"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {searchOpen && (
        <SearchModal
          onClose={() => setSearchOpen(false)}
          navigate={navigate}
        />
      )}
    </div>
  );
}

function SearchModal({
  onClose,
  navigate,
}: {
  onClose: () => void;
  navigate: (path: string) => void;
}) {
  const [q, setQ] = useState("");
  const items = [
    { label: "Dashboard", path: "/dashboard", keywords: "overview home" },
    { label: "Wallet", path: "/dashboard/wallet", keywords: "money balance add" },
    { label: "Recharge", path: "/dashboard/recharge", keywords: "mobile dth" },
    {
      label: "Government Services",
      path: "/dashboard/services",
      keywords: "pan voter dl rc itr gst",
    },
    {
      label: "My Applications",
      path: "/dashboard/applications",
      keywords: "applications requests",
    },
    {
      label: "Analytics",
      path: "/dashboard/analytics",
      keywords: "sales commission reports",
    },
    {
      label: "Customers",
      path: "/dashboard/customers",
      keywords: "clients users",
    },
    { label: "Support", path: "/dashboard/support", keywords: "help" },
    {
      label: "Profile & KYC",
      path: "/dashboard/profile",
      keywords: "account kyc",
    },
  ];
  const results = items
    .filter((x) =>
      (x.label + " " + x.keywords).toLowerCase().includes(q.toLowerCase())
    )
    .slice(0, 8);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 flex items-start justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg p-5 mt-16 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter" && results[0]) {
              navigate(results[0].path);
              onClose();
            }
          }}
          placeholder="Search services, customers, transactions…"
          className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <div className="mt-3 space-y-1">
          {results.map((x) => (
            <button
              key={x.path}
              onClick={() => {
                navigate(x.path);
                onClose();
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#F1F4F9] transition"
            >
              <div className="text-sm font-semibold">{x.label}</div>
              <div className="text-xs text-[#94A3B8]">{x.keywords}</div>
            </button>
          ))}
          {!results.length && (
            <p className="text-sm text-[#94A3B8] p-3">
              No matching navigation found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
