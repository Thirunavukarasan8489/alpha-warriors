"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  ArrowLeft,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Edit2,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { SkeletonList } from "@/components/Skeleton";

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function BranchesPage() {
  const { showToast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadBranches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/branches");
      const data = await res.json();
      if (data.data) {
        setBranches(data.data);
      } else if (data.error) {
        showToast(data.error.message || "Failed to load branches", "error");
      }
    } catch {
      showToast("Network error loading branches", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const openAddModal = () => {
    setEditingBranch(null);
    setFormName("");
    setFormAddress("");
    setFormPhone("");
    setFormActive(true);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const openEditModal = (b: Branch) => {
    setEditingBranch(b);
    setFormName(b.name);
    setFormAddress(b.address);
    setFormPhone(b.phone);
    setFormActive(b.isActive);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg("Branch name is required");
      return;
    }

    setIsSaving(true);
    setErrorMsg("");

    try {
      if (editingBranch) {
        // Update
        const res = await fetch(`/api/branches/${editingBranch.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            address: formAddress.trim(),
            phone: formPhone.trim(),
            isActive: formActive,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          showToast("Branch updated successfully", "success");
          setIsModalOpen(false);
          loadBranches();
        } else {
          setErrorMsg(data.error?.message || "Failed to update branch");
        }
      } else {
        // Create
        const res = await fetch("/api/branches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            address: formAddress.trim(),
            phone: formPhone.trim(),
          }),
        });
        const data = await res.json();
        if (res.ok) {
          showToast("Branch created successfully", "success");
          setIsModalOpen(false);
          loadBranches();
        } else {
          setErrorMsg(data.error?.message || "Failed to create branch");
        }
      }
    } catch {
      setErrorMsg("An unexpected network error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (branch: Branch) => {
    if (branch.isDefault) {
      showToast("Cannot deactivate primary default branch", "warning");
      return;
    }

    const nextState = !branch.isActive;
    try {
      const res = await fetch(`/api/branches/${branch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextState }),
      });
      if (res.ok) {
        showToast(
          `Branch ${nextState ? "activated" : "deactivated"}`,
          "success"
        );
        loadBranches();
      } else {
        const data = await res.json();
        showToast(data.error?.message || "Action failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition shadow-2xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-red-600" />
              Branch Locations
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Manage multi-location gym branches and location-scoped access
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-900/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Branch
        </button>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-sm border border-slate-800 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm leading-relaxed text-slate-300">
          <strong className="text-white">Multi-Branch Scoping:</strong> Staff and managers are scoped strictly to their assigned locations. Use the branch switcher in the header to toggle between single-branch views or all-branch aggregate metrics.
        </div>
      </div>

      {/* Branches List */}
      {isLoading ? (
        <SkeletonList count={3} />
      ) : branches.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 text-base">No Branches Configured</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Add additional physical gym branches to enable multi-location tracking.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
            <div
              key={b.id}
              className={`p-5 rounded-2xl bg-white border transition shadow-xs flex flex-col justify-between ${
                b.isActive ? "border-gray-200/90" : "border-gray-200 bg-gray-50/60 opacity-75"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-gray-900 truncate">{b.name}</h3>
                      {b.isDefault && (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                          Primary
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold mt-1 px-2 py-0.5 rounded-full ${
                        b.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {b.isActive ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-gray-400" /> Inactive
                        </>
                      )}
                    </span>
                  </div>

                  <button
                    onClick={() => openEditModal(b)}
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
                    title="Edit Branch"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-2 text-xs text-gray-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                    <span>{b.address || "No address specified"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{b.phone || "No contact phone"}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                {!b.isDefault ? (
                  <button
                    onClick={() => handleToggleActive(b)}
                    className={`font-bold transition ${
                      b.isActive
                        ? "text-red-600 hover:text-red-700"
                        : "text-emerald-600 hover:text-emerald-700"
                    }`}
                  >
                    {b.isActive ? "Deactivate Branch" : "Activate Branch"}
                  </button>
                ) : (
                  <span className="text-[11px] text-gray-400 font-semibold italic">
                    Primary default location
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-950 text-white">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-red-500" />
                {editingBranch ? "Edit Branch" : "Add New Branch"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Indiranagar Club or Downtown"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Physical Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Building, street, area, city, pincode"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600"
                />
              </div>

              {editingBranch && !editingBranch.isDefault && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="branchActive"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded-sm text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <label htmlFor="branchActive" className="text-xs font-bold text-gray-700">
                    Active location (visible in branch switcher)
                  </label>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
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
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-red-900/20 transition touch-manipulation cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingBranch ? "Update Branch" : "Create Branch"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
