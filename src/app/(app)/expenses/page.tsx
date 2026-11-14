"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingDown,
  Plus,
  Calendar,
  Filter,
  Trash2,
  Edit2,
  DollarSign,
  PieChart,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { SkeletonList, SkeletonTable } from "@/components/Skeleton";
import { MoneyText } from "@/components/MoneyText";
import { DateText } from "@/components/DateText";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { formatPaise } from "@/lib/money";

interface ExpenseItem {
  id: string;
  date: string;
  category: string;
  amount: number;
  note?: string;
  payrollRunId?: string;
  createdByName?: string;
  createdAt: string;
}

const CATEGORIES = [
  "rent",
  "electricity",
  "salary",
  "equipment",
  "maintenance",
  "marketing",
  "other",
];

export default function ExpensesPage() {
  const { toast } = useToast();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [totalPaise, setTotalPaise] = useState(0);
  const [byCategory, setByCategory] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "maintenance",
    amountRupees: "",
    note: "",
  });

  const loadExpenses = async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const params = new URLSearchParams({ month: currentMonth });
      if (selectedCategory !== "all") params.set("category", selectedCategory);

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      const json = await res.json();
      if (json.data) {
        setExpenses(json.data.expenses || []);
        setTotalPaise(json.data.totalPaise || 0);
        setByCategory(json.data.byCategory || {});
      }
    } catch (err) {
      toast("Failed to load expenses", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [currentMonth, selectedCategory]);

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      category: "maintenance",
      amountRupees: "",
      note: "",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: ExpenseItem) => {
    if (item.payrollRunId) {
      toast("Salary expenses from automated payroll cannot be edited manually.", "error");
      return;
    }
    setEditingExpense(item);
    setFormData({
      date: item.date.split("T")[0],
      category: item.category,
      amountRupees: String(item.amount / 100),
      note: item.note || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : "/api/expenses";
      const method = editingExpense ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formData.date,
          category: formData.category,
          amountRupees: formData.amountRupees,
          note: formData.note,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to save expense");
      }

      toast(editingExpense ? "Expense updated!" : "Expense recorded!", "success");
      setShowModal(false);
      loadExpenses();
    } catch (err: any) {
      toast(err.message || "An error occurred", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!expenseToDelete) return;
    try {
      const res = await fetch(`/api/expenses/${expenseToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete expense");

      toast("Expense removed", "success");
      setExpenseToDelete(null);
      loadExpenses();
    } catch (err: any) {
      toast(err.message || "Failed to delete expense", "error");
    }
  };

  if (forbidden) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-gray-900">Access Restricted</h2>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Expenses and profitability accounting are restricted to Gym Owners and Managers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-red-600" />
            Gym Expenses
          </h1>
          <p className="text-xs text-gray-500">
            Record facility overheads, utilities, maintenance, and equipment purchases
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Month Picker & Summary Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider block">
              Monthly Overhead ({currentMonth})
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-0.5">
              <MoneyText paise={totalPaise} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Select Month:</span>
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Category Breakdown Chips */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Category Breakdown
          </p>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                selectedCategory === "all"
                  ? "bg-red-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              All Categories
            </button>
            {CATEGORIES.map((cat) => {
              const amt = byCategory[cat] || 0;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium capitalize transition flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? "bg-red-600 text-white font-bold"
                      : "bg-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  <span>{cat}:</span>
                  <span className="font-bold text-white">{formatPaise(amt)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expenses List */}
      {loading ? (
        <div>
          <div className="md:hidden">
            <SkeletonList count={4} />
          </div>
          <div className="hidden md:block">
            <SkeletonTable rows={4} cols={6} />
          </div>
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={<DollarSign className="w-6 h-6 text-red-600" />}
          title="No expenses recorded for this period"
          description="Log overhead costs, equipment upkeep, or utility bills for accurate profit calculation."
          action={{
            label: "Record First Expense",
            onClick: handleOpenAdd,
          }}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
          {/* Mobile Cards (below 768px) */}
          <div className="divide-y divide-gray-100 md:hidden">
            {expenses.map((exp) => (
              <div key={exp.id} className="p-4 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="capitalize px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                      {exp.category}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      <DateText date={exp.date} />
                    </span>
                  </div>
                  {exp.note && <p className="text-xs text-gray-800 font-medium">{exp.note}</p>}
                  <p className="text-[10px] text-gray-400">Logged by {exp.createdByName}</p>
                </div>

                <div className="text-right space-y-2">
                  <span className="text-base font-black text-gray-900 block">
                    <MoneyText paise={exp.amount} />
                  </span>

                  {!exp.payrollRunId && (
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(exp)}
                        className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpenseToDelete(exp)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (768px and above) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Note / Details</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      <DateText date={exp.date} />
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-800">
                      {exp.note || <span className="text-gray-400 italic">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">{exp.createdByName}</td>
                    <td className="py-3.5 px-4 text-right font-black text-gray-900 text-sm">
                      <MoneyText paise={exp.amount} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!exp.payrollRunId ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(exp)}
                            className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpenseToDelete(exp)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                          Payroll
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Expense Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingExpense ? "Edit Expense" : "Record New Expense"}
        subtitle="Manage operating costs and gym purchases"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 capitalize"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                ₹
              </span>
              <input
                type="number"
                min="1"
                step="any"
                value={formData.amountRupees}
                onChange={(e) => setFormData({ ...formData, amountRupees: e.target.value })}
                placeholder="2500"
                required
                className="w-full pl-7 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Note / Vendor / Purpose
            </label>
            <input
              type="text"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="e.g. Electricity bill for main floor, dumbbell repairs"
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition touch-manipulation cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editingExpense ? "Update Expense" : "Save Expense"}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!expenseToDelete}
        title="Delete Expense"
        message={`Are you sure you want to remove this ${expenseToDelete?.category} expense of ₹${
          expenseToDelete ? expenseToDelete.amount / 100 : 0
        }?`}
        confirmLabel="Confirm Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setExpenseToDelete(null)}
      />
    </div>
  );
}
