"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  KeyRound,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  Copy,
  Send,
  UserX,
  UserCheck,
  Loader2,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";

export default function StaffDetailPage() {
  const params = useParams();
  const staffId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [staff, setStaff] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit fields
  const [name, setName] = useState("");
  const [role, setRole] = useState("receptionist");
  const [isActive, setIsActive] = useState(true);

  // Reset password state
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const loadStaff = async () => {
    try {
      const res = await fetch(`/api/staff/${staffId}`);
      const json = await res.json();
      if (json.data) {
        setStaff(json.data);
        setName(json.data.name);
        setRole(json.data.role);
        setIsActive(json.data.isActive);
      }
    } catch (err) {
      toast("Failed to load staff details", "error");
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
  }, [staffId]);

  const canDelete =
    currentUser &&
    (currentUser.role === "owner" || currentUser.role === "manager") &&
    staff &&
    staff.role !== "owner" &&
    staff.id !== currentUser.id &&
    !(currentUser.role === "manager" && staff.role === "manager");

  const handleDeleteStaff = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/staff/${staffId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete staff member");
      toast(`Staff account ${staff.name} deleted successfully`, "info");
      router.push("/staff");
    } catch (err: any) {
      toast(err.message || "Failed to delete staff member", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, isActive }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update staff member");

      toast("Staff details updated!", "success");
      loadStaff();
    } catch (err: any) {
      toast(err.message || "An error occurred", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    setResetting(true);
    try {
      const res = await fetch(`/api/staff/${staffId}/reset-password`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to reset password");

      setNewPassword(json.data.oneTimePassword);
      toast("Temporary password generated!", "success");
    } catch (err: any) {
      toast(err.message || "Failed to reset password", "error");
    } finally {
      setResetting(false);
    }
  };

  const handleShareReset = () => {
    if (!newPassword || !staff) return;
    const cleanPhone = staff.phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

    const message = `Hello ${staff.name}, your Alpha Warriors staff password has been reset.
Temporary Password: ${newPassword}

Sign in at ${window.location.origin}/login and change your password in Settings.`;

    const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return <div className="h-64 bg-white rounded-2xl animate-pulse" />;
  }

  if (!staff) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
        <h2 className="font-bold text-gray-900">Staff member not found</h2>
        <Link href="/staff" className="text-red-600 font-bold text-xs mt-2 inline-block">
          &larr; Back to Staff List
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/staff"
          className="p-2 rounded-xl text-gray-500 hover:text-gray-900 bg-white border border-gray-200 shadow-2xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Manage Staff Member
          </h1>
          <p className="text-xs text-gray-500">Edit access permissions and credentials</p>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={staff.phone}
              disabled
              className="w-full px-3.5 py-2.5 text-sm bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed font-mono"
            />
            <span className="text-[10px] text-gray-400">Phone number acts as primary login ID</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={
                staff.role === "owner" ||
                (currentUser?.role === "manager" && staff.role === "manager")
              }
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {staff.role === "owner" && <option value="owner">Gym Owner</option>}
              <option value="receptionist">Receptionist (Front desk, check-ins, payments)</option>
              <option value="trainer">Trainer (Trainee clients, PT sessions)</option>
              {currentUser?.role === "owner" && (
                <option value="manager">Manager (Branch operations, reports, voiding)</option>
              )}
            </select>
          </div>

          {staff.role !== "owner" && (
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-900">Account Access</p>
                <p className="text-[11px] text-gray-400">
                  {isActive ? "Staff member can sign in" : "Sign-in blocked"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {isActive ? "Deactivate Account" : "Activate Account"}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 relative z-10">
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={resetting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {resetting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
            ) : (
              <KeyRound className="w-3.5 h-3.5 text-red-500" />
            )}
            <span>{resetting ? "Resetting..." : "Reset Password"}</span>
          </button>

          <div className="flex items-center gap-2">
            <Link
              href="/staff"
              className="flex-1 sm:flex-none px-4 py-2.5 text-center text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Danger Zone: Delete Staff Account */}
      {canDelete && (
        <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-rose-800">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <h3 className="text-sm font-bold">Danger Zone</h3>
          </div>
          <p className="text-xs text-rose-700 leading-relaxed">
            Permanently delete this staff account. Once deleted, this staff member will no longer be able to sign in or perform gym actions.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Staff Member</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirm Staff Deletion Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Staff Account"
        message={`Are you sure you want to permanently delete the staff account for "${staff?.name}" (${staff?.role})? This action will immediately revoke their access and cannot be undone.`}
        confirmLabel="Delete Account"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteStaff}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Password Reset Modal */}
      {newPassword && (
        <Modal
          isOpen={true}
          onClose={() => setNewPassword(null)}
          title="Password Reset Successful"
          subtitle="A new one-time temporary password was generated."
        >
          <div className="space-y-4">
            <div className="bg-slate-900 text-white rounded-2xl p-4 text-center space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                New Temporary Password
              </span>
              <p className="text-2xl font-mono font-black text-emerald-400 tracking-wider">
                {newPassword}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleShareReset}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send to Staff (WhatsApp)</span>
              </button>

              <button
                type="button"
                onClick={() => setNewPassword(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
