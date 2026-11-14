"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame,
  Search,
  Plus,
  Phone,
  MessageCircle,
  Calendar,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  XCircle,
  Filter,
  User,
  Clock,
  Sparkles,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { buildShareLink } from "@/lib/whatsapp";
import { formatDate } from "@/lib/dates";

interface Lead {
  id: string;
  name: string;
  phone: string;
  source: string;
  interest: string;
  followUpDate: string | null;
  isOverdue: boolean;
  assignedTo: { id: string; name: string } | null;
  status: "new" | "contacted" | "trial" | "won" | "lost";
  notes: string;
  convertedMember: { id: string; name: string; memberCode: string } | null;
  createdAt: string;
}

const STATUSES: { key: Lead["status"]; label: string; color: string; badge: string }[] = [
  { key: "new", label: "New Leads", color: "bg-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "contacted", label: "Contacted", color: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "trial", label: "Trial Workout", color: "bg-purple-500", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "won", label: "Converted / Won", color: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "lost", label: "Lost / Closed", color: "bg-gray-400", badge: "bg-gray-100 text-gray-600 border-gray-200" },
];

export default function LeadsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formSource, setFormSource] = useState<string>("walk-in");
  const [formInterest, setFormInterest] = useState("");
  const [formFollowUpDate, setFormFollowUpDate] = useState("");
  const [formStatus, setFormStatus] = useState<string>("new");
  const [formNotes, setFormNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const activeBranchId = localStorage.getItem("alpha_active_branch_id") || "";
      let url = `/api/leads?status=${selectedStatusTab}&search=${encodeURIComponent(search)}`;
      if (activeBranchId) url += `&branchId=${activeBranchId}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.data) {
        setLeads(data.data);
        if (data.counts) setCounts(data.counts);
      }
    } catch {
      showToast("Error loading leads", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [selectedStatusTab]);

  useEffect(() => {
    const handleBranchChange = () => fetchLeads();
    window.addEventListener("branchChanged", handleBranchChange);
    return () => window.removeEventListener("branchChanged", handleBranchChange);
  }, [selectedStatusTab, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const handleStatusChange = async (leadId: string, nextStatus: Lead["status"]) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        showToast(`Lead moved to ${nextStatus.toUpperCase()}`, "success");
        fetchLeads();
      }
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      showToast("Name and phone are required", "warning");
      return;
    }

    setIsSaving(true);
    try {
      const activeBranchId = localStorage.getItem("alpha_active_branch_id") || undefined;
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          phone: formPhone.trim(),
          source: formSource,
          interest: formInterest.trim(),
          followUpDate: formFollowUpDate || undefined,
          status: formStatus,
          notes: formNotes.trim(),
          branchId: activeBranchId,
        }),
      });

      if (res.ok) {
        showToast("Lead created successfully", "success");
        setIsModalOpen(false);
        setFormName("");
        setFormPhone("");
        setFormInterest("");
        setFormFollowUpDate("");
        setFormNotes("");
        fetchLeads();
      } else {
        const data = await res.json();
        showToast(data.error?.message || "Failed to create lead", "error");
      }
    } catch {
      showToast("Network error creating lead", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const openWhatsAppGreeting = (lead: Lead) => {
    const text = `Hi ${lead.name}, greetings from Alpha Warriors Fitness! Thank you for reaching out to us. How can we help you achieve your fitness goals? Let us know if you'd like to book a free trial session!`;
    const link = buildShareLink(lead.phone, text);
    window.open(link, "_blank");
  };

  const handleConvertToMember = (lead: Lead) => {
    // Directs to 04-member-form prefilled
    router.push(
      `/members/new?name=${encodeURIComponent(lead.name)}&phone=${encodeURIComponent(
        lead.phone
      )}&leadId=${lead.id}`
    );
  };

  const overdueList = leads.filter((l) => l.isOverdue);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Flame className="w-6 h-6 text-red-600" />
            Leads & Inquiries
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            Track prospective warriors from first enquiry to gym membership
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-900/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add New Lead
        </button>
      </div>

      {/* Overdue Follow-ups Section (Always shown first per requirement) */}
      {overdueList.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="p-1.5 rounded-lg bg-amber-500 text-white">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <h2 className="font-extrabold text-sm sm:text-base text-amber-950">
              Overdue Follow-ups ({overdueList.length}) – Action Required
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {overdueList.map((lead) => (
              <div
                key={`overdue-${lead.id}`}
                className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-black text-sm text-gray-900">{lead.name}</p>
                    <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                      Overdue
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{lead.phone}</p>
                  {lead.interest && (
                    <p className="text-xs text-gray-700 font-medium mt-1">Goal: {lead.interest}</p>
                  )}
                  {lead.followUpDate && (
                    <p className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Due: {formatDate(lead.followUpDate)}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center gap-2">
                  <button
                    onClick={() => openWhatsAppGreeting(lead)}
                    className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                  <button
                    onClick={() => handleConvertToMember(lead)}
                    className="py-1.5 px-2.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Convert
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Status Chips */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, phone or goal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600 shadow-2xs"
          />
        </form>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
          <button
            onClick={() => setSelectedStatusTab("all")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedStatusTab === "all"
                ? "bg-red-600 text-white shadow-xs"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            All Leads ({counts.total || 0})
          </button>
          {STATUSES.map((st) => (
            <button
              key={st.key}
              onClick={() => setSelectedStatusTab(st.key)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedStatusTab === st.key
                  ? "bg-slate-950 text-white shadow-xs"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {st.label} ({counts[st.key] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Main Leads List */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
          <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-500">Loading prospective warriors...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
          <Flame className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <h3 className="font-bold text-gray-900 text-base">No Leads Found</h3>
          <p className="text-xs text-gray-500 mt-1">
            {search ? "No leads matched your search query." : "No enquiries currently in this pipeline."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leads.map((lead) => {
            const statusConfig =
              STATUSES.find((s) => s.key === lead.status) || STATUSES[0];

            return (
              <div
                key={lead.id}
                className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-2xs flex flex-col justify-between hover:border-gray-300 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-black text-base text-gray-900">{lead.name}</h3>
                      <p className="text-xs text-gray-500 font-medium">{lead.phone}</p>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded-full border ${statusConfig.badge}`}
                    >
                      {lead.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                    <p className="flex items-center gap-1.5">
                      <strong className="text-gray-900 font-semibold">Goal:</strong>{" "}
                      {lead.interest || "General Fitness"}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <strong className="text-gray-900 font-semibold">Source:</strong>{" "}
                      <span className="capitalize">{lead.source}</span>
                    </p>
                    {lead.followUpDate && (
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>Follow-up: {formatDate(lead.followUpDate)}</span>
                      </p>
                    )}
                    {lead.notes && (
                      <p className="text-[11px] bg-gray-50 p-2 rounded-lg border border-gray-100 text-gray-700 italic mt-2">
                        &quot;{lead.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-2">
                  {/* Converted Member Link Check */}
                  {lead.convertedMember ? (
                    <Link
                      href={`/members/${lead.convertedMember.id}`}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition"
                    >
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      Warrior: {lead.convertedMember.name} ({lead.convertedMember.memberCode})
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openWhatsAppGreeting(lead)}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </button>
                      <button
                        onClick={() => handleConvertToMember(lead)}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Convert
                      </button>
                    </div>
                  )}

                  {/* Status Switcher Selector */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="font-semibold text-gray-400">Move status:</span>
                    <select
                      value={lead.status}
                      onChange={(e) =>
                        handleStatusChange(lead.id, e.target.value as Lead["status"])
                      }
                      className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                    >
                      {STATUSES.map((st) => (
                        <option key={st.key} value={st.key}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-950 text-white">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500" />
                Add New Enquiry
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Enquiry Source
                  </label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600"
                  >
                    <option value="walk-in">Walk-in</option>
                    <option value="referral">Member Referral</option>
                    <option value="social">Social Media / Ad</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Fitness Goal / Interest
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Weight Loss, PT"
                    value={formInterest}
                    onChange={(e) => setFormInterest(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={formFollowUpDate}
                  onChange={(e) => setFormFollowUpDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Notes / Staff Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes from walk-in conversation, requested discount, trial preference"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-900/20 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Create Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
