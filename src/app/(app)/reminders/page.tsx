"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Clock,
  AlertTriangle,
  Receipt,
  UserCheck,
  Send,
  Phone,
  CheckCircle2,
  ChevronRight,
  Filter,
  ExternalLink,
  Settings,
  CreditCard,
  RotateCw,
  ArrowLeft,
} from "lucide-react";
import { MoneyText } from "@/components/MoneyText";
import { DateText } from "@/components/DateText";
import { EmptyState } from "@/components/EmptyState";
import { CollectPaymentModal } from "@/components/Navigation/CollectPaymentModal";
import { useToast } from "@/components/Toast";
import { WhatsAppTemplates } from "@/lib/whatsapp";
import { formatPaise } from "@/lib/money";
import { SkeletonList } from "@/components/Skeleton";

interface ReminderItem {
  id: string;
  type: "expiring" | "expired" | "dues";
  member: {
    id: string;
    name: string;
    phone: string;
    memberCode: string;
    photo?: string;
  };
  planName?: string;
  endDate?: string;
  daysLeft?: number;
  daysExpired?: number;
  invoiceNumber?: string;
  balance?: number;
  totalAmount?: number;
  issueDate?: string;
  daysOverdue?: number;
  remindedToday: boolean;
  remindedAt?: string;
  remindedByName?: string;
}

