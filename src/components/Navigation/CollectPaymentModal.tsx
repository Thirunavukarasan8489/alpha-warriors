"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { PaymentSplitRows, SplitModeRow } from "@/components/PaymentSplitRows";
import { SearchBox } from "@/components/SearchBox";
import { ShareButton } from "@/components/ShareButton";
import { MoneyText } from "@/components/MoneyText";
import { formatPaise, rupeesToPaise } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { WhatsAppTemplates } from "@/lib/whatsapp";
import { useToast } from "@/components/Toast";
import { CheckCircle2, Receipt, ArrowRight } from "lucide-react";

interface MemberOption {
  id: string;
  name: string;
  phone: string;
  memberCode: string;
}

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  issueDate: string;
}

interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedMember?: MemberOption;
  preselectedInvoiceId?: string;
  onSuccess?: () => void;
}

export function CollectPaymentModal({
  isOpen,
  onClose,
  preselectedMember,
  preselectedInvoiceId,
  onSuccess,
}: CollectPaymentModalProps) {
  const { toast } = useToast();

  const [member, setMember] = useState<MemberOption | null>(preselectedMember || null);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<MemberOption[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(preselectedInvoiceId || "");

  const [amountPaise, setAmountPaise] = useState<number>(0);
  const [modes, setModes] = useState<SplitModeRow[]>([{ mode: "upi", amount: 0 }]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Success State
  const [receiptData, setReceiptData] = useState<{
    paymentNumber: string;
    amount: number;
    balanceRemaining: number;
    invoiceNumber: string;
    receivedAt: string;
    memberName: string;
    phone: string;
  } | null>(null);

  useEffect(() => {
    if (preselectedMember) {
      setMember(preselectedMember);
    }
  }, [preselectedMember]);

  useEffect(() => {
    if (member) {
      // Load unpaid invoices for this member
      fetch(`/api/invoices?memberId=${member.id}&unpaidOnly=true`)
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            setInvoices(data.data);
            if (data.data.length > 0) {
              const inv = preselectedInvoiceId
                ? data.data.find((i: InvoiceOption) => i.id === preselectedInvoiceId) || data.data[0]
                : data.data[0];
              setSelectedInvoiceId(inv.id);
              setAmountPaise(inv.balance);
              setModes([{ mode: "upi", amount: inv.balance }]);
            } else {
              setSelectedInvoiceId("");
              setAmountPaise(0);
              setModes([{ mode: "upi", amount: 0 }]);
            }
          }
        })
        .catch((err) => console.error("Error loading invoices:", err));
    }
  }, [member, preselectedInvoiceId]);

  // Search members if no member preselected
  useEffect(() => {
    if (!member && memberSearch.trim().length >= 1) {
      fetch(`/api/members?search=${encodeURIComponent(memberSearch)}&limit=5`)
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            setMemberResults(data.data);
          }
        })
        .catch((err) => console.error("Error searching members:", err));
    } else {
      setMemberResults([]);
    }
  }, [memberSearch, member]);

  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = invoices.find((i) => i.id === invId);
    if (inv) {
      setAmountPaise(inv.balance);
      setModes([{ mode: "upi", amount: inv.balance }]);
    }
  };

  const handleAmountChange = (rupeesStr: string) => {
    const paise = rupeesToPaise(rupeesStr);
    const selectedInv = invoices.find((i) => i.id === selectedInvoiceId);
    const maxPaise = selectedInv ? selectedInv.balance : paise;
    const clamped = Math.min(paise, maxPaise);
    setAmountPaise(clamped);
    setModes([{ mode: modes[0]?.mode || "upi", amount: clamped }]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !selectedInvoiceId || amountPaise <= 0) return;

    // Check modes sum equals amount exactly
    const modeSum = modes.reduce((acc, m) => acc + (m.amount || 0), 0);
    if (modeSum !== amountPaise) {
      toast(`Payment modes sum (${formatPaise(modeSum)}) does not match amount (${formatPaise(amountPaise)})`, "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          invoiceId: selectedInvoiceId,
          amount: amountPaise,
          modes,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to record payment");
      }

      toast("Payment recorded successfully!", "success");

      setReceiptData({
        paymentNumber: json.data.paymentNumber,
        amount: json.data.amount,
        balanceRemaining: json.data.balanceRemaining,
        invoiceNumber: json.data.invoiceNumber,
        receivedAt: json.data.receivedAt,
        memberName: member.name,
        phone: member.phone,
      });

      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      toast((err as Error).message || "Error recording payment", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setReceiptData(null);
    if (!preselectedMember) setMember(null);
    onClose();
  };

  const selectedInv = invoices.find((i) => i.id === selectedInvoiceId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title={receiptData ? "Payment Receipt" : "Collect Payment"}
      subtitle={receiptData ? "Money received successfully" : "Record money received against an invoice"}
      maxWidth="md"
    >
      {receiptData ? (
        /* Receipt Step */
        <div className="space-y-5 text-center py-2">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-gray-900">
              {formatPaise(receiptData.amount)}
            </h3>
            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mt-1">
              Payment Completed
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 text-xs space-y-2 text-left border border-gray-200/80">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Member:</span>
              <span className="font-semibold text-gray-900">{receiptData.memberName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Receipt #:</span>
              <span className="font-mono font-semibold text-gray-900">{receiptData.paymentNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Invoice #:</span>
              <span className="font-mono text-gray-700">{receiptData.invoiceNumber}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Remaining Balance:</span>
              <span className="font-bold text-rose-600">
                {formatPaise(receiptData.balanceRemaining)}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <ShareButton
              phone={receiptData.phone}
              label="Share Receipt on WhatsApp"
              variant="primary"
              className="w-full justify-center py-2.5 text-sm"
              message={WhatsAppTemplates.receipt({
                gym: "Alpha Warriors",
                name: receiptData.memberName,
                amount: formatPaise(receiptData.amount),
                modes: modes.map((m) => m.mode.toUpperCase()).join(" + "),
                date: formatDate(receiptData.receivedAt),
                invoiceNumber: receiptData.paymentNumber,
                balance: formatPaise(receiptData.balanceRemaining),
              })}
            />

            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-semibold transition"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        /* Collect Form Step */
        <form onSubmit={handleSave} className="space-y-4">
          {/* Member Selection */}
          {!member ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Select Member
              </label>
              <SearchBox
                value={memberSearch}
                onChange={setMemberSearch}
                placeholder="Search member by name or phone..."
              />
              {memberResults.length > 0 && (
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-44 overflow-y-auto bg-white shadow-xs">
                  {memberResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMember(m)}
                      className="w-full p-2.5 text-left hover:bg-gray-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-gray-900">{m.name}</p>
                        <p className="text-gray-500 font-mono text-[11px]">{m.phone}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between border border-gray-100">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Member</span>
                <h4 className="font-bold text-sm text-gray-900">{member.name}</h4>
                <p className="text-xs text-gray-500">{member.phone}</p>
              </div>
              {!preselectedMember && (
                <button
                  type="button"
                  onClick={() => setMember(null)}
                  className="text-xs text-red-600 hover:underline font-semibold"
                >
                  Change
                </button>
              )}
            </div>
          )}

          {/* Invoice Selection */}
          {member && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Unpaid Invoice
              </label>
              {invoices.length === 0 ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200">
                  This member has no unpaid invoices or dues.
                </div>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <label
                      key={inv.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        selectedInvoiceId === inv.id
                          ? "border-red-600 bg-red-50/50 ring-1 ring-red-600"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="selectedInvoice"
                          value={inv.id}
                          checked={selectedInvoiceId === inv.id}
                          onChange={() => handleInvoiceChange(inv.id)}
                          className="text-red-600 focus:ring-red-600"
                        />
                        <div>
                          <p className="font-bold text-xs text-gray-900">{inv.invoiceNumber}</p>
                          <p className="text-[11px] text-gray-400">{formatDate(inv.issueDate)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-rose-600">
                          Due: {formatPaise(inv.balance)}
                        </span>
                        <p className="text-[10px] text-gray-400">Total: {formatPaise(inv.totalAmount)}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Amount and Mode Splits */}
          {selectedInv && (
            <>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Amount to Collect (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={selectedInv.balance / 100}
                    value={amountPaise ? amountPaise / 100 : ""}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 text-base font-bold bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600"
                    placeholder="Enter amount"
                    required
                  />
                </div>
                <p className="text-[11px] text-gray-400">
                  Maximum payable balance: {formatPaise(selectedInv.balance)}
                </p>
              </div>

              <PaymentSplitRows
                totalTargetAmount={amountPaise}
                rows={modes}
                onChange={setModes}
              />

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Google Pay reference 987654..."
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              {/* Submit */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || amountPaise <= 0}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-bold rounded-xl shadow-sm transition"
                >
                  {isSubmitting ? "Recording..." : `Collect ${formatPaise(amountPaise)}`}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </Modal>
  );
}

