import { useState } from "react";
import { api } from "../lib/api";

export default function ApplicationCheckout({ application, onComplete }: { application: any; onComplete: () => void }) {
  const [files, setFiles] = useState<Record<string, File>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    setError(""); setBusy(true);
    try {
      for (const document of application.documents || []) {
        const file = files[document.name];
        if (!file && !document.fileName) throw new Error(`Upload ${document.name} to continue.`);
        if (!file) continue;
        if (file.size > 5 * 1024 * 1024) throw new Error("Each file must be 5 MB or smaller.");
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Unable to read document."));
          reader.readAsDataURL(file);
        });
        await api(`/applications/${application.applicationId}/documents`, { method: "POST", body: JSON.stringify({ documentName: document.name, fileName: file.name, mimeType: file.type, data }) });
      }
      const order = await api<any>("/payments/create-order", { method: "POST", body: JSON.stringify({ applicationId: application.applicationId }) });
      if (order.mode === "free" || order.mode === "demo") { onComplete(); return; }
      if (!window.Razorpay) await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(); script.onerror = () => reject(new Error("Unable to load payment checkout."));
        document.body.appendChild(script);
      });
      await new Promise<void>((resolve, reject) => {
        const checkout = new window.Razorpay({ key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency, name: "LD SERVICE ZONE", description: application.serviceName,
          handler: async (response: any) => {
            try {
              await api("/payments/verify", { method: "POST", body: JSON.stringify({ applicationId: application.applicationId, ...response }) });
              onComplete(); resolve();
            } catch (error) { reject(error); }
          }, modal: { ondismiss: () => reject(new Error("Payment cancelled. Your application is saved; you can retry here.")) },
        });
        checkout.on("payment.failed", () => reject(new Error("Payment failed. You can retry here.")));
        checkout.open();
      });
    } catch (error: any) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
    <h3 className="font-semibold">Complete your application</h3>
    {(application.documents || []).map((document: any) => <label key={document.name} className="block text-sm">
      {document.name}{document.fileName ? ` — ${document.fileName}` : " (required)"}
      <input type="file" disabled={busy} accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={event => { const file = event.target.files?.[0]; if (file) setFiles(previous => ({ ...previous, [document.name]: file })); }} className="mt-1 block w-full text-xs" />
    </label>)}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={busy} onClick={submit} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Processing..." : `Continue${application.customerPrice > 0 ? ` to payment — ₹${application.customerPrice}` : " submission"}`}</button>
  </section>;
}
