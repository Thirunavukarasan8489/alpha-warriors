"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Phone,
  Calendar,
  CreditCard,
  Clock,
  User,
  RefreshCw,
  MoreVertical,
  QrCode,
  Edit,
  Trash2,
  Snowflake,
  Play,
  ArrowUpCircle,
  XCircle,
  FileText,
  AlertCircle,
  History,
  CheckCircle2,
  Dumbbell,
  Globe,
  Loader2,
} from "lucide-react";
import { SkeletonStats, SkeletonList } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { MoneyText } from "@/components/MoneyText";
import { DateText } from "@/components/DateText";
import { ShareButton } from "@/components/ShareButton";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PlanPicker, PlanOption } from "@/components/PlanPicker";
import { CollectPaymentModal } from "@/components/Navigation/CollectPaymentModal";
import { formatPaise } from "@/lib/money";
import { WhatsAppTemplates, buildShareLink } from "@/lib/whatsapp";
import { useToast } from "@/components/Toast";

interface MemberProfileData {
  id: string;
  memberCode: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  photo?: string;
  notes?: string;
  joinedAt: string;
  displayStatus: string;
  dues: number;
  lastVisitAt?: string;
  trainer?: { id: string; name: string } | null;
  currentMembership?: {
    id: string;
    planName: string;
    durationDays: number;
    startDate: string;
    endDate: string;
    status: string;
    price?: number;
    finalAmount?: number;
    frozenAt?: string;
    expectedResumeDate?: string;
  } | null;
}

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const memberId = params.id as string;

  const [member, setMember] = useState<MemberProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "memberships" | "payments" | "attendance" | "notes">("overview");

  // Tab data states
  const [membershipsList, setMembershipsList] = useState<unknown[]>([]);
  const [paymentsData, setPaymentsData] = useState<{ invoices: unknown[]; payments: unknown[] }>({ invoices: [], payments: [] });
  const [attendanceList, setAttendanceList] = useState<unknown[]>([]);

  // Action Modals State
  const [showCollectPayment, setShowCollectPayment] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Form states for modals
  const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null);
  const [modalInput, setModalInput] = useState({ reason: "", days: 7, newPlanId: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const loadProfile = async () => {
    try {
      const res = await fetch(`/api/members/${memberId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load member");
      setMember(json.data);
    } catch (err: unknown) {
      toast((err as Error).message || "Error loading profile", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [memberId]);

  // Load Tab-specific data
  useEffect(() => {
    if (activeTab === "memberships") {
      fetch(`/api/members/${memberId}/memberships`)
        .then((res) => res.json())
        .then((d) => d.data && setMembershipsList(d.data))
        .catch((e) => console.error(e));
    } else if (activeTab === "payments") {
      fetch(`/api/members/${memberId}/payments`)
        .then((res) => res.json())
        .then((d) => d.data && setPaymentsData(d.data))
        .catch((e) => console.error(e));
    } else if (activeTab === "attendance") {
      fetch(`/api/members/${memberId}/attendance`)
        .then((res) => res.json())
        .then((d) => d.data && setAttendanceList(d.data))
        .catch((e) => console.error(e));
    }
  }, [activeTab, memberId]);

  // Handle Actions
  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, planId: selectedPlan.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to renew");
      toast("Membership renewed successfully!", "success");
      setShowRenewModal(false);
      loadProfile();
    } catch (err: unknown) {
      toast((err as Error).message || "Renewal error", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member?.currentMembership) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/memberships/${member.currentMembership.id}/freeze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: modalInput.reason || "Member request" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Freeze failed");
      toast("Membership frozen", "success");
      setShowFreezeModal(false);
      loadProfile();
    } catch (err: unknown) {
      toast((err as Error).message || "Error", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!member?.currentMembership) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/memberships/${member.currentMembership.id}/resume`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Resume failed");
      toast(`Membership resumed! Added ${json.data.daysFrozen} days.`, "success");
      setShowResumeModal(false);
      loadProfile();
    } catch (err: unknown) {
      toast((err as Error).message || "Error", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member?.currentMembership) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/memberships/${member.currentMembership.id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: Number(modalInput.days), reason: modalInput.reason || "Bonus extension" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Extend failed");
      toast(`Extended by ${modalInput.days} days!`, "success");
      setShowExtendModal(false);
      loadProfile();
    } catch (err: unknown) {
      toast((err as Error).message || "Error", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member?.currentMembership || !modalInput.newPlanId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/memberships/${member.currentMembership.id}/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPlanId: modalInput.newPlanId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Upgrade failed");
      toast("Plan upgraded successfully!", "success");
      setShowUpgradeModal(false);
      loadProfile();
    } catch (err: unknown) {
      toast((err as Error).message || "Error", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member?.currentMembership) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/memberships/${member.currentMembership.id}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: modalInput.reason || "Cancelled membership" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to end membership");
      toast("Membership terminated.", "info");
      setShowEndModal(false);
      loadProfile();
    } catch (err: unknown) {
      toast((err as Error).message || "Error", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMember = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/members/${memberId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Delete failed");
      toast("Member record deleted", "info");
      router.push("/members");
    } catch (err: unknown) {
      toast((err as Error).message || "Error deleting member", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSharePortalLink = async () => {
    try {
      const res = await fetch(`/api/members/${memberId}/portal-token`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const text = `Hi ${data.data.memberName}, here is your personal Alpha Warriors member portal pass link to view your remaining plan days, invoices, attendance and workouts: ${data.data.portalUrl}`;
        window.open(buildShareLink(data.data.phone, text), "_blank");
        toast("Member portal link generated! Opening WhatsApp...", "success");
      } else {
        toast(data.error?.message || "Failed to generate portal link", "error");
      }
    } catch {
      toast("Error creating portal link", "error");
    }
  };

  const handleRevokePortalLink = async () => {
    if (!confirm("Revoke this member's self-service portal link? An old link will no longer work.")) return;
    try {
      const res = await fetch(`/api/members/${memberId}/portal-token`, { method: "DELETE" });
      if (res.ok) {
        toast("Member portal link revoked", "success");
      } else {
        toast("Failed to revoke link", "error");
      }
    } catch {
      toast("Error revoking portal link", "error");
    }
  };

  if (loading || !member) {
    return (
      <div className="space-y-6">
        <SkeletonStats count={4} />
        <SkeletonList count={3} />
      </div>
    );
  }

  const isFrozen = member.displayStatus === "frozen";

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-xs relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Avatar and Info */}
          <div className="flex items-start gap-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white font-extrabold text-2xl flex items-center justify-center shrink-0 shadow-md ring-2 ring-red-600/30">
              {member.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.photo} alt={member.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                member.name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {member.name}
                </h1>
                <StatusBadge status={member.displayStatus} />
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mt-1">
                <span className="font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                  {member.memberCode}
                </span>
                <span>•</span>
                <span className="text-gray-600 font-semibold">{member.phone}</span>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <a
                  href={`tel:${member.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition"
                >
                  <Phone className="w-3.5 h-3.5 text-gray-500" />
                  Call
                </a>

                <ShareButton
                  phone={member.whatsapp || member.phone}
                  memberId={member.id}
                  label="WhatsApp"
                />
              </div>
            </div>
          </div>

          {/* Quick Primary Actions: Renew, Collect Payment, More Menu */}
          <div className="flex items-center gap-2.5 pt-3 sm:pt-0 border-t sm:border-0 border-gray-100">
            <button
              type="button"
              onClick={() => setShowRenewModal(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition"
            >
              <RefreshCw className="w-4 h-4" />
              Renew
            </button>

            <button
              type="button"
              onClick={() => setShowCollectPayment(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition"
            >
              <CreditCard className="w-4 h-4" />
              Collect Payment
            </button>

            <Link
              href={`/members/${member.id}/training`}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition"
            >
              <Dumbbell className="w-4 h-4 text-red-500" />
              Training
            </Link>

            {/* More Menu Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition"
                title="More Actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMoreMenu && (
                <div
                  className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-30 divide-y divide-gray-100 text-xs font-semibold"
                  onClick={() => setShowMoreMenu(false)}
                >
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <QrCode className="w-4 h-4 text-gray-400" />
                      Show Member QR
                    </button>
                    <Link
                      href={`/members/${member.id}/edit`}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <Edit className="w-4 h-4 text-gray-400" />
                      Edit Details
                    </Link>
                    <button
                      type="button"
                      onClick={handleSharePortalLink}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-emerald-700 font-bold"
                    >
                      <Globe className="w-4 h-4 text-emerald-600" />
                      Share Portal Link
                    </button>
                    <button
                      type="button"
                      onClick={handleRevokePortalLink}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-500"
                    >
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                      Revoke Portal Link
                    </button>
                  </div>

                  {member.currentMembership && (
                    <div className="py-1">
                      {isFrozen ? (
                        <button
                          type="button"
                          onClick={() => setShowResumeModal(true)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-emerald-600"
                        >
                          <Play className="w-4 h-4" />
                          Resume Membership
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowFreezeModal(true)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-blue-600"
                        >
                          <Snowflake className="w-4 h-4" />
                          Freeze Membership
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowExtendModal(true)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                      >
                        <Calendar className="w-4 h-4 text-gray-400" />
                        Extend Days
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowUpgradeModal(true)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                      >
                        <ArrowUpCircle className="w-4 h-4 text-gray-400" />
                        Upgrade Plan
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowEndModal(true)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-rose-600"
                      >
                        <XCircle className="w-4 h-4" />
                        Terminate Plan
                      </button>
                    </div>
                  )}

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full px-4 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Member
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Metrics Strip */}
        <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-gray-400 font-medium">Current Plan:</span>
            <p className="font-bold text-gray-900 mt-0.5">
              {member.currentMembership?.planName || "None"}
            </p>
          </div>
          <div>
            <span className="text-gray-400 font-medium">End Date:</span>
            <p className="font-bold text-gray-900 mt-0.5">
              <DateText date={member.currentMembership?.endDate} />
            </p>
          </div>
          <div>
            <span className="text-gray-400 font-medium">Last Visit:</span>
            <p className="font-bold text-gray-900 mt-0.5">
              <DateText date={member.lastVisitAt} />
            </p>
          </div>
          <div>
            <span className="text-gray-400 font-medium">Pending Dues:</span>
            <p className={`font-black text-sm mt-0.5 ${member.dues > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              <MoneyText paise={member.dues} />
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="space-y-4">
        {/* Horizontal Scrolling Tab Bar */}
        <div className="flex items-center gap-1.5 border-b border-gray-200 overflow-x-auto no-scrollbar text-sm font-semibold">
          {[
            { id: "overview", label: "Overview" },
            { id: "memberships", label: "Memberships" },
            { id: "payments", label: "Payments & Invoices" },
            { id: "attendance", label: "Attendance" },
            { id: "notes", label: "Notes" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition ${
                activeTab === tab.id
                  ? "border-red-600 text-red-600 font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-gray-900 pb-2 border-b border-gray-100">
                Membership Details
              </h3>
              {member.currentMembership ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Plan:</span>
                    <span className="font-bold text-gray-900">{member.currentMembership.planName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration:</span>
                    <span className="font-medium text-gray-700">{member.currentMembership.durationDays} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Start Date:</span>
                    <DateText date={member.currentMembership.startDate} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">End Date:</span>
                    <DateText date={member.currentMembership.endDate} />
                  </div>
                  {member.currentMembership.price !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Plan Price:</span>
                      <MoneyText paise={member.currentMembership.price} />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-3">No active membership found.</p>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-gray-900 pb-2 border-b border-gray-100">
                Personal Information
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Date of Birth:</span>
                  <DateText date={member.dateOfBirth} />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Gender:</span>
                  <span className="font-medium capitalize text-gray-800">{member.gender || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email:</span>
                  <span className="font-medium text-gray-800">{member.email || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Joined:</span>
                  <DateText date={member.joinedAt} />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Address:</span>
                  <span className="font-medium text-gray-800 truncate max-w-[200px]">{member.address || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Memberships History */}
        {activeTab === "memberships" && (
          <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">Membership History</h3>
              <button
                type="button"
                onClick={() => setShowRenewModal(true)}
                className="text-xs text-red-600 font-bold hover:underline"
              >
                + New Membership
              </button>
            </div>
            {membershipsList.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-400">Loading history...</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {membershipsList.map((ms: any) => (
                  <div key={ms.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-bold text-gray-900">{ms.planName}</p>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        <DateText date={ms.startDate} /> – <DateText date={ms.endDate} /> ({ms.durationDays} days)
                      </p>
                      {ms.notes && <p className="text-[11px] text-gray-400 italic mt-0.5">{ms.notes}</p>}
                    </div>
                    <div className="text-right">
                      <StatusBadge status={ms.status} size="sm" />
                      {ms.finalAmount !== undefined && (
                        <p className="font-bold text-gray-900 mt-1">
                          <MoneyText paise={ms.finalAmount} />
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Payments & Invoices */}
        {activeTab === "payments" && (
          <div className="space-y-4">
            {/* Invoices */}
            <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-sm text-gray-900">Invoices</h3>
                {member.dues > 0 && (
                  <span className="text-xs font-bold text-rose-600">
                    Total Due: <MoneyText paise={member.dues} />
                  </span>
                )}
              </div>
              <div className="divide-y divide-gray-100 text-xs">
                {paymentsData.invoices.map((inv: any) => (
                  <div key={inv.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-mono font-bold text-gray-900">{inv.invoiceNumber}</span>
                      <p className="text-gray-500 text-[11px]">Issued on <DateText date={inv.issueDate} /></p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        Total: <MoneyText paise={inv.totalAmount} />
                      </p>
                      {inv.balance > 0 ? (
                        <span className="text-rose-600 font-extrabold text-[11px]">
                          Due: <MoneyText paise={inv.balance} />
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium text-[11px]">Fully Paid</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payments List */}
            <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-sm text-gray-900">Payment Transactions</h3>
              </div>
              <div className="divide-y divide-gray-100 text-xs">
                {paymentsData.payments.map((p: any) => (
                  <div key={p.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900">{p.paymentNumber}</span>
                        {p.isVoid && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            VOID
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-[11px]">
                        <DateText date={p.receivedAt} type="datetime" /> • by {p.receivedByName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`font-black ${p.isVoid ? "line-through text-gray-400" : "text-emerald-700"}`}>
                        <MoneyText paise={p.amount} />
                      </span>
                      <p className="text-[10px] text-gray-400 uppercase">
                        {p.modes?.map((m: any) => m.mode).join(" + ") || "Cash"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Attendance */}
        {activeTab === "attendance" && (
          <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">Check-in Attendance Log</h3>
              <span className="text-xs text-gray-500 font-medium">{attendanceList.length} visits recorded</span>
            </div>
            {attendanceList.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-400">No attendance logged yet.</p>
            ) : (
              <div className="divide-y divide-gray-100 text-xs">
                {attendanceList.map((att: any) => (
                  <div key={att.id} className="p-3.5 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <DateText date={att.checkInAt} type="datetime" className="font-semibold text-gray-900" />
                        <span className="text-[11px] text-gray-400 block capitalize">Via {att.source}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Notes */}
        {activeTab === "notes" && (
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-gray-900">Member Notes</h3>
            <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
              {member.notes || "No notes entered for this member."}
            </p>
          </div>
        )}
      </div>

      {/* MODALS */}

      {/* Collect Payment Modal */}
      <CollectPaymentModal
        isOpen={showCollectPayment}
        onClose={() => setShowCollectPayment(false)}
        preselectedMember={{
          id: member.id,
          name: member.name,
          phone: member.phone,
          memberCode: member.memberCode,
        }}
        onSuccess={() => {
          setShowCollectPayment(false);
          loadProfile();
        }}
      />

      {/* Renew Modal */}
      <Modal
        isOpen={showRenewModal}
        onClose={() => setShowRenewModal(false)}
        title="Renew Membership"
        subtitle={`Select a plan to extend or reactivate ${member.name}'s membership`}
      >
        <form onSubmit={handleRenew} className="space-y-4">
          <PlanPicker
            selectedPlanId={selectedPlan?.id}
            onChange={setSelectedPlan}
          />
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowRenewModal(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || !selectedPlan}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition touch-manipulation cursor-pointer"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Confirm Renewal</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Freeze Modal */}
      <Modal
        isOpen={showFreezeModal}
        onClose={() => setShowFreezeModal(false)}
        title="Freeze Membership"
        subtitle="Temporarily pause membership countdown"
      >
        <form onSubmit={handleFreeze} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Reason for Freeze *
            </label>
            <input
              type="text"
              value={modalInput.reason}
              onChange={(e) => setModalInput({ ...modalInput, reason: e.target.value })}
              placeholder="e.g. Travel, Injury, Exam"
              required
              className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowFreezeModal(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition touch-manipulation cursor-pointer"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Freezing...</span>
                </>
              ) : (
                <span>Freeze Now</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Resume Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResumeModal}
        title="Resume Membership"
        message="Resuming this membership will calculate the days frozen and shift the end date forward accordingly. Continue?"
        confirmLabel="Resume Active Status"
        variant="warning"
        isLoading={actionLoading}
        onConfirm={handleResume}
        onCancel={() => setShowResumeModal(false)}
      />

      {/* Extend Modal */}
      <Modal
        isOpen={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        title="Extend Membership"
        subtitle="Add grace or complimentary days to the current end date"
      >
        <form onSubmit={handleExtend} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Days to Add *
            </label>
            <input
              type="number"
              min="1"
              value={modalInput.days}
              onChange={(e) => setModalInput({ ...modalInput, days: Number(e.target.value) })}
              required
              className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Reason *
            </label>
            <input
              type="text"
              value={modalInput.reason}
              onChange={(e) => setModalInput({ ...modalInput, reason: e.target.value })}
              placeholder="e.g. Gym renovation holiday bonus"
              required
              className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl"
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowExtendModal(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition touch-manipulation cursor-pointer"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Extending...</span>
                </>
              ) : (
                <span>Confirm Extension</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Upgrade Modal */}
      <Modal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Upgrade Membership"
        subtitle="Upgrade to a longer plan with credit for unused days"
      >
        <form onSubmit={handleUpgrade} className="space-y-4">
          <PlanPicker
            selectedPlanId={modalInput.newPlanId}
            onChange={(p) => setModalInput({ ...modalInput, newPlanId: p.id })}
          />
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowUpgradeModal(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || !modalInput.newPlanId}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition touch-manipulation cursor-pointer"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Upgrading...</span>
                </>
              ) : (
                <span>Confirm Upgrade</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* End Modal */}
      <Modal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        title="Terminate Membership"
        subtitle="End the active membership immediately"
      >
        <form onSubmit={handleEnd} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Termination Reason *
            </label>
            <input
              type="text"
              value={modalInput.reason}
              onChange={(e) => setModalInput({ ...modalInput, reason: e.target.value })}
              placeholder="e.g. Member relocated to another city"
              required
              className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl"
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowEndModal(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition touch-manipulation cursor-pointer"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Terminating...</span>
                </>
              ) : (
                <span>Confirm Termination</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Member QR Code Modal */}
      <Modal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="Member QR Code"
        subtitle={`Fast attendance check-in for ${member.name}`}
      >
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          <div className="p-4 bg-white rounded-3xl border-2 border-gray-900 shadow-md">
            {/* SVG representation of member code barcode/QR for check-in */}
            <div className="w-48 h-48 bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white p-4">
              <QrCode className="w-24 h-24 mb-2 text-red-500" />
              <span className="font-mono font-bold tracking-widest text-sm">
                {member.memberCode}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center max-w-xs">
            Scan this code from the Front Desk Attendance screen to instantly record check-in.
          </p>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Member"
        message={`Are you sure you want to delete ${member.name}? This will remove them from active listings. Historical payment records remain preserved.`}
        confirmLabel="Delete Member"
        variant="danger"
        isLoading={actionLoading}
        onConfirm={handleDeleteMember}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

