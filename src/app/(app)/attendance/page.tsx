"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Search,
  QrCode,
  Undo2,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserX,
  Camera,
  Loader2,
} from "lucide-react";
import { SkeletonList } from "@/components/Skeleton";
import { SearchBox } from "@/components/SearchBox";
import { StatusBadge } from "@/components/StatusBadge";
import { DateText } from "@/components/DateText";
import { ShareButton } from "@/components/ShareButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { WhatsAppTemplates } from "@/lib/whatsapp";
import { toInputDateString } from "@/lib/dates";
import { useToast } from "@/components/Toast";

interface AttendanceRecord {
  id: string;
  checkInAt: string;
  source: string;
  member?: {
    id: string;
    name: string;
    phone: string;
    memberCode: string;
    photo?: string;
  };
  checkedInByName: string;
}

interface AbsentMember {
  member: {
    id: string;
    name: string;
    phone: string;
    memberCode: string;
    photo?: string;
  };
  lastVisitDate: string | null;
  daysAbsent: number | string;
}

export default function AttendancePage() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"today" | "missed">("today");
  const [selectedDate, setSelectedDate] = useState(toInputDateString(new Date()));

  // Today tab state
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // Search member to check in
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [isQrSubmitting, setIsQrSubmitting] = useState(false);

  // Duplicate Check-in confirmation
  const [duplicateWarning, setDuplicateWarning] = useState<{
    memberId: string;
    memberName: string;
    message: string;
  } | null>(null);

  // Missed tab state
  const [absentMembers, setAbsentMembers] = useState<AbsentMember[]>([]);
  const [loadingAbsent, setLoadingAbsent] = useState(false);

  // QR Scan Modal
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrInputCode, setQrInputCode] = useState("");

  const loadTodayAttendance = async () => {
    setLoadingRecords(true);
    try {
      const res = await fetch(`/api/attendance?date=${selectedDate}`);
      const json = await res.json();
      if (json.data) {
        setAttendanceRecords(json.data);
      }
    } catch (err: unknown) {
      toast("Error loading attendance", "error");
    } finally {
      setLoadingRecords(false);
    }
  };

  const loadAbsentMembers = async () => {
    setLoadingAbsent(true);
    try {
      const res = await fetch("/api/attendance/absent?days=7");
      const json = await res.json();
      if (json.data) {
        setAbsentMembers(json.data);
      }
    } catch (err: unknown) {
      toast("Error loading missed attendance", "error");
    } finally {
      setLoadingAbsent(false);
    }
  };

  useEffect(() => {
    if (activeTab === "today") {
      loadTodayAttendance();
    } else {
      loadAbsentMembers();
    }
  }, [activeTab, selectedDate]);

  // Search members for quick check-in
  useEffect(() => {
    if (searchQuery.trim().length >= 1) {
      fetch(`/api/members?search=${encodeURIComponent(searchQuery)}&limit=5`)
        .then((res) => res.json())
        .then((json) => {
          if (json.data) setSearchResults(json.data);
        })
        .catch((e) => console.error(e));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleCheckIn = async (memberId: string, force = false) => {
    setCheckingInId(memberId);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          source: showQrScanner ? "qr" : "manual",
          date: selectedDate,
          force,
        }),
      });

      const json = await res.json();

      if (json.warning?.code === "ALREADY_CHECKED_IN" && !force) {
        setDuplicateWarning({
          memberId,
          memberName: searchResults.find((m) => m.id === memberId)?.name || "Member",
          message: json.warning.message,
        });
        return;
      }

      if (!res.ok) {
        throw new Error(json.error?.message || "Check-in failed");
      }

      toast(`Check-in recorded for ${json.data.memberName}!`, "success");

      if (json.data.warnings && json.data.warnings.length > 0) {
        json.data.warnings.forEach((w: string) => toast(w, "info"));
      }

      setSearchQuery("");
      setSearchResults([]);
      setDuplicateWarning(null);
      setShowQrScanner(false);
      loadTodayAttendance();
    } catch (err: unknown) {
      toast((err as Error).message || "Check-in error", "error");
    } finally {
      setCheckingInId(null);
    }
  };

  const handleUndo = async (recordId: string) => {
    if (undoingId) return;
    setUndoingId(recordId);
    try {
      const res = await fetch(`/api/attendance/${recordId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to undo check-in");
      }
      toast("Check-in undone", "info");
      loadTodayAttendance();
    } catch (err: unknown) {
      toast((err as Error).message || "Error", "error");
    } finally {
      setUndoingId(null);
    }
  };

  const handleQrManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInputCode.trim() || isQrSubmitting) return;

    setIsQrSubmitting(true);
    try {
      const res = await fetch(`/api/members?search=${encodeURIComponent(qrInputCode)}&limit=1`);
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        await handleCheckIn(json.data[0].id, false);
      } else {
        toast("No member found with this code", "error");
      }
    } catch {
      toast("Error searching for member code", "error");
    } finally {
      setIsQrSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Attendance</h1>
          <p className="text-xs text-gray-500">Fast check-in and workout consistency tracking</p>
        </div>

        {/* Date Selector & QR Button */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-red-500"
          />

          <button
            type="button"
            onClick={() => setShowQrScanner(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <QrCode className="w-3.5 h-3.5 text-red-500" />
            <span>Scan QR</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("today")}
          className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition ${
            activeTab === "today"
              ? "border-red-600 text-red-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Today&apos;s Check-ins ({attendanceRecords.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("missed")}
          className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition ${
            activeTab === "missed"
              ? "border-red-600 text-red-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Missed 7+ Days
        </button>
      </div>

      {/* TODAY TAB */}
      {activeTab === "today" && (
        <div className="space-y-4">
          {/* Quick Check-in Search Box */}
          <div className="relative">
            <SearchBox
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search member by name, phone or code to check in..."
            />

            {/* Instant Search Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-12 z-30 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {searchResults.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 hover:bg-gray-50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{m.name}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{m.memberCode} • {m.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={m.displayStatus} size="sm" />
                      <button
                        type="button"
                        onClick={() => handleCheckIn(m.id)}
                        disabled={checkingInId === m.id}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition touch-manipulation cursor-pointer"
                      >
                        {checkingInId === m.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Checking in...</span>
                          </>
                        ) : (
                          <span>Check in</span>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Log List */}
          <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">Recorded Visits</h3>
              <span className="text-xs text-gray-500 font-medium">
                {attendanceRecords.length} check-ins
              </span>
            </div>

            {loadingRecords ? (
              <div className="p-4">
                <SkeletonList count={4} />
              </div>
            ) : attendanceRecords.length === 0 ? (
              <EmptyState
                icon={<CalendarCheck className="w-6 h-6" />}
                title="No check-ins logged for this date"
                description="Search member above or scan their QR code to record attendance."
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {attendanceRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 px-4 flex items-center justify-between gap-3 text-xs hover:bg-gray-50/50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0">
                        {rec.member?.name ? rec.member.name.charAt(0).toUpperCase() : <UserX className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        {rec.member ? (
                          <Link
                            href={`/members/${rec.member.id}`}
                            className="font-bold text-gray-900 hover:text-red-600 transition truncate block"
                          >
                            {rec.member.name}
                          </Link>
                        ) : (
                          <span className="text-gray-500 italic">Unknown / Deleted Member</span>
                        )}

                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                          <span className="font-mono">{rec.member?.memberCode}</span>
                          <span>•</span>
                          <span className="capitalize">{rec.source}</span>
                          <span>•</span>
                          <span>by {rec.checkedInByName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <DateText date={rec.checkInAt} type="time" className="font-bold text-gray-800" />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUndo(rec.id)}
                        disabled={undoingId === rec.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 rounded-lg border border-rose-200 transition touch-manipulation cursor-pointer"
                        title="Undo Check-in"
                      >
                        {undoingId === rec.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Undo2 className="w-3 h-3" />
                        )}
                        Undo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MISSED 7+ DAYS TAB */}
      {activeTab === "missed" && (
        <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-gray-900">Missed Workouts (7+ Days)</h3>
              <p className="text-[11px] text-gray-400">Active athletes who have not visited recently</p>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              {absentMembers.length} Members
            </span>
          </div>

          {loadingAbsent ? (
            <div className="p-4">
              <SkeletonList count={4} />
            </div>
          ) : absentMembers.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-500" />}
              title="All active members are consistent!"
              description="No active members have been absent for more than 7 days."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {absentMembers.map((row) => (
                <div
                  key={row.member.id}
                  className="p-4 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">
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
                      <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
                        Last visit:{" "}
                        {row.lastVisitDate ? <DateText date={row.lastVisitDate} /> : "Never visited"}{" "}
                        ({row.daysAbsent} days ago)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`tel:${row.member.phone}`}
                      className="p-2 rounded-xl text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition"
                      title="Call"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>

                    <ShareButton
                      phone={row.member.phone}
                      memberId={row.member.id}
                      type="reminder_absent"
                      label="Remind"
                      message={WhatsAppTemplates.absentReminder({
                        gym: "Alpha Warriors",
                        name: row.member.name,
                        days: row.daysAbsent,
                      })}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Duplicate Check-in Confirmation Dialog */}
      {duplicateWarning && (
        <ConfirmDialog
          isOpen={true}
          title="Already Checked In Today"
          message={duplicateWarning.message}
          confirmLabel="Check In Again"
          cancelLabel="Cancel"
          variant="warning"
          onConfirm={() => handleCheckIn(duplicateWarning.memberId, true)}
          onCancel={() => setDuplicateWarning(null)}
        />
      )}

      {/* QR Scanner / Manual Code Entry Modal */}
      <Modal
        isOpen={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        title="Check in via QR / Member Code"
        subtitle="Enter or scan member barcode code"
      >
        <div className="space-y-4">
          <div className="p-6 bg-slate-900 rounded-2xl text-center text-white flex flex-col items-center justify-center">
            <Camera className="w-12 h-12 text-red-500 mb-2 animate-bounce" />
            <h4 className="font-bold text-sm">Camera QR Scanner</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Point your camera at the member&apos;s digital card or pass code.
            </p>
          </div>

          <form onSubmit={handleQrManualSubmit} className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Or Type Member Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={qrInputCode}
                onChange={(e) => setQrInputCode(e.target.value)}
                placeholder="e.g. AW-1001"
                className="flex-1 px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              />
              <button
                type="submit"
                disabled={isQrSubmitting || !qrInputCode.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition touch-manipulation cursor-pointer"
              >
                {isQrSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <span>Check In</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