export default function RemindersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"expiring" | "expired" | "dues">("expiring");
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [counts, setCounts] = useState({ expiring: 0, expired: 0, dues: 0 });
  const [gymName, setGymName] = useState("Alpha Warriors");
  const [loading, setLoading] = useState(true);
  const [hideReminded, setHideReminded] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState(0);

  // Collect modal state
  const [collectTarget, setCollectTarget] = useState<{ member: any; invoiceId?: string } | null>(null);

  const loadReminders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reminders?type=${activeTab}`);
      const json = await res.json();
      if (json.data) {
        setItems(json.data.items || []);
        setCounts(json.data.counts || { expiring: 0, expired: 0, dues: 0 });
        if (json.data.gymName) setGymName(json.data.gymName);
      }
    } catch (err) {
      console.error("Load reminders error:", err);
      toast("Failed to load reminders", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
    setActiveRowIndex(0);
  }, [activeTab]);

  const displayedItems = hideReminded ? items.filter((i) => !i.remindedToday) : items;

  const handleShare = async (item: ReminderItem, index: number) => {
    const rawPhone = item.member.phone || "";
    const cleanPhone = rawPhone.replace(/\D/g, "");

    if (cleanPhone.length < 10) {
      toast(`Invalid phone number for ${item.member.name}. Update profile first.`, "error");
      return;
    }

    const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

    // Craft message
    let message = "";
    let reminderType = "reminder_expiring";

    if (item.type === "expiring") {
      reminderType = "reminder_expiring";
      message = WhatsAppTemplates.expiryReminder({
        gym: gymName,
        name: item.member.name,
        plan: item.planName || "Membership",
        endDate: item.endDate ? new Date(item.endDate).toLocaleDateString("en-IN") : "",
      });
    } else if (item.type === "expired") {
      reminderType = "reminder_expired";
      message = WhatsAppTemplates.expiredNotice({
        gym: gymName,
        name: item.member.name,
        plan: item.planName || "Membership",
        endDate: item.endDate ? new Date(item.endDate).toLocaleDateString("en-IN") : "",
      });
    } else if (item.type === "dues") {
      reminderType = "reminder_dues";
      message = WhatsAppTemplates.duesReminder({
        gym: gymName,
        name: item.member.name,
        amount: formatPaise(item.balance || 0),
      });
    }

    // 1. Open WhatsApp immediately (non-blocking)
    const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");

    // 2. Log message in background
    fetch("/api/reminders/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: item.member.id,
        type: reminderType,
      }),
    }).catch((e) => console.error("Log error:", e));

    // 3. Mark row as reminded locally
    setItems((prev) =>
      prev.map((r) =>
        r.id === item.id
          ? {
              ...r,
              remindedToday: true,
              remindedAt: new Date().toISOString(),
              remindedByName: "You",
            }
          : r
      )
    );

    // 4. Advance "Next Member Mode"
    if (index + 1 < displayedItems.length) {
      setActiveRowIndex(index + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
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
              <Bell className="w-6 h-6 text-red-600" />
              WhatsApp Reminders
            </h1>
            <p className="text-xs text-gray-500">
              Send 1-tap polite notifications for expiring plans, renewals, and pending dues
            </p>
          </div>
        </div>

        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl shadow-2xs transition self-start sm:self-auto"
        >
          <Settings className="w-3.5 h-3.5 text-gray-500" />
          <span>Edit Message Templates</span>
        </Link>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-1 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("expiring")}
            className={`px-3.5 py-2 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "expiring"
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <span>Expiring Soon</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700">
              {counts.expiring}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("expired")}
            className={`px-3.5 py-2 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "expired"
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <span>Expired (Last 3d)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-200 text-gray-700">
              {counts.expired}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("dues")}
            className={`px-3.5 py-2 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "dues"
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <span>Pending Dues</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800">
              {counts.dues}
            </span>
          </button>
        </div>

        {/* Hide Reminded Today toggle */}
        <label className="flex items-center gap-2 text-xs text-gray-600 font-semibold cursor-pointer pb-2 sm:pb-0">
          <input
            type="checkbox"
            checked={hideReminded}
            onChange={(e) => setHideReminded(e.target.checked)}
            className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
          />
          <span>Hide already reminded today</span>
        </label>
      </div>

      {/* Next Member Mode Banner (if list has unreminded members) */}
      {displayedItems.length > 0 && activeRowIndex < displayedItems.length && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/30 text-red-400 font-bold flex items-center justify-center shrink-0">
              {activeRowIndex + 1}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                Next In Queue ({activeRowIndex + 1} of {displayedItems.length})
              </p>
              <p className="text-sm font-black text-white">
                {displayedItems[activeRowIndex]?.member.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleShare(displayedItems[activeRowIndex], activeRowIndex)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send WhatsApp & Next</span>
            </button>

            {activeRowIndex + 1 < displayedItems.length && (
              <button
                type="button"
                onClick={() => setActiveRowIndex(activeRowIndex + 1)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reminders List */}
      {loading ? (
        <SkeletonList count={4} />
      ) : displayedItems.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
          title={
            hideReminded
              ? "All members reminded for today!"
              : activeTab === "expiring"
              ? "No memberships expiring soon"
              : activeTab === "expired"
              ? "No memberships recently expired"
              : "No pending dues to remind"
          }
          description="Everyone is up to date. Keep up the high standard!"
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
          {/* Mobile Cards (below 768px) */}
          <div className="divide-y divide-gray-100 md:hidden">
            {displayedItems.map((item, idx) => (
              <div
                key={item.id}
                className={`p-4 space-y-3 transition ${
                  idx === activeRowIndex ? "bg-red-50/40" : "hover:bg-gray-50/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0">
                      {item.member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <Link
                        href={`/members/${item.member.id}`}
                        className="font-bold text-sm text-gray-900 hover:text-red-600 transition"
                      >
                        {item.member.name}
                      </Link>
                      <p className="text-[11px] text-gray-400 font-mono">
                        {item.member.memberCode} • {item.member.phone}
                      </p>
                    </div>
                  </div>

                  {item.remindedToday && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Reminded
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                  {item.type === "expiring" && (
                    <div>
                      <span className="text-gray-500">{item.planName} • Ends: </span>
                      <span className="font-bold text-red-600">
                        <DateText date={item.endDate!} /> ({item.daysLeft}d left)
                      </span>
                    </div>
                  )}

                  {item.type === "expired" && (
                    <div>
                      <span className="text-gray-500">{item.planName} • Expired: </span>
                      <span className="font-bold text-gray-900">
                        <DateText date={item.endDate!} /> ({item.daysExpired}d ago)
                      </span>
                    </div>
                  )}

                  {item.type === "dues" && (
                    <div>
                      <span className="text-gray-500">Invoice {item.invoiceNumber} • </span>
                      <span className="font-black text-rose-600">
                        Due: <MoneyText paise={item.balance!} />
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    {item.type === "dues" ? (
                      <button
                        type="button"
                        onClick={() =>
                          setCollectTarget({
                            member: item.member,
                            invoiceId: item.id,
                          })
                        }
                        className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold text-[11px] transition"
                      >
                        Collect
                      </button>
                    ) : (
                      <Link
                        href={`/members/${item.member.id}`}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-[11px] transition"
                      >
                        Renew
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => handleShare(item, idx)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] shadow-2xs transition"
                    >
                      <Send className="w-3 h-3" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (768px and above) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Status & Details</th>
                  <th className="py-3 px-4 text-center">Reminded Today</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {displayedItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`transition ${
                      idx === activeRowIndex ? "bg-red-50/40" : "hover:bg-gray-50/60"
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0 text-sm">
                          {item.member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            href={`/members/${item.member.id}`}
                            className="font-bold text-gray-900 hover:text-red-600 transition"
                          >
                            {item.member.name}
                          </Link>
                          <p className="text-[11px] text-gray-400 font-mono">
                            {item.member.memberCode} • {item.member.phone}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {item.type === "expiring" && (
                        <div>
                          <p className="font-bold text-gray-900">{item.planName}</p>
                          <p className="text-[11px] text-red-600 font-semibold">
                            Expires on <DateText date={item.endDate!} /> ({item.daysLeft} days left)
                          </p>
                        </div>
                      )}

                      {item.type === "expired" && (
                        <div>
                          <p className="font-bold text-gray-900">{item.planName}</p>
                          <p className="text-[11px] text-gray-500">
                            Ended on <DateText date={item.endDate!} /> ({item.daysExpired} days ago)
                          </p>
                        </div>
                      )}

                      {item.type === "dues" && (
                        <div>
                          <p className="font-bold text-gray-900">Invoice {item.invoiceNumber}</p>
                          <p className="text-[11px] text-rose-600 font-black">
                            Due: <MoneyText paise={item.balance!} />
                          </p>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {item.remindedToday ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Reminded
                          </span>
                          <span className="text-[10px] text-gray-400 mt-0.5">
                            by {item.remindedByName || "Staff"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {item.type === "dues" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setCollectTarget({
                                member: item.member,
                                invoiceId: item.id,
                              })
                            }
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition"
                          >
                            Collect
                          </button>
                        ) : (
                          <Link
                            href={`/members/${item.member.id}`}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
                          >
                            Renew
                          </Link>
                        )}

                        <button
                          type="button"
                          onClick={() => handleShare(item, idx)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            loadReminders();
          }}
        />
      )}
    </div>
  );
}
