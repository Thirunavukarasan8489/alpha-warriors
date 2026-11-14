"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  Receipt,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Share2,
} from "lucide-react";
import { MoneyText } from "@/components/MoneyText";
import { DateText } from "@/components/DateText";
import { EmptyState } from "@/components/EmptyState";
import { formatPaise } from "@/lib/money";
import { SkeletonList } from "@/components/Skeleton";

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  member: {
    id: string;
    name: string;
    phone: string;
    memberCode: string;
    photo?: string;
  } | null;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  issueDate: string;
  status: "paid" | "partial" | "unpaid";
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`/api/invoices?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        setInvoices(json.data);
      }
    } catch (err) {
      console.error("Load invoices error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInvoices();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, fromDate, toDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="md:hidden p-2 rounded-xl text-gray-500 hover:text-gray-900 bg-white border border-gray-200 shadow-2xs transition shrink-0 cursor-pointer touch-manipulation"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-6 h-6 text-red-600" />
              Invoices & Receipts
            </h1>
            <p className="text-xs text-gray-500">
              Track customer billings, issue public receipts, and monitor balances
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice #, member name, code or phone..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All" },
              { id: "unpaid", label: "Unpaid" },
              { id: "partial", label: "Partial" },
              { id: "paid", label: "Paid" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                  statusFilter === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap pt-1 border-t border-gray-100">
          <span className="font-semibold text-gray-700">Date Range:</span>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <span>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              className="text-[11px] text-red-600 font-semibold hover:underline ml-auto"
            >
              Clear dates
            </button>
          )}
        </div>
      </div>

      {/* Invoice List */}
      {loading ? (
        <SkeletonList count={4} />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-6 h-6 text-red-600" />}
          title="No invoices found"
          description={
            search || statusFilter !== "all" || fromDate || toDate
              ? "No billing records match the selected filters."
              : "Invoices are created automatically when members enroll or renew subscriptions."
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
          {/* Mobile Cards (below 768px) */}
          <div className="divide-y divide-gray-100 md:hidden">
            {invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="p-4 block hover:bg-gray-50/60 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-gray-900">
                        {inv.invoiceNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === "paid"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : inv.status === "partial"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {inv.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="font-bold text-sm text-gray-900 mt-1">
                      {inv.member?.name || "Unknown Member"}
                    </p>
                    <p className="text-[11px] text-gray-400 font-mono">
                      {inv.member?.memberCode} • <DateText date={inv.issueDate} />
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-gray-900 block">
                      <MoneyText paise={inv.totalAmount} />
                    </span>
                    {inv.balance > 0 ? (
                      <span className="text-[11px] font-bold text-rose-600">
                        Due: {formatPaise(inv.balance)}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-600">
                        Fully Paid
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop Table (768px and above) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4">
                      {inv.member ? (
                        <div>
                          <p className="font-bold text-gray-900">{inv.member.name}</p>
                          <p className="text-[11px] text-gray-400 font-mono">
                            {inv.member.memberCode} • {inv.member.phone}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No Member</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      <DateText date={inv.issueDate} />
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      <MoneyText paise={inv.totalAmount} />
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                      <MoneyText paise={inv.paidAmount} />
                    </td>
                    <td className="py-3 px-4 text-right font-black">
                      {inv.balance > 0 ? (
                        <span className="text-rose-600">
                          <MoneyText paise={inv.balance} />
                        </span>
                      ) : (
                        <span className="text-gray-400">₹0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === "paid"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : inv.status === "partial"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-700 font-bold rounded-xl transition text-[11px]"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
