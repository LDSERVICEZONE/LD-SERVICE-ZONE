import { Link, NavLink } from "react-router-dom";
import ldLogo from "@/imports/ChatGPT_Image_Aug_26__2026_at_03_14_08_PM-1.png";

export default function PublicNav() {
  return <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07111F]/95 backdrop-blur-md">
    <nav aria-label="Public navigation" className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
      <Link to="/" className="flex min-w-0 items-center gap-2 text-white">
        <img src={ldLogo} alt="" className="h-9 w-9 shrink-0 rounded-full" />
        <span className="font-display text-xs font-bold sm:text-lg">LD SERVICE ZONE</span>
      </Link>
      <div className="flex shrink-0 items-center gap-3 text-sm text-white/80">
        <NavLink to="/login" className={({ isActive }) => isActive ? "font-semibold text-blue-300" : "hover:text-white"}>Sign In</NavLink>
        <NavLink to="/register" className="rounded-lg bg-[#1D56D8] px-3 py-2 font-semibold text-white">Register</NavLink>
      </div>
    </nav>
  </header>;
}
