"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Shield,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  KeyRound,
  MoreVertical,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  Loader2,
  Trash2,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { SkeletonList } from "@/components/Skeleton";

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: "owner" | "manager" | "receptionist" | "trainer";
  isActive: boolean;
  branches: { id: string; name: string }[];
  createdAt: string;
}

export default function StaffListPage() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff");
      const json = await res.json();
      if (json.data) {
        setStaff(json.data);
      }
    } catch (err) {
      toast("Failed to load staff team", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((d) => d.data?.user && setCurrentUser({ id: d.data.user.id, role: d.data.user.role }))
      .catch(() => {});
  }, []);

  const canDeleteStaff = (target: StaffMember) => {
    if (!currentUser) return false;
    if (currentUser.role !== "owner" && currentUser.role !== "manager") return false;
    if (target.role === "owner") return false; // Cannot delete gym owner
    if (target.id === currentUser.id) return false; // Cannot delete self
    if (currentUser.role === "manager" && target.role === "manager") return false; // Manager cannot delete another manager
    return true;
  };

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/staff/${staffToDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete staff account");
      toast(`Staff member ${staffToDelete.name} deleted successfully!`, "success");
      setStaffToDelete(null);
      loadStaff();
    } catch (err: any) {
      toast(err.message || "Failed to delete staff member", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    if (member.role === "owner" || togglingId) {
      if (member.role === "owner") {
        toast("The gym owner account cannot be deactivated.", "error");
      }
      return;
    }

    setTogglingId(member.id);
    try {
      const res = await fetch(`/api/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !member.isActive }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update status");
      }

      toast(
        member.isActive
          ? `${member.name} deactivated`
          : `${member.name} activated`,
        "success"
      );
      setStaff((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, isActive: !s.isActive } : s))
      );
    } catch (err: any) {
      toast(err.message || "Failed to update staff status", "error");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-red-600" />
            Staff & Access Management
          </h1>
          <p className="text-xs text-gray-500">
            Create logins, assign operational roles, and manage front-desk permissions
          </p>
        </div>

        <Link
          href="/staff/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </Link>
      </div>

      {/* Staff List */}
      {loading ? (
        <SkeletonList count={3} />
      ) : staff.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6 text-red-600" />}
          title="No staff members registered"
          description="Add managers, receptionists, or trainers to help run the front desk and floor."
          action={{
            label: "Add First Staff Member",
            onClick: () => (window.location.href = "/staff/new"),
          }}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
          {/* Mobile Cards */}
          <div className="divide-y divide-gray-100 md:hidden">
            {staff.map((u) => (
              <div key={u.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{u.name}</h3>
                      <p className="text-[11px] text-gray-400 font-mono">{u.phone}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      u.role === "owner"
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : u.role === "manager"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : u.role === "trainer"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {u.role}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                  <span
                    className={`font-semibold text-[11px] ${
                      u.isActive ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {u.isActive ? "● Active Account" : "○ Deactivated"}
                  </span>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/staff/${u.id}`}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-[11px] transition"
                    >
                      Manage
                    </Link>
                    {canDeleteStaff(u) && (
                      <button
                        type="button"
                        onClick={() => setStaffToDelete(u)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Staff Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Phone / Email</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {staff.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{u.name}</p>
                          {u.branches && u.branches.length > 0 && (
                            <p className="text-[10px] text-gray-400">
                              {u.branches.map((b) => b.name).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          u.role === "owner"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : u.role === "manager"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : u.role === "trainer"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-mono text-gray-900">{u.phone}</p>
                      {u.email && <p className="text-[11px] text-gray-400">{u.email}</p>}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u)}
                        disabled={u.role === "owner" || togglingId === u.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition disabled:opacity-50 touch-manipulation cursor-pointer ${
                          u.role === "owner"
                            ? "cursor-default bg-emerald-50 text-emerald-700"
                            : u.isActive
                            ? "bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-700"
                            : "bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                        title={u.role === "owner" ? "Owner account cannot be modified" : "Click to toggle active status"}
                      >
                        {togglingId === u.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : null}
                        {u.isActive ? "Active" : "Deactivated"}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/staff/${u.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-700 font-bold rounded-xl transition text-[11px]"
                        >
                          <span>Manage</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                        {canDeleteStaff(u) && (
                          <button
                            type="button"
                            onClick={() => setStaffToDelete(u)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Delete Staff Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Staff Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!staffToDelete}
        title="Delete Staff Account"
        message={`Are you sure you want to permanently delete the staff account for ${staffToDelete?.name} (${staffToDelete?.role})? This will revoke all their login access and credentials immediately.`}
        confirmLabel="Delete Staff"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteStaff}
        onCancel={() => setStaffToDelete(null)}
      />
    </div>
  );
}
