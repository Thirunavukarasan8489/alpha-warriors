"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Users,
  CalendarCheck,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  PlusCircle,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
  Dumbbell,
} from "lucide-react";
import { MoneyText } from "@/components/MoneyText";
import { DateText } from "@/components/DateText";
import { formatPaise } from "@/lib/money";
import { SkeletonStats, SkeletonList } from "@/components/Skeleton";

interface DashboardData {
  gymName: string;
  stats: {
    todayCollection: number;
    newMembersWeek: number;
    newMembersMonth: number;
    checkInsToday: number;
    expiringIn7Days: number;
    duesTotal: number;
  };
  expiringSoonList: Array<{
    membershipId: string;
    memberId: string;
    name: string;
    phone: string;
    memberCode: string;
    photo?: string;
    planName: string;
    endDate: string;
  }>;
  recentPayments: Array<{
    id: string;
    paymentNumber: string;
    amount: number;
    modes: Array<{ mode: string; amount: number }>;
    receivedAt: string;
    member?: {
      id: string;
      name: string;
      phone: string;
      memberCode: string;
      photo?: string;
    };
  }>;
  revenueChart?: Array<{ month: string; amount: number }> | null;
  isFirstRun?: boolean;
  checklist?: {
    hasPlan: boolean;
    hasMember: boolean;
    hasPayment: boolean;
  } | null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to load dashboard");
      }
      setData(json.data);
    } catch (err: unknown) {
      setError((err as Error).message || "Error loading dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonStats count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonList count={2} />
          <SkeletonList count={2} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="font-bold text-gray-900">Failed to load dashboard</h3>
        <p className="text-sm text-gray-500">{error || "Something went wrong"}</p>
        <button
          type="button"
          onClick={loadDashboard}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl"
        >
          Try Again
        </button>
      </div>
    );
  }

  // First Run Checklist State
  if (data.isFirstRun && data.checklist) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-red-600 via-rose-700 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex items-center justify-between gap-6 relative overflow-hidden">
          <div className="z-10 max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-red-300" />
              <span className="text-xs font-black uppercase tracking-widest text-red-200">
                Welcome to {data.gymName}
              </span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight uppercase font-sans">
              Train • Push • Dominate
            </h2>
            <p className="text-xs sm:text-sm text-red-100 mt-2">
              Follow this quick 3-step checklist to start enrolling members, recording check-ins, and collecting dues.
            </p>
          </div>

          <div className="hidden sm:block w-28 h-28 rounded-2xl overflow-hidden ring-4 ring-white/20 shadow-2xl shrink-0 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Alpha Warriors" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-4">
          <h3 className="font-extrabold text-base text-gray-900">Getting Started Checklist</h3>

          <div className="space-y-3">
            {/* Step 1: Add Plan */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    data.checklist.hasPlan ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {data.checklist.hasPlan ? <CheckCircle2 className="w-5 h-5" /> : "1"}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Create Membership Plans</h4>
                  <p className="text-xs text-gray-500">Configure prices for monthly, quarterly, or yearly packages.</p>
                </div>
              </div>
              <Link
                href="/plans"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
              >
                {data.checklist.hasPlan ? "View Plans" : "Add Plan"}
              </Link>
            </div>

            {/* Step 2: Add Member */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    data.checklist.hasMember ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {data.checklist.hasMember ? <CheckCircle2 className="w-5 h-5" /> : "2"}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Add Your First Member</h4>
                  <p className="text-xs text-gray-500">Enroll a member with phone number, photo, and plan.</p>
                </div>
              </div>
              <Link
                href="/members/new"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
              >
                Add Member
              </Link>
            </div>

            {/* Step 3: Collect Payment */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    data.checklist.hasPayment ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {data.checklist.hasPayment ? <CheckCircle2 className="w-5 h-5" /> : "3"}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Record First Payment</h4>
                  <p className="text-xs text-gray-500">Collect dues via Cash or UPI and share WhatsApp receipt.</p>
                </div>
              </div>
              <Link
                href="/payments"
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-xs"
              >
                Payments
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Dashboard
  return (
    <div className="space-y-6">
      {/* Top Header Row with Logo Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-red-600/40 shadow-xs bg-black shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Alpha Warriors" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight uppercase">
              Dashboard Overview
            </h1>
            <p className="text-xs text-red-600 font-extrabold uppercase tracking-wider">
              Alpha Warriors Management System
            </p>
          </div>
        </div>

        <Link
          href="/members/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-red-600/20 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Member</span>
        </Link>
      </div>

      {/* 4 Primary Number Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Collection */}
        <Link
          href="/payments"
          className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-red-200 transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Today&apos;s Collection
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-gray-900 group-hover:text-red-600 transition">
            <MoneyText paise={data.stats.todayCollection} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
            Tap for transactions <ArrowRight className="w-2.5 h-2.5" />
          </p>
        </Link>

        {/* Check-ins Today */}
        <Link
          href="/attendance"
          className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-red-200 transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Check-ins Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-gray-900 group-hover:text-red-600 transition">
            {data.stats.checkInsToday}
          </div>
          <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
            Attendance log <ArrowRight className="w-2.5 h-2.5" />
          </p>
        </Link>

        {/* Expiring Soon */}
        <Link
          href="/members?status=expiring"
          className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-red-200 transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Expiring in 7 Days
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-600">
            {data.stats.expiringIn7Days}
          </div>
          <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
            View expiring list <ArrowRight className="w-2.5 h-2.5" />
          </p>
        </Link>

        {/* Total Dues */}
        <Link
          href="/payments?tab=dues"
          className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-red-200 transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Dues
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-600">
            <MoneyText paise={data.stats.duesTotal} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
            View unpaid dues <ArrowRight className="w-2.5 h-2.5" />
          </p>
        </Link>
      </div>

      {/* Middle Section: Revenue Chart (if permitted) & Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        {data.revenueChart && data.revenueChart.length > 0 && (
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">Revenue (Last 6 Months)</h3>
                <p className="text-[11px] text-gray-400">Monthly collection trend</p>
              </div>
              <Link href="/reports" className="text-xs text-red-600 font-bold hover:underline">
                View Reports
              </Link>
            </div>

            {/* Visual Bar Chart in Crimson Gradient */}
            <div className="h-44 flex items-end justify-between gap-3 pt-4 px-2">
              {(() => {
                const maxAmount = Math.max(...data.revenueChart.map((r) => r.amount), 1);
                return data.revenueChart.map((item, idx) => {
                  const heightPercent = Math.max(8, Math.round((item.amount / maxAmount) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div className="text-[10px] font-bold text-gray-600 mb-1 opacity-0 group-hover:opacity-100 transition">
                        {formatPaise(item.amount)}
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[42px] bg-gradient-to-t from-red-700 to-rose-500 rounded-t-lg group-hover:from-red-800 group-hover:to-rose-600 transition shadow-xs"
                      />
                      <span className="text-[11px] font-semibold text-gray-500 mt-2">
                        {item.month}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Member Growth */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-sm text-gray-900">Athlete Growth</h3>
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                <span className="text-xs text-gray-600 font-medium">Joined this week</span>
                <span className="text-base font-black text-gray-900">
                  {data.stats.newMembersWeek}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                <span className="text-xs text-gray-600 font-medium">Joined this month</span>
                <span className="text-base font-black text-gray-900">
                  {data.stats.newMembersMonth}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/members?sort=join_date"
            className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-red-600 hover:text-red-700"
          >
            <span>See newest athletes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Bottom Lists: Expiring Soon (Top 5) & Recent Collections (Last 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expiring Soon List */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">Expiring Soon</h3>
              <p className="text-[11px] text-gray-400">Athletes needing renewal within 7 days</p>
            </div>
            <Link href="/members?status=expiring" className="text-xs font-bold text-red-600 hover:underline">
              View All
            </Link>
          </div>

          {data.expiringSoonList.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              No memberships expiring in the next 7 days 🎉
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.expiringSoonList.map((m) => (
                <div key={m.membershipId} className="py-2.5 flex items-center justify-between gap-3">
                  <Link href={`/members/${m.memberId}`} className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {m.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.photo} alt={m.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        m.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate hover:text-red-600 transition">
                        {m.name}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {m.planName} • Ends <DateText date={m.endDate} />
                      </p>
                    </div>
                  </Link>

                  <Link
                    href={`/members/${m.memberId}`}
                    className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl border border-red-200 shrink-0 flex items-center gap-1 transition"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Renew
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Collections */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">Recent Collections</h3>
              <p className="text-[11px] text-gray-400">Last 5 payments recorded</p>
            </div>
            <Link href="/payments" className="text-xs font-bold text-red-600 hover:underline">
              View All
            </Link>
          </div>

          {data.recentPayments.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              No payments recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.recentPayments.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                      ₹
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {p.member?.name || "Member"}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock className="w-3 h-3" />
                        <DateText date={p.receivedAt} type="time" />
                        <span>•</span>
                        <span className="uppercase">{p.modes[0]?.mode || "Cash"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-emerald-700">
                      <MoneyText paise={p.amount} />
                    </span>
                    <p className="text-[10px] text-gray-400 font-mono">{p.paymentNumber}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
