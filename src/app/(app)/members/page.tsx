"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { SearchBox } from "@/components/SearchBox";
import { FilterChips, FilterOption } from "@/components/FilterChips";
import { MemberCard, MemberListItem } from "@/components/MemberCard";
import { StatusBadge } from "@/components/StatusBadge";
import { MoneyText } from "@/components/MoneyText";
import { DateText } from "@/components/DateText";
import { ShareButton } from "@/components/ShareButton";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { PlanPicker, PlanOption } from "@/components/PlanPicker";
import { useToast } from "@/components/Toast";
import { SkeletonList } from "@/components/Skeleton";
import {
  UserPlus,
  Users,
  Phone,
  RefreshCw,
  ArrowUpDown,
  PhoneCall,
  Loader2,
} from "lucide-react";

function MembersListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";
  const initialSort = searchParams.get("sort") || "name";

  const { toast } = useToast();

  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [sortBy, setSortBy] = useState(initialSort);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Quick Renew Modal state
  const [renewingMember, setRenewingMember] = useState<MemberListItem | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null);
  const [isRenewing, setIsRenewing] = useState(false);

  const statusOptions: FilterOption[] = [
    { id: "all", label: "All Members" },
    { id: "active", label: "Active" },
    { id: "expiring", label: "Expiring (7d)" },
    { id: "expired", label: "Expired" },
    { id: "dues", label: "Dues Pending" },
    { id: "frozen", label: "Frozen" },
    { id: "no_plan", label: "No Plan" },
  ];

  const fetchMembers = async (currentPage = 1, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (sortBy) params.set("sort", sortBy);
      params.set("page", currentPage.toString());
      params.set("limit", "25");

      const res = await fetch(`/api/members?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load members");

      if (append) {
        setMembers((prev) => [...prev, ...json.data]);
      } else {
        setMembers(json.data);
      }
      setTotalPages(json.pagination.totalPages);
      setPage(currentPage);
    } catch (err: unknown) {
      toast((err as Error).message || "Error fetching members", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers(1, false);
    // Sync URL
    const url = new URL(window.location.href);
    if (statusFilter && statusFilter !== "all") {
      url.searchParams.set("status", statusFilter);
    } else {
      url.searchParams.delete("status");
    }
    if (sortBy && sortBy !== "name") {
      url.searchParams.set("sort", sortBy);
    } else {
      url.searchParams.delete("sort");
    }
    window.history.replaceState({}, "", url.toString());
  }, [search, statusFilter, sortBy]);

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingMember || !selectedPlan) return;

    setIsRenewing(true);
    try {
      const res = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: renewingMember.id,
          planId: selectedPlan.id,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Renewal failed");

      toast("Membership renewed successfully!", "success");
      setRenewingMember(null);
      fetchMembers(1, false);
    } catch (err: unknown) {
      toast((err as Error).message || "Renewal error", "error");
    } finally {
      setIsRenewing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Members</h1>
          <p className="text-xs text-gray-500">Directory of registered gym athletes</p>
        </div>

        <Link
          href="/members/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Member</span>
        </Link>
      </div>

      {/* Controls: Search and Sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="flex-1">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search by name, phone or code..."
          />
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-1.5 shrink-0 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-2xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs font-semibold bg-transparent text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="name">Sort: Name (A-Z)</option>
            <option value="end_date">Sort: End Date</option>
            <option value="join_date">Sort: Join Date (Newest)</option>
            <option value="dues">Sort: Highest Dues</option>
          </select>
        </div>
      </div>

      {/* Filter Chips */}
      <FilterChips
        options={statusOptions}
        selectedId={statusFilter}
        onChange={setStatusFilter}
      />

      {/* Content: Cards on Mobile, Table on Desktop (>900px) */}
      {loading && members.length === 0 ? (
        <SkeletonList count={6} />
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title={search ? "No matching members found" : "No members yet"}
          description={
            search
              ? "Try adjusting your search or clear filters to see more members."
              : "Start adding gym members to track memberships, check-ins, and dues."
          }
          action={
            search
              ? {
                  label: "Clear Filters",
                  onClick: () => {
                    setSearch("");
                    setStatusFilter("all");
                  },
                }
              : {
                  label: "Add First Member",
                  onClick: () => router.push("/members/new"),
                }
          }
        />
      ) : (
        <>
          {/* Mobile Card Grid (<900px) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-3">
            {members.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                onRenew={(mem) => setRenewingMember(mem)}
              />
            ))}
          </div>

          {/* Desktop Table (>= 900px) */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Member</th>
                  <th className="py-3.5 px-4">Phone / Contact</th>
                  <th className="py-3.5 px-4">Current Plan</th>
                  <th className="py-3.5 px-4">End Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Pending Dues</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((m) => {
                  const canRenew = m.displayStatus === "expiring" || m.displayStatus === "expired";
                  return (
                    <tr
                      key={m.id}
                      onClick={() => router.push(`/members/${m.id}`)}
                      className="hover:bg-red-50/20 cursor-pointer transition"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0">
                            {m.photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.photo} alt={m.name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              m.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 hover:text-red-600 transition block">
                              {m.name}
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono font-medium">
                              {m.memberCode}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <span className="font-medium text-gray-700">{m.phone}</span>
                          <a
                            href={`tel:${m.phone}`}
                            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                            title="Call"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <ShareButton
                            phone={m.whatsapp || m.phone}
                            memberId={m.id}
                            variant="iconOnly"
                            className="p-1"
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-800">
                        {m.currentPlan || <span className="text-gray-400 font-normal">None</span>}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        <DateText date={m.endDate} />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={m.displayStatus} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        {m.dues > 0 ? (
                          <span className="text-rose-600 font-extrabold">
                            <MoneyText paise={m.dues} />
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium">₹0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {canRenew && (
                            <button
                              type="button"
                              onClick={() => setRenewingMember(m)}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-200 transition"
                            >
                              Renew
                            </button>
                          )}
                          <Link
                            href={`/members/${m.id}`}
                            className="px-2.5 py-1 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition"
                          >
                            Profile
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Load More on Phone / Pagination */}
          {page < totalPages && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => fetchMembers(page + 1, true)}
                disabled={loading}
                className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-2xs transition"
              >
                {loading ? "Loading..." : "Load More Members"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Quick Renew Modal */}
      {renewingMember && (
        <Modal
          isOpen={true}
          onClose={() => setRenewingMember(null)}
          title={`Renew Membership`}
          subtitle={`Renewing plan for ${renewingMember.name} (${renewingMember.memberCode})`}
        >
          <form onSubmit={handleRenewSubmit} className="space-y-4">
            <PlanPicker
              selectedPlanId={selectedPlan?.id}
              onChange={setSelectedPlan}
            />

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRenewingMember(null)}
                className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRenewing || !selectedPlan}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition touch-manipulation cursor-pointer"
              >
                {isRenewing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Renewing...</span>
                  </>
                ) : (
                  <span>Confirm Renewal</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function MembersListPage() {
  return (
    <Suspense fallback={<SkeletonList count={6} />}>
      <MembersListContent />
    </Suspense>
  );
}

