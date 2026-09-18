import React, { useState } from "react";
import { Printer, X, CheckCircle2, ShieldCheck, Copy, Check, QrCode } from "lucide-react";

interface CustomerReceiptModalProps {
  application: any;
  retailer?: any;
  onClose: () => void;
}

function numberToWordsIndian(num: number): string {
  if (!num || isNaN(num) || num <= 0) return "Zero Rupees Only";
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty ", "Thirty ", "Forty ", "Fifty ", "Sixty ", "Seventy ", "Eighty ", "Ninety "];

  const inWords = (n: number): string => {
    let str = "";
    if (n > 9999999) {
      str += inWords(Math.floor(n / 10000000)) + "Crore ";
      n %= 10000000;
    }
    if (n > 99999) {
      str += inWords(Math.floor(n / 100000)) + "Lakh ";
      n %= 100000;
    }
    if (n > 999) {
      str += inWords(Math.floor(n / 1000)) + "Thousand ";
      n %= 1000;
    }
    if (n > 99) {
      str += inWords(Math.floor(n / 100)) + "Hundred ";
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  };

  const words = inWords(Math.floor(num)).trim();
  return `${words} Rupees Only`;
}

export default function CustomerReceiptModal({
  application,
  retailer,
  onClose,
}: CustomerReceiptModalProps) {
  const [copied, setCopied] = useState(false);

  if (!application) return null;

  const app = application;
  const applicant = app.applicant || {};
  const customerName =
    applicant.name ||
    applicant.fullName ||
    applicant.applicantName ||
    applicant["Customer Name"] ||
    applicant["Applicant Name"] ||
    app.customer ||
    "Walk-In Customer";

  const customerMobile =
    applicant.mobile ||
    applicant.phone ||
    applicant.contact ||
    applicant["Mobile Number"] ||
    "N/A";

  const shopName =
    retailer?.businessName ||
    (retailer?.name ? `${retailer.name} Digital Center` : "Authorized Customer Service Point");

  const operatorName = retailer?.name || app.retailerName || "Authorized Agent";
  const operatorId = retailer?.vleId || retailer?.username || retailer?.id || app.userId || "VLE-AGENT";
  const contactNo = retailer?.mobile || "Support: +91 6370892501";
  const centerLocation = [retailer?.city, retailer?.state].filter(Boolean).join(", ") || "Odisha, India";

  const appDate = app.createdAt ? new Date(app.createdAt) : new Date();
  const formattedDate = appDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedTime = appDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const amount = Number(app.customerPrice || app.amount || 0);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyDetails = () => {
    const text = `🧾 *LD SERVICE ZONE - CUSTOMER ACKNOWLEDGMENT SLIP*
Application No: ${app.applicationId}
Date: ${formattedDate} ${formattedTime}
Service: ${app.serviceName}
Customer Name: ${customerName}
Mobile: ${customerMobile}
Amount Paid: ₹${amount.toLocaleString("en-IN")}
Payment Status: ${app.paymentId ? "PAID" : "COMPLETED"}
Center: ${shopName} (Agent: ${operatorName})
Helpline: +91 6370892501`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-acknowledgment-slip, #printable-acknowledgment-slip * {
            visibility: visible;
          }
          #printable-acknowledgment-slip {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            margin: 0;
            padding: 24px 32px;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Controls (Hidden in Print) */}
        <div className="no-print flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Printer className="w-4 h-4 text-blue-400" />
            <span>Print Customer Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyDetails}
              type="button"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy Text"}
            </button>
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt (Ctrl+P)
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Container */}
        <div id="printable-acknowledgment-slip" className="p-6 sm:p-8 bg-white text-slate-800 text-xs leading-relaxed space-y-4">
          {/* Official Portal Header */}
          <div className="border-b-2 border-slate-800 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-700 text-white font-extrabold flex items-center justify-center font-display text-sm">
                    LD
                  </div>
                  <div>
                    <h1 className="font-display font-extrabold text-xl tracking-tight text-slate-950">
                      LD SERVICE ZONE
                    </h1>
                    <p className="text-[10px] text-slate-500 tracking-wider font-semibold uppercase">
                      Citizen Digital Services & Multi-Utility CSP Portal
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-800 font-mono text-[10px] font-bold uppercase border border-slate-300">
                  Customer Copy
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Helpline: +91 6370892501</p>
                <p className="text-[10px] text-slate-500">https://ldservicezone.in</p>
              </div>
            </div>

            <div className="mt-3 text-center py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-display font-bold text-xs uppercase tracking-widest text-slate-900">
                APPLICATION ACKNOWLEDGMENT & CASH RECEIPT / ପାଉତି
              </span>
            </div>
          </div>

          {/* Reference & Retailer Shop Info */}
          <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-200">
            {/* Retailer Info */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Authorized Service Center (CSP)
              </span>
              <p className="font-bold text-slate-900 text-sm">{shopName}</p>
              <p className="text-[11px] text-slate-600">
                Agent / VLE: <span className="font-medium text-slate-800">{operatorName}</span>
              </p>
              <p className="text-[11px] text-slate-600 font-mono">
                Agent ID: <span className="font-semibold text-slate-900">{operatorId}</span>
              </p>
              <p className="text-[11px] text-slate-600">
                Location: <span>{centerLocation}</span>
              </p>
              {retailer?.mobile && (
                <p className="text-[11px] text-slate-600">Mobile: +91 {retailer.mobile}</p>
              )}
            </div>

            {/* Receipt & Application Meta */}
            <div className="space-y-1 text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Application Reference
              </span>
              <p className="font-mono font-bold text-blue-700 text-sm tracking-wide">
                {app.applicationId}
              </p>
              <p className="text-[11px] text-slate-600">
                Date: <span className="font-medium text-slate-900">{formattedDate}</span>
              </p>
              <p className="text-[11px] text-slate-600">
                Time: <span className="font-medium text-slate-900">{formattedTime}</span>
              </p>
              <p className="text-[11px] text-slate-600">
                Status:{" "}
                <span className="font-semibold text-emerald-700 uppercase">
                  {app.status ? app.status.replace(/_/g, " ") : "Submitted"}
                </span>
              </p>
              {app.paymentId && (
                <p className="text-[10px] text-slate-500 font-mono">
                  Txn ID: {app.paymentId}
                </p>
              )}
            </div>
          </div>

          {/* Customer / Applicant Details */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 font-bold text-[11px] text-slate-800 border-b border-slate-200 flex items-center justify-between">
              <span>APPLICANT & SERVICE PARTICULARS</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Registration
              </span>
            </div>
            <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Customer / Applicant Name:</span>
                <span className="font-bold text-slate-900 text-xs">{customerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Customer Mobile No:</span>
                <span className="font-semibold font-mono text-slate-800">{customerMobile}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Service Applied For:</span>
                <span className="font-bold text-slate-900">{app.serviceName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Service Category:</span>
                <span className="font-medium text-slate-700">{app.category || "Citizen Service"}</span>
              </div>

              {/* Extra applicant fields if available */}
              {applicant.aadhaar && (
                <div>
                  <span className="text-slate-400 block text-[10px]">Aadhaar (Last 4 Digits):</span>
                  <span className="font-mono text-slate-800">
                    XXXX-XXXX-{String(applicant.aadhaar).slice(-4)}
                  </span>
                </div>
              )}
              {applicant.pan && (
                <div>
                  <span className="text-slate-400 block text-[10px]">PAN / Identifier:</span>
                  <span className="font-mono text-slate-800">{applicant.pan}</span>
                </div>
              )}
            </div>
          </div>

          {/* Fee & Payment Breakdown */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="text-left px-3 py-1.5">Description</th>
                  <th className="text-right px-3 py-1.5">Charges (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-3 py-2 text-slate-800">{app.serviceName} Application Fee</td>
                  <td className="px-3 py-2 text-right font-mono font-medium">
                    ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 text-slate-500">Government / Portal Processing Charges</td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-500">₹0.00</td>
                </tr>
                <tr className="bg-slate-50/80 font-bold border-t border-slate-300">
                  <td className="px-3 py-2 text-slate-900 text-xs">Total Amount Received</td>
                  <td className="px-3 py-2 text-right font-mono text-sm text-blue-700">
                    ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">Amount in Words:</span>
                <span className="font-medium text-slate-800 italic">{numberToWordsIndian(amount)}</span>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  PAID IN FULL
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Security, Disclaimer, and Signature Stamp Box */}
          <div className="pt-2 grid grid-cols-3 gap-4 items-end">
            {/* Disclaimer */}
            <div className="col-span-2 space-y-1 text-[10px] text-slate-500">
              <p className="font-semibold text-slate-700">Important Citizen Instructions:</p>
              <p>
                1. This is a computer-generated official acknowledgment slip issued by an authorized
                LD SERVICE ZONE partner.
              </p>
              <p>
                2. Please preserve this slip and quote Application No. <b>{app.applicationId}</b> for
                all future tracking, verification, or document collection.
              </p>
              <p>
                3. Standard processing timeline depends on the respective government department or
                service provider.
              </p>
            </div>

            {/* Stamp / Signature Box */}
            <div className="col-span-1 text-center">
              <div className="border border-dashed border-slate-300 rounded-xl h-20 flex flex-col justify-end p-1.5 bg-slate-50/50">
                <span className="text-[9px] text-slate-400 font-semibold block uppercase">
                  Authorized Signatory / Seal
                </span>
              </div>
              <p className="text-[10px] font-semibold text-slate-800 mt-1">{shopName}</p>
            </div>
          </div>

          {/* Footer watermark */}
          <div className="pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400">
            LD SERVICE ZONE · Smart Digital Cyber Platform · Odisha, India · For verification visit https://ldservicezone.in
          </div>
        </div>

        {/* Modal Bottom Actions (Hidden in Print) */}
        <div className="no-print p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            ℹ️ Supports standard A4 printing and 80mm POS receipt printers.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Print Receipt (Ctrl+P)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
