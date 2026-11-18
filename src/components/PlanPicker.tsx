"use client";

import React, { useEffect, useState } from "react";
import { formatPaise } from "@/lib/money";
import { addDays, formatDate, getStartOfDay } from "@/lib/dates";

export interface PlanOption {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  admissionFee?: number;
  taxPercent: number;
  isActive: boolean;
}

interface PlanPickerProps {
  selectedPlanId?: string;
  startDate?: string | Date;
  onChange: (plan: PlanOption) => void;
  showAdmissionFee?: boolean;
  className?: string;
}

export function PlanPicker({
  selectedPlanId,
  startDate = new Date(),
  onChange,
  showAdmissionFee = true,
  className = "",
}: PlanPickerProps) {
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plans")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setPlans(data.data);
          // If no plan selected, default to the first plan
          if (!selectedPlanId && data.data.length > 0) {
            onChange(data.data[0]);
          }
        }
      })
      .catch((err) => console.error("Error loading plans:", err))
      .finally(() => setLoading(false));
  }, []);

  const start = startDate ? getStartOfDay(startDate) : getStartOfDay(new Date());

  if (loading) {
    return <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />;
  }

  if (plans.length === 0) {
    return (
      <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
        No membership plans available. Please create a plan in Settings/Plans first.
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Select Plan
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {plans.map((plan) => {
          const isSelected = plan.id === selectedPlanId;
          const calculatedEnd = addDays(start, plan.durationDays);

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onChange(plan)}
              className={`p-3 text-left rounded-2xl border transition-all ${
                isSelected
                  ? "border-red-600 bg-red-50/50 ring-2 ring-red-600/20 shadow-xs"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-gray-900">{plan.name}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{plan.durationDays} days</p>
                  {showAdmissionFee && plan.admissionFee && plan.admissionFee > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/80 border border-amber-300 px-1.5 py-0.5 rounded-md mt-1.5">
                      + {formatPaise(plan.admissionFee)} Admission
                    </span>
                  ) : null}
                </div>
                <div className="text-right">
                  <span className="font-black text-sm text-red-600">
                    {formatPaise(plan.price)}
                  </span>
                  {showAdmissionFee && plan.admissionFee && plan.admissionFee > 0 ? (
                    <span className="block text-[10px] text-gray-400 font-medium">
                      + admission
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span>Ends on:</span>
                <span className="font-medium text-gray-600">{formatDate(calculatedEnd)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

