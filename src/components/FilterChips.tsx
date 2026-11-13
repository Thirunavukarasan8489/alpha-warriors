"use client";

import React from "react";

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  options: FilterOption[];
  selectedId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function FilterChips({
  options,
  selectedId,
  onChange,
  className = "",
}: FilterChipsProps) {
  return (
    <div
      className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-sm select-none ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.id === selectedId;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full font-medium text-xs sm:text-sm transition-all flex items-center gap-1.5 shrink-0 ${
              isSelected
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200"
            }`}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected
                    ? "bg-white/20 text-white font-bold"
                    : "bg-gray-100 text-gray-600 font-semibold"
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

