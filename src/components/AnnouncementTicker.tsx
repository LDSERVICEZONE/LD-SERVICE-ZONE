import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  Radio,
} from "lucide-react";

export type AnnouncementData = {
  text: string;
  tone: "info" | "success" | "warning" | "critical";
  active: boolean;
  speed?: "slow" | "normal" | "fast";
};

export default function AnnouncementTicker() {
  const [data, setData] = useState<AnnouncementData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api<any>("/announcement")
      .then((res) => {
        if (res?.announcement) {
          setData(res.announcement);
        }
      })
      .catch(() => {});
  }, []);

  if (dismissed || !data || !data.active || !data.text) {
    return null;
  }

  const toneConfig = {
    success: {
      barBg: "bg-emerald-950/90 border-emerald-500/30 text-emerald-200",
      badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      icon: CheckCircle2,
      dotColor: "bg-emerald-400 shadow-emerald-400/50",
      label: "LIVE UPDATE",
    },
    warning: {
      barBg: "bg-amber-950/90 border-amber-500/30 text-amber-200",
      badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      icon: AlertTriangle,
      dotColor: "bg-amber-400 shadow-amber-400/50",
      label: "MAINTENANCE / NOTICE",
    },
    critical: {
      barBg: "bg-rose-950/90 border-rose-500/30 text-rose-200",
      badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      icon: AlertTriangle,
      dotColor: "bg-rose-400 shadow-rose-400/50",
      label: "URGENT ALERT",
    },
    info: {
      barBg: "bg-[#0b1b36] border-blue-500/30 text-blue-200",
      badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/40",
      icon: Info,
      dotColor: "bg-blue-400 shadow-blue-400/50",
      label: "ANNOUNCEMENT",
    },
  }[data.tone || "info"];

  const IconComponent = toneConfig.icon;

  return (
    <div
      role="region"
      aria-label="Portal Announcements"
      className={`relative z-20 w-full border-b backdrop-blur-md px-3 py-2 flex items-center gap-3 select-none overflow-hidden transition-all ${toneConfig.barBg}`}
    >
      {/* Static Badge on Left */}
      <div
        className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider ${toneConfig.badgeBg}`}
      >
        <span className={`w-2 h-2 rounded-full animate-pulse shadow-sm ${toneConfig.dotColor}`} />
        <IconComponent className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">{toneConfig.label}</span>
      </div>

      {/* Marquee Scrolling Window */}
      <div className="flex-1 overflow-hidden relative cursor-default">
        <div className="animate-marquee-track whitespace-nowrap text-xs sm:text-sm font-medium">
          <span className="inline-block px-4">
            {data.text}
          </span>
          <span className="inline-block px-4 text-white/30">•</span>
          <span className="inline-block px-4">
            {data.text}
          </span>
          <span className="inline-block px-4 text-white/30">•</span>
          <span className="inline-block px-4">
            {data.text}
          </span>
          <span className="inline-block px-4 text-white/30">•</span>
          <span className="inline-block px-4">
            {data.text}
          </span>
        </div>
      </div>

      {/* Dismiss Button */}
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        title="Dismiss notice for this session"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
