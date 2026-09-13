import { useEffect, useState } from "react";
import { api, downloadAuthenticatedFile } from "@/shared/api/client";

export default function KycReview({ onUpdated }: { onUpdated: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => api<any>("/admin/kyc").then(data => setRows(data.kyc || [])).catch(error => setError(error.message));
  useEffect(() => { void load(); }, []);
  async function review(status: string) {
    setBusy(true); setError("");
    try {
      await api(`/admin/kyc/${selected.id}`, { method: "PATCH", body: JSON.stringify({ status, adminNote: note }) });
      setSelected(null); await load(); onUpdated();
    } catch (error: any) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="font-semibold">KYC review</h2>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {!rows.some(row => row.kyc?.submittedAt) && <p className="text-sm text-slate-500">No KYC submissions yet.</p>}
    <div className="flex flex-wrap gap-2">{rows.filter(row => row.kyc?.submittedAt).map(row => <button key={row.id} onClick={() => { setSelected(row); setNote(row.kyc.adminNote || ""); }} className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm">{row.name} — {row.kycStatus}</button>)}</div>
    {selected && <div className="space-y-3 border-t border-slate-200 pt-4">
      <h3 className="font-semibold">{selected.name}</h3>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">{Object.entries(selected.kyc).filter(([key, value]) => typeof value === "string" && !["adminNote"].includes(key)).map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-slate-500">{key}</dt><dd className="break-words">{String(value)}</dd></div>)}</dl>
      <div className="flex flex-wrap gap-2">{Object.entries(selected.kyc.documents || {}).map(([name, document]: [string, any]) => <button key={name} onClick={() => void downloadAuthenticatedFile(`/admin/kyc/${selected.id}/documents/${encodeURIComponent(name)}`, document.fileName).catch(error => setError(error.message))} className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">Download {name}</button>)}</div>
      <label className="block text-sm">Review note<textarea value={note} onChange={event => setNote(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 p-3" /></label>
      <div className="flex flex-wrap gap-2">{[["verified", "Approve"], ["rejected", "Reject"], ["pending", "Keep pending"]].map(([status, label]) => <button key={status} disabled={busy} onClick={() => void review(status)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">{label}</button>)}<button onClick={() => setSelected(null)} className="px-3 py-2 text-sm">Close review</button></div>
    </div>}
  </section>;
}
