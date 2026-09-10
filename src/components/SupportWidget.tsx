import { useState } from "react";
import { Mail, MessageCircle, Phone, Globe, X, Headphones, ExternalLink } from "lucide-react";

const SUPPORT = {
  whatsapp: "https://wa.me/916370892501",
  email: "mailto:bilsondigal058@gmail.com",
  call: "tel:+916370892501",
  website: "https://my-portfolio-n3b5.vercel.app/",
};

export default function SupportWidget() {
  const [open, setOpen] = useState(false);

  const links = [
    {
      label: "WhatsApp Support",
      description: "Chat with our support team",
      href: SUPPORT.whatsapp,
      icon: MessageCircle,
      external: true,
      iconClass: "text-emerald-300 bg-emerald-500/15 border-emerald-400/20",
    },
    {
      label: "Email Support",
      description: "bilsondigal058@gmail.com",
      href: SUPPORT.email,
      icon: Mail,
      iconClass: "text-blue-300 bg-blue-500/15 border-blue-400/20",
    },
    {
      label: "Call Support",
      description: "+91 63708 92501",
      href: SUPPORT.call,
      icon: Phone,
      iconClass: "text-amber-300 bg-amber-500/15 border-amber-400/20",
    },
    {
      label: "Website",
      description: "Visit our support website",
      href: SUPPORT.website,
      icon: Globe,
      external: true,
      iconClass: "text-violet-300 bg-violet-500/15 border-violet-400/20",
    },
  ];

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
      {open && (
        <div
          role="dialog"
          aria-label="LD Service Zone support"
          className="w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-white/15 bg-[#07111F]/95 shadow-[0_24px_80px_rgba(0,0,0,.5)] backdrop-blur-2xl"
        >
          <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-blue-600/20 via-indigo-500/10 to-transparent p-5">
            <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-blue-500/15 blur-3xl" />
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-500/15 text-blue-200">
                  <Headphones size={21} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-300">Support Center</p>
                  <h3 className="mt-1 text-lg font-bold text-white">How can we help?</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close support panel"
                className="rounded-xl p-2 text-white/45 transition hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <p className="relative mt-3 text-sm leading-5 text-white/55">
              Connect with LD SERVICE ZONE through your preferred support channel.
            </p>
          </div>

          <div className="space-y-2 p-3">
            {links.map(({ label, description, href, icon: Icon, external, iconClass }) => (
              <a
                key={label}
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="group flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[.035] p-3 transition hover:border-white/15 hover:bg-white/[.08]"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconClass}`}>
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">{label}</span>
                  <span className="mt-0.5 block truncate text-xs text-white/40">{description}</span>
                </span>
                {external && <ExternalLink size={14} className="text-white/25 transition group-hover:text-white/60" />}
              </a>
            ))}
            <a
              href={SUPPORT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition hover:scale-[1.01] hover:from-blue-500 hover:to-indigo-500"
            >
              <MessageCircle size={17} />
              Follow Channel / WhatsApp Chat
            </a>
          </div>

          <div className="border-t border-white/10 px-4 py-3 text-center text-[11px] text-white/30">
            LD SERVICE ZONE · Digital Service Partner Support
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label={open ? "Close support" : "Open support"}
        className="group flex items-center gap-2 rounded-full border border-blue-300/25 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-[0_12px_35px_rgba(29,86,216,.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_45px_rgba(29,86,216,.5)]"
      >
        {open ? <X size={18} /> : <Headphones size={18} />}
        <span>{open ? "Close" : "Support"}</span>
      </button>
    </div>
  );
}
