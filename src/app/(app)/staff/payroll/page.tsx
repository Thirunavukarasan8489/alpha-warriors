"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Banknote,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Edit2,
  Share2,
  MessageCircle,
  ShieldCheck,
  AlertCircle,
  Loader2,
  DollarSign,
  UserCheck,
  FileText,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { formatPaise, rupeesToPaise } from "@/lib/money";
import { buildShareLink } from "@/lib/whatsapp";

interface PayrollItem {
  id: string;
  staff: {
    id: string;
    name: string;
    phone: string;
    role: string;
  };
  month: string;
  baseSalary: number; // paise
  commission: number; // paise
  deductions: number; // paise
  leaveDays: number;
  netPay: number; // paise
  status: "draft" | "paid";
  paidAt?: string;
  notes?: string;
}

export default function StaffPayrollPage() {
  const { showToast } = useToast();

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<PayrollItem | null>(null);
  const [editDeductions, setEditDeductions] = useState("");
  const [editLeaveDays, setEditLeaveDays] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Paying State
  const [payingId, setPayingId] = useState<string | null>(null);

  const loadPayroll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll?month=${selectedMonth}`);
      const data = await res.json();
      if (res.ok) {
        setPayrollItems(data.data.runs);
        setSummary(data.data.summary);
      } else {
        showToast(data.error?.message || "Failed to load payroll", "error");
      }
    } catch {
      showToast("Network error loading payroll", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayroll();
  }, [selectedMonth]);

  const handleEditClick = (item: PayrollItem) => {
    setEditingItem(item);
    setEditDeductions((item.deductions / 100).toString());
    setEditLeaveDays(item.leaveDays.toString());
    setEditNotes(item.notes || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSavingEdit(true);
    try {
      const dedNum = parseFloat(editDeductions) || 0;
      const leaveNum = parseInt(editLeaveDays, 10) || 0;

      const res = await fetch(`/api/payroll/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deductionsRupees: dedNum,
          leaveDays: leaveNum,
          notes: editNotes.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Payroll draft updated!", "success");
        setEditingItem(null);
        loadPayroll();
      } else {
        showToast(data.error?.message || "Failed to update draft", "error");
      }
    } catch {
      showToast("Network error updating draft", "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleMarkPaid = async (item: PayrollItem) => {
    if (!confirm(`Confirm payout of ${formatPaise(item.netPay)} to ${item.staff.name}? This will record a salary expense.`)) {
      return;
    }

    setPayingId(item.id);
    try {
      const res = await fetch(`/api/payroll/${item.id}/pay`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Salary disbursed to ${item.staff.name} and logged in Expenses!`, "success");
        loadPayroll();
      } else {
        showToast(data.error?.message || "Failed to process payment", "error");
      }
    } catch {
      showToast("Network error processing payment", "error");
    } finally {
      setPayingId(null);
    }
  };

  const handleSharePayslipWhatsApp = (item: PayrollItem) => {
    const text = `*ALPHA WARRIORS FITNESS*\n📄 *Staff Payslip - ${item.month}*\nName: ${item.staff.name}\nRole: ${item.staff.role.toUpperCase()}\n\n*Earnings:*\n• Base Salary: ${formatPaise(item.baseSalary)}\n• Sales Commission: ${formatPaise(item.commission)}\n\n*Deductions:*\n• Deductions / Leave (${item.leaveDays} days): -${formatPaise(item.deductions)}\n\n*Net Disbursed Pay:* ${formatPaise(item.netPay)}\nStatus: ${item.status.toUpperCase()}\n\nThank you for your dedicated service! Alpha Warriors 🐺💪`;
    const link = buildShareLink(item.staff.phone, text);
    window.open(link, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/staff"
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition shadow-2xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Banknote className="w-6 h-6 text-red-600" />
              Staff Payroll & Salary
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Calculate base salaries, sales commissions, leave deductions & disburse pay
            </p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
          <Calendar className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-xs font-bold text-gray-700">Month:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-bold text-gray-900 bg-transparent focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Summary Stat Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              Total Staff
            </p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
              {summary.totalStaff}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              Base Salaries
            </p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
              {formatPaise(summary.totalBase)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              Commissions
            </p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              {formatPaise(summary.totalCommission)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 text-white border border-slate-900 shadow-xs">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              Total Net Payout
            </p>
            <p className="text-xl sm:text-2xl font-black text-red-500 mt-1">
              {formatPaise(summary.totalNetPay)}
            </p>
          </div>
        </div>
      )}

      {/* Main Payroll Table */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
          <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-500">Calculating monthly payroll...</p>
        </div>
      ) : payrollItems.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
          <Banknote className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <h3 className="font-bold text-gray-900 text-base">No Staff Found</h3>
          <p className="text-xs text-gray-500 mt-1">
            Ensure you have added staff members under the Staff tab.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-slate-950 text-white uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="px-4 py-3">Staff Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right">Base Salary</th>
                  <th className="px-4 py-3 text-right">Commission</th>
                  <th className="px-4 py-3 text-right">Deductions</th>
                  <th className="px-4 py-3 text-center">Leave Days</th>
                  <th className="px-4 py-3 text-right">Net Pay</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrollItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <p className="font-black text-gray-900">{item.staff.name}</p>
                      <p className="text-[11px] text-gray-400">{item.staff.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize font-bold text-gray-600">{item.staff.role}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatPaise(item.baseSalary)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                      +{formatPaise(item.commission)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-600">
                      -{formatPaise(item.deductions)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-700">
                      {item.leaveDays}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-sm text-gray-900">
                      {formatPaise(item.netPay)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          item.status === "paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {item.status === "paid" ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" /> Draft
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      <button
                        onClick={() => handleSharePayslipWhatsApp(item)}
                        className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                        title="Share Payslip via WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>

                      {item.status === "draft" && (
                        <>
                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                            title="Edit Deductions & Leave"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMarkPaid(item)}
                            disabled={payingId === item.id}
                            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-2xs transition disabled:opacity-50"
                          >
                            {payingId === item.id ? "Paying..." : "Pay"}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Deductions Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden text-xs">
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Banknote className="w-4 h-4 text-red-500" />
                Adjust Deductions: {editingItem.staff.name}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                <p className="text-gray-500">Base Salary: <strong className="text-gray-900">{formatPaise(editingItem.baseSalary)}</strong></p>
                <p className="text-gray-500">Sales Commission: <strong className="text-emerald-600">+{formatPaise(editingItem.commission)}</strong></p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Deductions (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editDeductions}
                  onChange={(e) => setEditDeductions(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Leave Days
                </label>
                <input
                  type="number"
                  min="0"
                  value={editLeaveDays}
                  onChange={(e) => setEditLeaveDays(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Notes / Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2 days unpaid leave, advance settlement"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl border text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50"
                >
                  {isSavingEdit ? "Saving..." : "Update Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
