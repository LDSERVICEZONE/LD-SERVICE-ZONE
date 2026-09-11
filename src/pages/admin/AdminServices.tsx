import { useEffect, useState } from "react";
import {
  Building2,
  Clock3,
  FileText,
  Pencil,
  Plus,
  Save,
  X,
} from "lucide-react";
import { api } from "../../lib/api";

type Service = {
  id: string;
  name: string;
  category: string;
  customerPrice: number;
  commission: number;
  processingTime: string;
  documents: string[];
  color?: string;
};

const EMPTY = {
  name: "",
  category: "Government",
  customerPrice: 0,
  commission: 0,
  processingTime: "",
  documents: "",
  color: "#4F46E5",
};

const CATEGORIES = [
  "Government",
  "PAN",
  "Tax",
  "Certificate",
  "Recharge",
  "Bills",
  "Other",
];

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    api<any>("/services")
      .then((d) => setServices(d.services || []))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const startAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setError("");
    setOpen(true);
  };

  const startEdit = (s: Service) => {
    setEditing(s.id);
    setForm({
      ...s,
      documents: (s.documents || []).join(", "),
    });
    setError("");
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: String(form.name).trim(),
        category: String(form.category).trim(),
        customerPrice: Number(form.customerPrice),
        commission: Number(form.commission),
        processingTime: String(form.processingTime).trim(),
        documents: String(form.documents)
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        color: form.color,
      };
      const d = editing
        ? await api<any>(`/services/${editing}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await api<any>("/services", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      setServices((xs) =>
        editing
          ? xs.map((x) => (x.id === d.service.id ? d.service : x))
          : [d.service, ...xs]
      );
      setOpen(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1300px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-violet-600 uppercase">
            Catalogue
          </span>
          <h1 className="font-display text-2xl font-extrabold text-[#0F172A]">
            Services
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            Live service catalogue offered to retailers. Changes persist immediately to the backend.
          </p>
        </div>
        <button
          onClick={startAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-md shadow-violet-500/20 transition"
        >
          <Plus size={16} />
          Add Service
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((s) => (
          <article
            key={s.id}
            className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 size={20} />
              </div>
              <button
                onClick={() => startEdit(s)}
                className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition"
                title="Edit Service"
              >
                <Pencil size={15} />
              </button>
            </div>
            <h2 className="font-semibold text-[#0F172A] mt-4 text-base">
              {s.name}
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              {s.category} · <span className="font-mono">{s.id}</span>
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">
                  Customer Price
                </p>
                <b className="font-mono text-base text-slate-900">
                  ₹{s.customerPrice}
                </b>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-[10px] text-emerald-600 font-semibold uppercase">
                  Commission
                </p>
                <b className="font-mono text-base text-emerald-700">
                  ₹{s.commission}
                </b>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-[#64748B]">
              <span className="flex items-center gap-1">
                <Clock3 size={14} />
                {s.processingTime}
              </span>
              <span className="flex items-center gap-1">
                <FileText size={14} />
                {s.documents?.length || 0} docs
              </span>
            </div>
          </article>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5 pb-2 border-b">
              <div>
                <h2 className="font-display text-xl font-bold text-[#0F172A]">
                  {editing ? "Edit Service" : "Add Service"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Retailers will see saved changes immediately in their catalog.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Service name"
                value={form.name}
                onChange={(v: any) => setForm({ ...form, name: v })}
              />
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Category
                </span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white outline-none focus:border-violet-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <Field
                label="Customer price (₹)"
                type="number"
                value={form.customerPrice}
                onChange={(v: any) => setForm({ ...form, customerPrice: v })}
              />
              <Field
                label="Retailer commission (₹)"
                type="number"
                value={form.commission}
                onChange={(v: any) => setForm({ ...form, commission: v })}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Processing time"
                  value={form.processingTime}
                  onChange={(v: any) => setForm({ ...form, processingTime: v })}
                />
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="Required documents (comma separated)"
                  value={form.documents}
                  onChange={(v: any) => setForm({ ...form, documents: v })}
                />
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              disabled={busy}
              onClick={save}
              className="mt-6 w-full inline-flex justify-center items-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-md shadow-violet-500/20 transition disabled:opacity-50"
            >
              <Save size={16} />
              {busy ? "Saving..." : editing ? "Save Changes" : "Create Service"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}
      </span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-violet-500"
      />
    </label>
  );
}
