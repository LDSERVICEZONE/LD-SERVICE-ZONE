import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { CheckCircle2, Settings2, XCircle } from "lucide-react";

export default function AdminSettings() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<any>("/health")
      .then(setHealth)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-[1000px]">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Settings</h1>
        <p className="text-[#94A3B8] text-sm">
          Live integration status and platform configuration.
        </p>
      </div>

      <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
        <h2 className="font-semibold mb-4 text-base">Backend Integrations</h2>
        {loading ? (
          <div className="h-32 animate-pulse bg-[#F8FAFC] rounded-xl" />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(health?.integrations || {}).map(([name, value]) => (
              <div
                key={name}
                className="flex items-center justify-between p-4 rounded-xl border border-[#E2E8F0]"
              >
                <span className="capitalize text-sm font-medium text-slate-700">
                  {name.replace(/([A-Z])/g, " $1")}
                </span>
                {value ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                    <CheckCircle2 size={16} /> Connected
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <XCircle size={16} /> Not configured
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
        <div className="flex items-center gap-2">
          <Settings2 size={18} className="text-blue-600" />
          <h2 className="font-semibold text-base">Security & Environment</h2>
        </div>
        <p className="text-sm text-[#64748B] mt-2">
          Credentials and service-role keys remain server-side in your protected{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-mono">
            .env
          </code>{" "}
          file and are never bundled into the client browser.
        </p>
      </section>
    </div>
  );
}
