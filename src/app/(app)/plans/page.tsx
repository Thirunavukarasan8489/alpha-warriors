"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, Layers, Check, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { SkeletonList } from "@/components/Skeleton";
import { MoneyText } from "@/components/MoneyText";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatPaise, rupeesToPaise } from "@/lib/money";
import { useToast } from "@/components/Toast";

interface PlanItem {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  admissionFee?: number;
  taxPercent: number;
  sessions?: number;
  isActive: boolean;
}

export default function PlansPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [showCustomAdmissionFee, setShowCustomAdmissionFee] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    durationDays: 30,
    priceRupees: "",
    admissionFeeRupees: "",
    taxPercent: 18,
    sessions: "",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete state
  const [planToDelete, setPlanToDelete] = useState<PlanItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/plans?includeInactive=true");
      const json = await res.json();
      if (json.data) {
        setPlans(json.data);
      }
    } catch (err: unknown) {
      toast("Error loading plans", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const openAddModal = () => {
    setEditingPlan(null);
    setShowCustomAdmissionFee(false);
    setFormData({
      name: "",
      durationDays: 30,
      priceRupees: "",
      admissionFeeRupees: "",
      taxPercent: 18,
      sessions: "",
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (plan: PlanItem) => {
    setEditingPlan(plan);
    setShowCustomAdmissionFee(Boolean(plan.admissionFee && plan.admissionFee > 0));
    setFormData({
      name: plan.name,
      durationDays: plan.durationDays,
      priceRupees: (plan.price / 100).toString(),
      admissionFeeRupees: plan.admissionFee ? (plan.admissionFee / 100).toString() : "",
      taxPercent: plan.taxPercent,
      sessions: plan.sessions ? plan.sessions.toString() : "",
      isActive: plan.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const pricePaise = rupeesToPaise(formData.priceRupees);
      const isOneMonthPlan = formData.durationDays === 30 || formData.name.toLowerCase().includes("month");
      const admissionFeePaise = (isOneMonthPlan || showCustomAdmissionFee) && formData.admissionFeeRupees
        ? rupeesToPaise(formData.admissionFeeRupees)
        : 0;

      const payload = {
        name: formData.name,
        durationDays: Number(formData.durationDays),
        price: pricePaise,
        admissionFee: admissionFeePaise,
        taxPercent: Number(formData.taxPercent),
        sessions: formData.sessions ? Number(formData.sessions) : undefined,
        isActive: formData.isActive,
      };

      const url = editingPlan ? `/api/plans/${editingPlan.id}` : "/api/plans";
      const method = editingPlan ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to save plan");
      }

      toast(editingPlan ? "Plan updated!" : "Plan created!", "success");
      setShowModal(false);
      loadPlans();
    } catch (err: unknown) {
      toast((err as Error).message || "Error saving plan", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (plan: PlanItem) => {
    try {
      const res = await fetch(`/api/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to toggle plan");

      toast(plan.isActive ? "Plan deactivated" : "Plan activated", "info");
      loadPlans();
    } catch (err: unknown) {
      toast((err as Error).message || "Error", "error");
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/plans/${planToDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete plan");

      if (json.data?.deactivated) {
        toast("Plan is tied to existing memberships; deactivated instead of deleted.", "info");
      } else {
        toast("Plan deleted successfully!", "success");
      }

      setPlanToDelete(null);
      loadPlans();
    } catch (err: unknown) {
      toast((err as Error).message || "Delete error", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
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
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Membership Plans</h1>
            <p className="text-xs text-gray-500">Configure subscription packages and pricing tiers</p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Plan</span>
        </button>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <SkeletonList count={3} />
      ) : plans.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 space-y-3">
          <Layers className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="font-bold text-gray-900">No membership plans created</h3>
          <p className="text-xs text-gray-500">Add packages such as Monthly, Quarterly, or Yearly.</p>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl"
          >
            Create First Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition flex flex-col justify-between ${
                p.isActive ? "border-gray-200/80" : "border-gray-200 bg-gray-50/70 opacity-70"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900">{p.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{p.durationDays} Days Duration</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-gray-100 text-gray-600 border border-gray-300"
                    }`}
                  >
                    {p.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-red-600">
                      <MoneyText paise={p.price} />
                    </span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      Incl. {p.taxPercent}% GST
                    </span>
                  </div>

                  {p.sessions && (
                    <span className="text-xs font-semibold text-gray-600 bg-red-50 px-2.5 py-1 rounded-lg">
                      {p.sessions} PT Sessions
                    </span>
                  )}
                </div>

                {p.admissionFee && p.admissionFee > 0 ? (
                  <div className="mt-2.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-semibold text-amber-800 text-[11px]">One-Time Admission Fee:</span>
                    <span className="font-black text-amber-900">+{formatPaise(p.admissionFee)}</span>
                  </div>
                ) : null}
              </div>

              {/* Action buttons */}
              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(p)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-900"
                >
                  {p.isActive ? "Deactivate" : "Activate"}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(p)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                    title="Edit Plan"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlanToDelete(p)}
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingPlan ? "Edit Plan" : "Create New Plan"}
        subtitle="Define plan duration, price and terms"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Plan Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Monthly, 3 Months, Annual Pro"
              required
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Duration (Days) *
              </label>
              <input
                type="number"
                min="1"
                value={formData.durationDays}
                onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
              />
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {[
                  { d: 1, label: "1 Day" },
                  { d: 7, label: "1 Week" },
                  { d: 30, label: "1 Month" },
                  { d: 90, label: "3 Mo" },
                  { d: 180, label: "6 Mo" },
                  { d: 365, label: "1 Yr" },
                ].map((item) => (
                  <button
                    key={item.d}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        durationDays: item.d,
                        name:
                          prev.name === "" ||
                          [
                            "One Day Plan",
                            "Weekly Plan",
                            "One Month Plan",
                            "3 Months Plan",
                            "6 Months Plan",
                            "1 Year Plan",
                          ].includes(prev.name)
                            ? item.d === 1
                              ? "One Day Plan"
                              : item.d === 7
                              ? "Weekly Plan"
                              : item.d === 30
                              ? "One Month Plan"
                              : item.d === 90
                              ? "3 Months Plan"
                              : item.d === 180
                              ? "6 Months Plan"
                              : "1 Year Plan"
                            : prev.name,
                      }));
                    }}
                    className={`px-2 py-1 text-[11px] rounded-lg font-bold transition ${
                      formData.durationDays === item.d
                        ? "bg-red-600 text-white shadow-2xs"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Price (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  value={formData.priceRupees}
                  onChange={(e) => setFormData({ ...formData, priceRupees: e.target.value })}
                  placeholder="1500"
                  required
                  className="w-full pl-7 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Admission Fee: By default shown for 1 Month plan (30 days or month in name) */}
          {formData.durationDays === 30 ||
          formData.name.toLowerCase().includes("month") ||
          showCustomAdmissionFee ? (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                  Admission Fee (₹)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wide bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md">
                    {formData.durationDays === 30 ? "Default for One Month Plan" : "Enrollment Fee"}
                  </span>
                  {formData.durationDays !== 30 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomAdmissionFee(false);
                        setFormData({ ...formData, admissionFeeRupees: "" });
                      }}
                      className="text-[10px] text-amber-800 hover:text-red-700 underline font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-700 font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  value={formData.admissionFeeRupees}
                  onChange={(e) =>
                    setFormData({ ...formData, admissionFeeRupees: e.target.value })
                  }
                  placeholder="e.g. 500"
                  className="w-full pl-8 pr-3.5 py-2.5 text-sm bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-gray-900 shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-amber-800/90 leading-tight">
                One-time admission fee collected from new members when they first enroll with this plan.
              </p>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowCustomAdmissionFee(true)}
                className="text-xs text-amber-700 hover:text-amber-800 font-bold hover:underline"
              >
                + Add Admission Fee to this plan
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                GST Tax %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.taxPercent}
                onChange={(e) => setFormData({ ...formData, taxPercent: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                PT Sessions (Optional)
              </label>
              <input
                type="number"
                min="0"
                value={formData.sessions}
                onChange={(e) => setFormData({ ...formData, sessions: e.target.value })}
                placeholder="e.g. 12"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="plan-active"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
            />
            <label htmlFor="plan-active" className="text-xs text-gray-700 font-semibold cursor-pointer">
              Plan is Active (can be sold to members)
            </label>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition touch-manipulation cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editingPlan ? "Update Plan" : "Create Plan"}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete / Deactivate Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!planToDelete}
        title="Delete Plan"
        message={`Are you sure you want to remove "${planToDelete?.name}"? If any member has purchased this plan, it will be deactivated to preserve historical data.`}
        confirmLabel="Confirm Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setPlanToDelete(null)}
      />
    </div>
  );
}

