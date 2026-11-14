"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Printer, ShieldCheck, AlertCircle, Building2 } from "lucide-react";
import { MoneyText } from "@/components/MoneyText";
import { DateText } from "@/components/DateText";

export default function PublicInvoicePage() {
  const params = useParams();
  const token = params.token as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invoices/public/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Invoice link expired or invalid");
        return res.json();
      })
      .then((json) => {
        if (json.data) setInvoice(json.data);
      })
      .catch((err) => {
        setError(err.message || "Could not load invoice");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-gray-900">Invoice Link Expired</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            This invoice link is no longer valid or has been revoked by the gym management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Floating Top Bar (hidden on print) */}
        <div className="print:hidden flex items-center justify-between p-4 bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700 text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">
              Verified Official Receipt • {invoice.gym?.name || "Alpha Warriors"}
            </span>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>

        {/* The Printable Invoice Document */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 print:p-0 print:shadow-none print:rounded-none">
          {/* Gym Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-gray-200">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight uppercase">
                {invoice.gym?.name || "Alpha Warriors"}
              </h1>
              <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                {invoice.gym?.address && <p>{invoice.gym.address}</p>}
                <p>Phone: {invoice.gym?.phone}</p>
                {invoice.gym?.gstin && (
                  <p className="font-semibold text-gray-900">
                    GSTIN: {invoice.gym.gstin} ({invoice.gym?.state || "State"})
                  </p>
                )}
              </div>
            </div>

            <div className="sm:text-right">
              <span className="text-xs uppercase tracking-widest font-black text-gray-400">
                Official Receipt
              </span>
              <p className="font-mono font-black text-xl text-gray-900 mt-0.5">
                {invoice.invoiceNumber}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Issued: <DateText date={invoice.issueDate} />
              </p>
              <span
                className={`mt-2 inline-block px-3 py-0.5 rounded-full text-xs font-bold ${
                  invoice.status === "paid"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : invoice.status === "partial"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {invoice.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Member Details */}
          <div className="pb-6 border-b border-gray-100 text-xs">
            <span className="font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Receipt Issued To:
            </span>
            {invoice.member ? (
              <div className="space-y-0.5">
                <p className="font-extrabold text-sm text-gray-900">{invoice.member.name}</p>
                <p className="font-mono text-gray-500">Member ID: {invoice.member.memberCode}</p>
                <p className="text-gray-600">Phone: {invoice.member.phone}</p>
                {invoice.member.address && (
                  <p className="text-gray-600">{invoice.member.address}</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 italic">Member</p>
            )}
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="py-3 px-3 font-semibold">{item.description}</td>
                      <td className="py-3 px-3 text-right font-bold text-gray-900">
                        <MoneyText paise={item.amount} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 px-3 font-semibold">Gym Membership Subscription</td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900">
                      <MoneyText paise={invoice.totalAmount} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Total Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-gray-200 text-xs">
            <div className="text-gray-400 space-y-1">
              <p className="font-bold text-gray-700">Alpha Warriors Management</p>
              <p className="text-[11px]">Keep this receipt for membership entry and renewals.</p>
            </div>

            <div className="w-full sm:w-64 space-y-2">
              <div className="flex justify-between text-base font-black text-gray-900">
                <span>Total Amount:</span>
                <span>
                  <MoneyText paise={invoice.totalAmount} />
                </span>
              </div>

              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Total Paid:</span>
                <span>
                  <MoneyText paise={invoice.paidAmount} />
                </span>
              </div>

              {invoice.balance > 0 && (
                <div className="flex justify-between font-black text-sm text-rose-600 pt-2 border-t border-dashed border-gray-200">
                  <span>Balance Due:</span>
                  <span>
                    <MoneyText paise={invoice.balance} />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Payments Received History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="pt-6 border-t border-gray-200 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500">
                Payment Transactions
              </h3>
              <div className="divide-y divide-gray-100 text-xs bg-gray-50/70 rounded-xl p-3">
                {invoice.payments.map((p: any, i: number) => (
                  <div key={i} className="py-2 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-gray-900">
                        {p.paymentNumber}
                      </span>
                      <span className="text-gray-400 mx-2">•</span>
                      <span className="capitalize font-semibold text-gray-700">{p.mode}</span>
                      <span className="text-gray-400 mx-2">•</span>
                      <DateText date={p.receivedAt} className="text-gray-500" />
                    </div>
                    <span className="font-black text-emerald-700">
                      <MoneyText paise={p.amount} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
