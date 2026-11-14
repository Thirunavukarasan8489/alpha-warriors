"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Shield,
  QrCode,
  CalendarCheck,
  Receipt,
  Dumbbell,
  Apple,
  AlertCircle,
  Clock,
  ExternalLink,
  Loader2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/dates";

export default function MemberPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pass" | "workout" | "diet" | "invoices">("pass");

  useEffect(() => {
    fetch(`/api/portal/${token}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.data) {
          setData(res.data);
        } else {
          setError(res.error?.message || "This member portal link is no longer valid");
        }
      })
      .catch(() => setError("Network error loading portal"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-red-600 mb-3" />
        <p className="text-sm font-bold text-gray-300">Loading Alpha Warriors Pass...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white max-w-sm w-full rounded-2xl p-6 border border-gray-200 text-center shadow-md space-y-3">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-black text-gray-900">Link Not Available</h2>
          <p className="text-xs text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const { gym, member, membership, dues, invoices, attendance, workoutPlan, dietPlan } = data;

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-gray-900 pb-16">
      {/* Brand Top Header */}
      <header className="bg-slate-950 text-white border-b border-slate-900 px-4 py-4 sm:px-6 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-red-600/50 bg-black shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={gym.logo} alt={gym.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-black text-sm uppercase tracking-wider">{gym.name}</h1>
              <p className="text-[10px] text-red-500 font-extrabold uppercase tracking-widest">
                Athlete Self-Service Portal
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-gray-400 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
            {member.memberCode}
          </span>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Welcome Member Card */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Warrior</p>
            <h2 className="text-lg font-black text-gray-900">{member.name}</h2>
            <p className="text-[11px] text-gray-500">Member code: {member.memberCode}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-slate-950 text-white font-black text-base flex items-center justify-center ring-2 ring-red-600/40">
            {member.name.charAt(0)}
          </div>
        </div>

        {/* Membership Status Badge */}
        {membership ? (
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    membership.status === "active"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : membership.status === "frozen"
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                  }`}
                >
                  {membership.status}
                </span>
                <h3 className="font-black text-lg text-white mt-1.5">{membership.planName}</h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-red-500">{membership.daysLeft}</span>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Days Left</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                Ends on: {formatDate(membership.endDate)}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
            <p className="font-bold">No Active Membership Plan</p>
            <p className="mt-0.5 text-amber-800">Please visit the front desk to enroll in a workout plan.</p>
          </div>
        )}

        {/* Dues Alert Banner (rule: no pay online, front desk only) */}
        {dues.hasDues && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-rose-700">
                Pending Balance Due
              </p>
              <p className="text-lg font-black text-rose-950">{formatPaise(dues.totalDuesPaise)}</p>
              <p className="text-[11px] text-rose-700 mt-0.5">Please pay at the gym front desk.</p>
            </div>
            <div className="p-2.5 bg-rose-600 text-white rounded-xl font-bold text-xs">
              Front Desk
            </div>
          </div>
        )}

        {/* Mobile Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-gray-200/80 rounded-xl text-xs font-bold text-gray-700">
          <button
            onClick={() => setActiveTab("pass")}
            className={`py-2 rounded-lg flex flex-col items-center gap-1 transition ${
              activeTab === "pass" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500"
            }`}
          >
            <QrCode className="w-4 h-4 text-red-600" />
            <span className="text-[11px]">Pass</span>
          </button>
          <button
            onClick={() => setActiveTab("workout")}
            className={`py-2 rounded-lg flex flex-col items-center gap-1 transition ${
              activeTab === "workout" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500"
            }`}
          >
            <Dumbbell className="w-4 h-4 text-gray-700" />
            <span className="text-[11px]">Workout</span>
          </button>
          <button
            onClick={() => setActiveTab("diet")}
            className={`py-2 rounded-lg flex flex-col items-center gap-1 transition ${
              activeTab === "diet" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500"
            }`}
          >
            <Apple className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px]">Diet</span>
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`py-2 rounded-lg flex flex-col items-center gap-1 transition ${
              activeTab === "invoices" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500"
            }`}
          >
            <Receipt className="w-4 h-4 text-blue-600" />
            <span className="text-[11px]">Invoices</span>
          </button>
        </div>

        {/* TAB 1: PASS & ATTENDANCE */}
        {activeTab === "pass" && (
          <div className="space-y-4">
            {/* Digital QR Pass Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs text-center space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Digital Attendance Pass
              </p>

              {/* QR Container */}
              <div className="inline-block p-4 bg-slate-950 rounded-2xl border-2 border-red-600 shadow-md">
                <div className="w-44 h-44 flex flex-col items-center justify-center text-white">
                  <QrCode className="w-28 h-28 text-red-500 mb-2" />
                  <span className="font-mono font-black text-sm tracking-widest text-white">
                    {member.memberCode}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Scan this screen at the gym entrance tablet or front desk scanner to check in.
              </p>
            </div>

            {/* Attendance Stats */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-extrabold text-xs text-gray-900 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-red-600" /> Check-ins This Month
                </span>
                <span className="font-black text-base text-gray-900">{attendance.monthlyCount}</span>
              </div>

              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Recent Check-ins</p>
              <div className="divide-y divide-gray-50 max-h-36 overflow-y-auto no-scrollbar text-xs">
                {attendance.recent.length === 0 ? (
                  <p className="py-2 text-gray-400 italic">No check-ins logged yet.</p>
                ) : (
                  attendance.recent.map((a: any) => (
                    <div key={a.id} className="py-1.5 flex justify-between text-gray-700">
                      <span>{formatDate(a.checkInAt)}</span>
                      <span className="font-medium text-gray-500">
                        {new Date(a.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WORKOUT PLAN */}
        {activeTab === "workout" && (
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs space-y-4">
            <div>
              <h3 className="font-black text-base text-gray-900">
                {workoutPlan?.title || "Workout Routine"}
              </h3>
              {workoutPlan?.notes && (
                <p className="text-xs text-gray-500 mt-1 italic">&quot;{workoutPlan.notes}&quot;</p>
              )}
            </div>

            {!workoutPlan || workoutPlan.days?.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">
                Your trainer has not assigned a workout plan yet.
              </p>
            ) : (
              <div className="space-y-3">
                {workoutPlan.days.map((d: any, idx: number) => (
                  <div key={idx} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
                    <h4 className="font-bold text-xs text-gray-900">{d.day}</h4>
                    <div className="space-y-1.5">
                      {d.exercises?.map((ex: any, eIdx: number) => (
                        <div key={eIdx} className="bg-white p-2 rounded-lg border border-gray-100 text-xs flex justify-between">
                          <span className="font-bold text-gray-800">{ex.name}</span>
                          <span className="text-gray-500">
                            {ex.sets} × {ex.reps}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DIET & NUTRITION */}
        {activeTab === "diet" && (
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs space-y-4">
            <div>
              <h3 className="font-black text-base text-gray-900">
                {dietPlan?.title || "Nutrition Routine"}
              </h3>
              {dietPlan?.notes && (
                <p className="text-xs text-gray-500 mt-1 italic">&quot;{dietPlan.notes}&quot;</p>
              )}
            </div>

            {!dietPlan || dietPlan.meals?.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">
                No diet chart assigned yet. Ask your coach for your personalized plan.
              </p>
            ) : (
              <div className="space-y-3">
                {dietPlan.meals.map((m: any, idx: number) => (
                  <div key={idx} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-gray-900">{m.time}</h4>
                      {m.calories && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          {m.calories} kcal
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 leading-relaxed font-medium">{m.items}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: INVOICES & RECEIPTS */}
        {activeTab === "invoices" && (
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs space-y-3">
            <h3 className="font-black text-base text-gray-900 pb-2 border-b border-gray-100">
              Tax Invoices & Receipts
            </h3>

            {invoices.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No invoices on file.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-black text-gray-900">{inv.invoiceNumber}</p>
                      <p className="text-[11px] text-gray-400">{formatDate(inv.date)}</p>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="font-black text-gray-900">{formatPaise(inv.total)}</p>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                            inv.balance === 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {inv.balance === 0 ? "Paid" : `Due: ${formatPaise(inv.balance)}`}
                        </span>
                      </div>

                      {inv.shareToken && (
                        <Link
                          href={`/i/${inv.shareToken}`}
                          target="_blank"
                          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                          title="View Receipt"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
