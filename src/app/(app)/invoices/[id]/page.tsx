"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  Share2,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldAlert,
  Building2,
} from "lucide-react";
import { MoneyText } from "@/components/MoneyText";
import { DateText } from "@/components/DateText";
import { CollectPaymentModal } from "@/components/Navigation/CollectPaymentModal";
import { useToast } from "@/components/Toast";
import { formatPaise } from "@/lib/money";

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const { toast } = useToast();

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [sharing, setSharing] = useState(false);

  const loadInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const json = await res.json();
      if (json.data) {
        setInvoice(json.data);
      }
    } catch (err) {
      toast("Failed to load invoice", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = async () => {
    setSharing(true);
    try {
      // 1. Ensure a public share token exists
      let token = invoice.shareToken;
      if (!token) {
        const tokenRes = await fetch(`/api/invoices/${invoiceId}/share-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const tokenJson = await tokenRes.json();
        token = tokenJson.data?.shareToken;
        setInvoice({ ...invoice, shareToken: token });
      }

      const publicUrl = `${window.location.origin}/i/${token}`;
      const message = `Hello ${invoice.member?.name || "Warrior"}, here is your official invoice ${
        invoice.invoiceNumber
      } from ${invoice.gym?.name || "Alpha Warriors"}: ${publicUrl}`;

      const phone = invoice.member?.phone || "";
      const cleanPhone = phone.replace(/\D/g, "");
      const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
      const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;

      window.open(waUrl, "_blank", "noopener,noreferrer");
      toast("WhatsApp opened with invoice link", "success");
    } catch (err) {
      toast("Could not generate share link", "error");
    } finally {
      setSharing(false);
    }
  };

  const handleRevokeShareToken = async () => {
    try {
      await fetch(`/api/invoices/${invoiceId}/share-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revoke: true }),
      });
      setInvoice({ ...invoice, shareToken: null });
      toast("Public share link revoked", "success");
    } catch (err) {
      toast("Failed to revoke share link", "error");
    }
  };

  if (loading) {
    return <div className="h-96 bg-white rounded-2xl animate-pulse" />;
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
        <h2 className="font-bold text-gray-900">Invoice not found</h2>
        <Link href="/invoices" className="text-red-600 font-bold text-xs mt-2 inline-block">
          &larr; Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar (hidden on print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 bg-white border border-gray-200 shadow-2xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>{invoice.invoiceNumber}</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  invoice.status === "paid"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : invoice.status === "partial"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {invoice.status.toUpperCase()}
              </span>
            </h1>
            <p className="text-xs text-gray-500">
              Issued on <DateText date={invoice.issueDate} />
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            disabled={sharing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{sharing ? "Sharing..." : "Share on WhatsApp"}</span>
          </button>

          {invoice.balance > 0 && (
            <button
              type="button"
              onClick={() => setShowCollectModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Collect Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* Share Link Info Banner (hidden on print) */}
      {invoice.shareToken && (
        <div className="print:hidden p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
            <span className="text-slate-300">Public Link Active:</span>
            <span className="font-mono text-emerald-400 truncate">
              /i/{invoice.shareToken}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/i/${invoice.shareToken}`}
              target="_blank"
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Open Public Link"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={handleRevokeShareToken}
              className="px-2.5 py-1 text-[11px] font-bold text-rose-400 hover:bg-rose-950/50 rounded-lg transition"
            >
              Revoke Link
            </button>
          </div>
        </div>
      )}

      {/* The Printable Invoice Document */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-6 sm:p-10 space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Invoice Header: Gym & Organization Details */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
              {invoice.gym?.name || "Alpha Warriors"}
            </h2>
            <div className="text-xs text-gray-600 mt-1 space-y-0.5">
              {invoice.gym?.address && <p>{invoice.gym.address}</p>}
              <p>Phone: {invoice.gym?.phone}</p>
              {invoice.gym?.email && <p>Email: {invoice.gym.email}</p>}
              {invoice.gym?.gstin && (
                <p className="font-semibold text-gray-900">
                  GSTIN: {invoice.gym.gstin} ({invoice.gym?.state || "State"})
                </p>
              )}
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-xs uppercase tracking-widest font-black text-gray-400">
              Tax Invoice
            </span>
            <p className="font-mono font-black text-xl text-gray-900 mt-0.5">
              {invoice.invoiceNumber}
            </p>
            <div className="text-xs text-gray-600 mt-1 space-y-0.5">
              <p>
                <span className="text-gray-400">Date:</span>{" "}
                <DateText date={invoice.issueDate} />
              </p>
              {invoice.dueDate && (
                <p>
                  <span className="text-gray-400">Due:</span>{" "}
                  <DateText date={invoice.dueDate} />
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Billed To: Member Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-gray-100 text-xs">
          <div>
            <span className="font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Billed To:
            </span>
            {invoice.member ? (
              <div className="space-y-0.5">
                <p className="font-extrabold text-sm text-gray-900">
                  {invoice.member.name}
                </p>
                <p className="font-mono text-gray-500">ID: {invoice.member.memberCode}</p>
                <p className="text-gray-600">Phone: {invoice.member.phone}</p>
                {invoice.member.email && (
                  <p className="text-gray-600">Email: {invoice.member.email}</p>
                )}
                {invoice.member.address && (
                  <p className="text-gray-600">{invoice.member.address}</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 italic">No member specified</p>
            )}
          </div>
        </div>

        {/* Itemized Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="py-3 px-3 text-gray-400 font-mono">{i + 1}</td>
                    <td className="py-3 px-3 font-semibold">{item.description}</td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900">
                      <MoneyText paise={item.amount} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-3 px-3 text-gray-400 font-mono">1</td>
                  <td className="py-3 px-3 font-semibold">Gym Membership Subscription</td>
                  <td className="py-3 px-3 text-right font-bold text-gray-900">
                    <MoneyText paise={invoice.totalAmount} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-gray-200 text-xs">
          <div className="text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700">Thank you for training with us!</p>
            <p className="text-[11px]">Computer generated invoice. No signature required.</p>
          </div>

          <div className="w-full sm:w-64 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-bold text-gray-900">
                <MoneyText paise={invoice.totalAmount} />
              </span>
            </div>

            <div className="flex justify-between text-gray-600">
              <span>GST (Inclusive):</span>
              <span className="font-semibold text-gray-700">Included</span>
            </div>

            <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200">
              <span>Total Amount:</span>
              <span>
                <MoneyText paise={invoice.totalAmount} />
              </span>
            </div>

            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Paid to Date:</span>
              <span>
                <MoneyText paise={invoice.paidAmount} />
              </span>
            </div>

            <div
              className={`flex justify-between font-black text-sm pt-2 border-t border-dashed ${
                invoice.balance > 0 ? "text-rose-600" : "text-gray-400"
              }`}
            >
              <span>Balance Due:</span>
              <span>
                <MoneyText paise={invoice.balance} />
              </span>
            </div>
          </div>
        </div>

        {/* Payments Received History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="pt-6 border-t border-gray-200 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500">
              Payments Received ({invoice.payments.length})
            </h3>
            <div className="divide-y divide-gray-100 text-xs bg-gray-50/60 rounded-xl p-3">
              {invoice.payments.map((p: any) => (
                <div key={p.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-gray-900">{p.paymentNumber}</span>
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

      {/* Collect Payment Modal */}
      {showCollectModal && (
        <CollectPaymentModal
          isOpen={true}
          onClose={() => setShowCollectModal(false)}
          preselectedMember={invoice.member}
          preselectedInvoiceId={invoice.id}
          onSuccess={() => {
            setShowCollectModal(false);
            loadInvoice();
          }}
        />
      )}
    </div>
  );
}
