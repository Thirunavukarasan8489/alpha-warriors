"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatPaise, rupeesToPaise } from "@/lib/money";

export interface SplitModeRow {
  mode: "cash" | "upi" | "card" | "bank" | "other";
  amount: number; // in paise
}

interface PaymentSplitRowsProps {
  totalTargetAmount?: number; // in paise
  totalPaise?: number; // alias in paise
  rows: SplitModeRow[];
  onChange: (newRows: SplitModeRow[]) => void;
  className?: string;
}

export function PaymentSplitRows({
  totalTargetAmount,
  totalPaise,
  rows,
  onChange,
  className = "",
}: PaymentSplitRowsProps) {
  const target = totalTargetAmount ?? totalPaise ?? 0;
  const currentSum = rows.reduce((acc, r) => acc + (r.amount || 0), 0);
  const remaining = target - currentSum;
  const isBalanced = remaining === 0;

  const handleModeChange = (index: number, mode: SplitModeRow["mode"]) => {
    const next = [...rows];
    next[index] = { ...next[index], mode };
    onChange(next);
  };

  const handleAmountChange = (index: number, rupeesStr: string) => {
    const paise = rupeesToPaise(rupeesStr);
    const next = [...rows];
    next[index] = { ...next[index], amount: paise };
    onChange(next);
  };

  const handleAddRow = () => {
    const availableModes: SplitModeRow["mode"][] = ["upi", "cash", "card", "bank", "other"];
    const usedModes = new Set(rows.map((r) => r.mode));
    const nextMode = availableModes.find((m) => !usedModes.has(m)) || "other";

    onChange([...rows, { mode: nextMode, amount: Math.max(0, remaining) }]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return;
    const next = rows.filter((_, i) => i !== index);
    onChange(next);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
        <span>Payment Mode Splits</span>
        <span className={isBalanced ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
          Total: {formatPaise(currentSum)} / {formatPaise(totalTargetAmount)}
        </span>
      </div>

      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <select
              value={row.mode}
              onChange={(e) => handleModeChange(idx, e.target.value as SplitModeRow["mode"])}
              className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
            >
              <option value="upi">UPI / GPay / PhonePe</option>
              <option value="cash">Cash</option>
              <option value="card">Debit / Credit Card</option>
              <option value="bank">Bank Transfer / NEFT</option>
              <option value="other">Other</option>
            </select>

            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={row.amount ? row.amount / 100 : ""}
                onChange={(e) => handleAmountChange(idx, e.target.value)}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
              />
            </div>

            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveRow(idx)}
                className="p-2 text-gray-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
                title="Remove mode"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        {rows.length < 4 && (
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Split across another mode
          </button>
        )}

        {!isBalanced && (
          <span className="text-xs text-rose-600 font-medium ml-auto">
            {remaining > 0
              ? `₹${remaining / 100} remaining to allocate`
              : `₹${Math.abs(remaining) / 100} over allocated`}
          </span>
        )}
      </div>
    </div>
  );
}

