"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Shield,
  Phone,
  Mail,
  KeyRound,
  CheckCircle2,
  Copy,
  Send,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";

export default function NewStaffPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    role: "receptionist",
  });
  const [submitting, setSubmitting] = useState(false);

  // Success One-Time Password State
  const [createdStaff, setCreatedStaff] = useState<{
    name: string;
    phone: string;
    role: string;
    oneTimePassword: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to create staff account");
      }

      setCreatedStaff(json.data);
      toast("Staff account created successfully!", "success");
    } catch (err: any) {
      toast(err.message || "An error occurred", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPassword = () => {
    if (!createdStaff) return;
    navigator.clipboard.writeText(createdStaff.oneTimePassword);
    toast("Password copied to clipboard!", "success");
  };

  const handleShareWhatsApp = () => {
    if (!createdStaff) return;
    const cleanPhone = createdStaff.phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

    const message = `Welcome to the Alpha Warriors team, ${createdStaff.name}! Your staff account has been created.
Role: ${createdStaff.role.toUpperCase()}
Login Phone: ${createdStaff.phone}
Temporary Password: ${createdStaff.oneTimePassword}

Please sign in at ${window.location.origin}/login and change your password in Settings.`;

    const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
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
            Add Staff Member
          </h1>
          <p className="text-xs text-gray-500">
            Create staff credentials and set operational authorization
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ramesh Kumar"
              required
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Mobile Phone Number (Login ID) *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="10-digit mobile number"
              required
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. ramesh@alphawarriors.in"
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Assigned Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
            >
              <option value="receptionist">Receptionist (Front desk, check-ins, payments)</option>
              <option value="trainer">Trainer (Trainee clients, PT sessions only)</option>
              <option value="manager">Manager (Branch operations, voiding, reports)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/staff"
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            {submitting ? "Creating Account..." : "Create Staff Account"}
          </button>
        </div>
      </form>

      {/* One-Time Password Success Modal */}
      {createdStaff && (
        <Modal
          isOpen={true}
          onClose={() => {
            setCreatedStaff(null);
            router.push("/staff");
          }}
          title="Staff Account Created!"
          subtitle="Share the one-time temporary password with the staff member."
        >
          <div className="space-y-5">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 leading-relaxed">
              <strong>Security Notice:</strong> This password is shown only once now. The staff
              member should sign in and update their password in Account Settings.
            </div>

            <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Staff Member:</span>
                <span className="font-bold text-white">{createdStaff.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Phone (Login ID):</span>
                <span className="font-mono font-bold text-white">{createdStaff.phone}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Role:</span>
                <span className="capitalize font-bold text-red-400">{createdStaff.role}</span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    One-Time Password
                  </span>
                  <p className="text-xl font-mono font-black text-emerald-400 tracking-wider">
                    {createdStaff.oneTimePassword}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send via WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreatedStaff(null);
                  router.push("/staff");
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
