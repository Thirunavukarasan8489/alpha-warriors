"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Users,
  CalendarCheck,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { MoneyText } from "@/components/MoneyText";
import { DateText } from "@/components/DateText";
import { formatPaise } from "@/lib/money";
import { toInputDateString, addDays } from "@/lib/dates";
import { useToast } from "@/components/Toast";
import { SkeletonTable } from "@/components/Skeleton";

interface ReportMeta {
  id: string;
  name: string;
  description: string;
  icon: any;
}

export default function ReportsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const reportsList: ReportMeta[] = [
    {
      id: "daily_collection",
      name: "Daily Collection",
      description: "Collection broken down by date and payment modes (Cash, UPI, Card)",
      icon: CreditCard,
    },
    {
      id: "expiring",
      name: "Expiring & Expired",
      description: "Memberships ending within date range for proactive renewal follow-ups",
      icon: Calendar,
    },
    {
      id: "dues",
      name: "Dues Outstanding",
      description: "Comprehensive list of all members with pending invoice balances",
      icon: TrendingUp,
    },
    {
      id: "new_members",
      name: "New Members Joined",
      description: "New membership acquisitions and member growth trends",
      icon: Users,
    },
    {
      id: "revenue_by_plan",
      name: "Revenue by Plan",
      description: "Performance breakdown of each membership package sold",
      icon: Layers,
    },
    {
      id: "attendance_summary",
      name: "Attendance Summary",
      description: "Daily athlete check-in volume and workout traffic patterns",
      icon: CalendarCheck,
    },
  ];

  const [selectedReport, setSelectedReport] = useState<string>("daily_collection");
  const [fromDate, setFromDate] = useState(toInputDateString(addDays(new Date(), -30)));
  const [toDate, setToDate] = useState(toInputDateString(new Date()));

  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/${selectedReport}?from=${fromDate}&to=${toDate}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load report");
      setReportData(json.data);
    } catch (err: unknown) {
      toast((err as Error).message || "Error loading report", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedReport, fromDate, toDate]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) return;

    const rows = reportData.rows;
    const headers = Object.keys(rows[0]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((row: any) =>
          headers
            .map((h) => {
              const val = row[h];
              if (typeof val === "number" && (h.toLowerCase().includes("amount") || h.toLowerCase().includes("total") || h.toLowerCase().includes("price") || h.toLowerCase().includes("balance"))) {
                return `"${val / 100}"`;
              }
              return `"${val}"`;
            })
            .join(",")
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedReport}_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentReportMeta = reportsList.find((r) => r.id === selectedReport);

  return (
    <div className="space-y-6">
      {/* Page Title */}
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
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Business Reports</h1>
          <p className="text-xs text-gray-500">Financial collections, dues, member retention and workout analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Report Navigation List */}
        <div className="bg-white rounded-2xl p-3 border border-gray-200/80 shadow-xs space-y-1 h-fit">
          <span className="block px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Available Reports
          </span>
          {reportsList.map((r) => {
            const Icon = r.icon;
            const isSelected = selectedReport === r.id;

            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedReport(r.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition ${
                  isSelected
                    ? "bg-red-600 text-white font-bold shadow-xs"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : "text-gray-400"}`} />
                  <span className="text-xs truncate">{r.name}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-white" : "text-gray-300"}`} />
              </button>
            );
          })}
        </div>

        {/* Right Column: Report Display and Controls */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-semibold">From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-semibold">To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Report Content Table */}
          <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">
                  {reportData?.title || currentReportMeta?.name}
                </h3>
                <p className="text-[11px] text-gray-400">{currentReportMeta?.description}</p>
              </div>
            </div>

            {loading ? (
              <div className="p-4">
                <SkeletonTable rows={6} cols={6} />
              </div>
            ) : !reportData || !reportData.rows || reportData.rows.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-400">
                No records found for the selected date range.
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* 1. Daily Collection */}
                {selectedReport === "daily_collection" && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Cash</th>
                        <th className="py-3 px-4">UPI</th>
                        <th className="py-3 px-4">Card</th>
                        <th className="py-3 px-4">Bank Transfer</th>
                        <th className="py-3 px-4">Other</th>
                        <th className="py-3 px-4 text-right">Total Collection</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {reportData.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-bold text-gray-900">{row.date}</td>
                          <td className="py-3 px-4"><MoneyText paise={row.cash} /></td>
                          <td className="py-3 px-4"><MoneyText paise={row.upi} /></td>
                          <td className="py-3 px-4"><MoneyText paise={row.card} /></td>
                          <td className="py-3 px-4"><MoneyText paise={row.bank} /></td>
                          <td className="py-3 px-4"><MoneyText paise={row.other} /></td>
                          <td className="py-3 px-4 text-right font-black text-emerald-700">
                            <MoneyText paise={row.total} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 2. Expiring and Expired */}
                {selectedReport === "expiring" && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold">
                      <tr>
                        <th className="py-3 px-4">Member Name</th>
                        <th className="py-3 px-4">Phone</th>
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Plan</th>
                        <th className="py-3 px-4">End Date</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {reportData.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-bold text-gray-900">{row.memberName}</td>
                          <td className="py-3 px-4">{row.phone}</td>
                          <td className="py-3 px-4 font-mono">{row.memberCode}</td>
                          <td className="py-3 px-4">{row.planName}</td>
                          <td className="py-3 px-4"><DateText date={row.endDate} /></td>
                          <td className="py-3 px-4 text-right uppercase text-[10px] font-bold text-amber-700">
                            {row.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 3. Dues */}
                {selectedReport === "dues" && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold">
                      <tr>
                        <th className="py-3 px-4">Member</th>
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Issue Date</th>
                        <th className="py-3 px-4">Total Amount</th>
                        <th className="py-3 px-4">Amount Paid</th>
                        <th className="py-3 px-4 text-right">Pending Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {reportData.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-bold text-gray-900">{row.memberName}</td>
                          <td className="py-3 px-4 font-mono">{row.invoiceNumber}</td>
                          <td className="py-3 px-4"><DateText date={row.issueDate} /></td>
                          <td className="py-3 px-4"><MoneyText paise={row.totalAmount} /></td>
                          <td className="py-3 px-4"><MoneyText paise={row.paidAmount} /></td>
                          <td className="py-3 px-4 text-right font-black text-rose-600">
                            <MoneyText paise={row.balance} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 4. New Members */}
                {selectedReport === "new_members" && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">New Members Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {reportData.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-bold text-gray-900">{row.date}</td>
                          <td className="py-3 px-4 text-right font-black text-red-600">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 5. Revenue by Plan */}
                {selectedReport === "revenue_by_plan" && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold">
                      <tr>
                        <th className="py-3 px-4">Plan Name</th>
                        <th className="py-3 px-4">Memberships Sold</th>
                        <th className="py-3 px-4 text-right">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {reportData.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-bold text-gray-900">{row.planName}</td>
                          <td className="py-3 px-4">{row.count}</td>
                          <td className="py-3 px-4 text-right font-black text-emerald-700">
                            <MoneyText paise={row.totalRevenue} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 6. Attendance Summary */}
                {selectedReport === "attendance_summary" && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Total Check-ins</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {reportData.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-bold text-gray-900">{row.date}</td>
                          <td className="py-3 px-4 text-right font-black text-blue-600">{row.checkIns}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

