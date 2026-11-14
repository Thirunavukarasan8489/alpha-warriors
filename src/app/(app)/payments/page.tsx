"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CreditCard,
  Wallet,
  Download,
  Phone,
  Clock,
  Ban,
  ArrowRight,
  Filter,
  Loader2,
} from "lucide-react";
import { SkeletonList } from "@/components/Skeleton";
import { MoneyText } from "@/components/MoneyText";
import { DateText } from "@/components/DateText";
import { ShareButton } from "@/components/ShareButton";
import { CollectPaymentModal } from "@/components/Navigation/CollectPaymentModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { formatPaise } from "@/lib/money";
import { WhatsAppTemplates } from "@/lib/whatsapp";
import { toInputDateString, addDays } from "@/lib/dates";
import { useToast } from "@/components/Toast";

function PaymentsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "dues" ? "dues" : "transactions";
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"transactions" | "dues">(initialTab);

  // Transactions State
  const [payments, setPayments] = useState<any[]>([]);
  const [totals, setTotals] = useState<{ totalReceived: number; byMode: Record<string, number> }>({
    totalReceived: 0,
    byMode: {},
  });
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "all">("today");
  const [selectedMode, setSelectedMode] = useState<string>("all");
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Dues State
  const [duesData, setDuesData] = useState<{ totalDues: number; count: number; rows: any[] }>({
    totalDues: 0,
    count: 0,
    rows: [],
  });
  const [loadingDues, setLoadingDues] = useState(false);

  // Collect Payment Modal
  const [collectTarget, setCollectTarget] = useState<{
    member: { id: string; name: string; phone: string; memberCode: string };
    invoiceId: string;
  } | null>(null);

  // Void Modal
  const [paymentToVoid, setPaymentToVoid] = useState<any | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  const loadTransactions = async () => {
    setLoadingPayments(true);
    try {
      const todayStr = toInputDateString(new Date());
      let from = "";
      let to = todayStr;

      if (dateFilter === "today") {
        from = todayStr;
      } else if (dateFilter === "week") {
        from = toInputDateString(addDays(new Date(), -7));
      } else if (dateFilter === "month") {
        from = toInputDateString(addDays(new Date(), -30));
      }

      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (selectedMode !== "all") params.set("mode", selectedMode);

      const res = await fetch(`/api/payments?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        setPayments(json.data);
        setTotals(json.totals);
      }
    } catch (err: unknown) {
      toast("Error loading transactions", "error");
    } finally {
      setLoadingPayments(false);
    }
  };

  const loadDues = async () => {
    setLoadingDues(true);
    try {
      const res = await fetch("/api/dues");
      const json = await res.json();
      if (json.data) {
        setDuesData(json.data);
      }
    } catch (err: unknown) {
      toast("Error loading dues", "error");
    } finally {
      setLoadingDues(false);
    }
  };

  useEffect(() => {
    if (activeTab === "transactions") {
      loadTransactions();
    } else {
      loadDues();
    }
  }, [activeTab, dateFilter, selectedMode]);

  const handleVoidPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentToVoid || !voidReason.trim()) return;

    setIsVoiding(true);
    try {
      const res = await fetch(`/api/payments/${paymentToVoid.id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: voidReason }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to void payment");

      toast("Payment voided and invoice balance restored", "info");
      setPaymentToVoid(null);
      setVoidReason("");
      loadTransactions();
    } catch (err: unknown) {
      toast((err as Error).message || "Error voiding payment", "error");
    } finally {
      setIsVoiding(false);
    }
  };

  const handleExportCSV = () => {
    if (payments.length === 0) return;

    const headers = ["Payment #", "Member Name", "Phone", "Amount", "Mode", "Received At", "Status"];
    const rows = payments.map((p) => [
      p.paymentNumber,
      p.member?.name || "Member",
      p.member?.phone || "",
      (p.amount / 100).toString(),
      p.modes.map((m: any) => m.mode).join("+"),
      new Date(p.receivedAt).toLocaleString("en-IN"),
      p.isVoid ? "VOID" : "VALID",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payments_${toInputDateString(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header and Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Payments & Dues</h1>
          <p className="text-xs text-gray-500">Track collections, payment splits and outstanding balances</p>
        </div>

        {activeTab === "transactions" && (
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("transactions")}
          className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition ${
            activeTab === "transactions"
              ? "border-red-600 text-red-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Transactions Log
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("dues")}
          className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition ${
            activeTab === "dues"
              ? "border-red-600 text-red-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Pending Dues ({duesData.count})
        </button>
      </div>

      {/* TRANSACTIONS TAB */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          {/* Totals Bar */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                  Total Collected
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                  <MoneyText paise={totals.totalReceived} />
                </div>
              </div>

              {/* Mode Breakdown Chips */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {Object.entries(totals.byMode || {}).map(([mode, amt]) => {
                  if (amt === 0) return null;
                  return (
                    <span
                      key={mode}
                      className="px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300 font-medium"
                    >
                      <span className="uppercase text-[10px] text-gray-400 mr-1">{mode}:</span>
                      <MoneyText paise={amt} />
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Filter Chips: Today, Week, Month, All + Mode filter */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-1">
              <div className="flex items-center gap-1.5">
                {(["today", "week", "month", "all"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setDateFilter(filter)}
                    className={`px-3 py-1 rounded-lg font-semibold capitalize transition ${
                      dateFilter === filter
                        ? "bg-red-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {filter === "all" ? "All Time" : filter}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-xs">Mode:</span>
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                >
                  <option value="all">All Modes</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">Receipts & Transactions</h3>
              <span className="text-xs text-gray-400 font-medium">{payments.length} transactions</span>
            </div>

            {loadingPayments ? (
              <div className="p-4">
                <SkeletonList count={4} />
              </div>
            ) : payments.length === 0 ? (
              <EmptyState
                icon={<Wallet className="w-6 h-6" />}
                title="No payments recorded"
                description="Use the Collect Payment button to record money received against member invoices."
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition ${
                      p.isVoid ? "bg-rose-50/40" : "hover:bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center shrink-0">
                        ₹
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {p.member ? (
                            <Link
                              href={`/members/${p.member.id}`}
                              className="font-bold text-gray-900 hover:text-red-600 transition truncate"
                            >
                              {p.member.name}
                            </Link>
                          ) : (
                            <span className="text-gray-400">Member</span>
                          )}

                          {p.isVoid && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                              VOID
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                          <span className="font-mono">{p.paymentNumber}</span>
                          <span>•</span>
                          <span>Invoice {p.invoiceNumber}</span>
                          <span>•</span>
                          <DateText date={p.receivedAt} type="datetime" />
                        </div>

                        {p.isVoid && p.voidReason && (
                          <p className="text-[11px] text-rose-600 mt-0.5 italic">
                            Voided reason: {p.voidReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                      <div className="sm:text-right">
                        <span
                          className={`text-sm font-black ${
                            p.isVoid ? "line-through text-gray-400" : "text-emerald-700"
                          }`}
                        >
                          <MoneyText paise={p.amount} />
                        </span>
                        <div className="text-[10px] text-gray-400 font-medium">
                          {p.modes.map((m: any) => `${m.mode.toUpperCase()}: ₹${m.amount / 100}`).join(" + ")}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <ShareButton
                          phone={p.member?.phone || ""}
                          memberId={p.member?.id}
                          variant="iconOnly"
                          type="receipt"
                          message={WhatsAppTemplates.receipt({
                            gym: "Alpha Warriors",
                            name: p.member?.name || "Member",
                            amount: formatPaise(p.amount),
                            modes: p.modes.map((m: any) => m.mode.toUpperCase()).join(" + "),
                            date: new Date(p.receivedAt).toLocaleDateString("en-IN"),
                            invoiceNumber: p.paymentNumber,
                          })}
                        />

                        {!p.isVoid && (
                          <button
                            type="button"
                            onClick={() => setPaymentToVoid(p)}
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition"
                            title="Void Payment"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DUES TAB */}
      {activeTab === "dues" && (
        <div className="space-y-4">
          {/* Total Dues Header Banner */}
          <div className="bg-rose-50 rounded-2xl p-5 border border-rose-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                Total Pending Dues
              </span>
              <div className="text-2xl sm:text-3xl font-black text-rose-700 mt-0.5">
                <MoneyText paise={duesData.totalDues} />
              </div>
            </div>
            <span className="text-xs font-bold text-rose-700 bg-rose-100 px-3 py-1.5 rounded-xl">
              {duesData.count} Members with Dues
            </span>
          </div>

          {/* Dues List */}
          <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">Unpaid Invoices (Oldest First)</h3>
              <span className="text-xs text-gray-400 font-medium">{duesData.rows.length} invoices</span>
            </div>

            {loadingDues ? (
              <div className="p-4">
                <SkeletonList count={4} />
              </div>
            ) : duesData.rows.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="w-6 h-6 text-emerald-500" />}
                title="Zero pending dues!"
                description="All member invoices are fully settled. Excellent collection rate!"
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {duesData.rows.map((row) => (
                  <div
                    key={row.invoiceId}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-gray-50/50 transition"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0">
                        {row.member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/members/${row.member.id}`}
                          className="font-bold text-gray-900 hover:text-red-600 transition truncate block"
                        >
                          {row.member.name}
                        </Link>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                          {row.member.memberCode} • {row.member.phone}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Invoice {row.invoiceNumber} • Issued <DateText date={row.issueDate} />
                          {row.daysOverdue > 0 && (
                            <span className="text-rose-600 font-semibold ml-1">
                              ({row.daysOverdue} days overdue)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                      <div className="sm:text-right">
                        <span className="text-sm font-black text-rose-600">
                          <MoneyText paise={row.balance} />
                        </span>
                        <p className="text-[10px] text-gray-400">Total: {formatPaise(row.totalAmount)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <ShareButton
                          phone={row.member.phone}
                          memberId={row.member.id}
                          type="reminder_dues"
                          label="Remind"
                          message={WhatsAppTemplates.duesReminder({
                            gym: "Alpha Warriors",
                            name: row.member.name,
                            amount: formatPaise(row.balance),
                          })}
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setCollectTarget({
                              member: row.member,
                              invoiceId: row.invoiceId,
                            })
                          }
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                        >
                          Collect
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collect Modal */}
      {collectTarget && (
        <CollectPaymentModal
          isOpen={true}
          onClose={() => setCollectTarget(null)}
          preselectedMember={collectTarget.member}
          preselectedInvoiceId={collectTarget.invoiceId}
          onSuccess={() => {
            setCollectTarget(null);
            loadDues();
          }}
        />
      )}

      {/* Void Payment Modal */}
      {paymentToVoid && (
        <Modal
          isOpen={true}
          onClose={() => setPaymentToVoid(null)}
          title="Void Payment"
          subtitle={`Voiding payment ${paymentToVoid.paymentNumber} will restore the unpaid balance on Invoice ${paymentToVoid.invoiceNumber}.`}
        >
          <form onSubmit={handleVoidPayment} className="space-y-4">
            <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200">
              Payments are immutable and cannot be deleted. Voiding will keep an audit log record of who voided and why.
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Reason for Voiding *
              </label>
              <input
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Duplicate entry, Wrong amount charged"
                required
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPaymentToVoid(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVoiding || !voidReason.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition touch-manipulation cursor-pointer"
              >
                {isVoiding ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Voiding...</span>
                  </>
                ) : (
                  <span>Confirm Void</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<SkeletonList count={4} />}>
      <PaymentsContent />
    </Suspense>
  );
}

