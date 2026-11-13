import React from "react";
import { MemberDisplayStatus, STATUS_CONFIG } from "@/lib/status";

interface StatusBadgeProps {
  status: MemberDisplayStatus | string;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, className = "", size = "md" }: StatusBadgeProps) {
  const normalized = (status as MemberDisplayStatus) in STATUS_CONFIG
    ? (status as MemberDisplayStatus)
    : "no_plan";

  const config = STATUS_CONFIG[normalized];

  const sizeClasses = size === "sm"
    ? "px-2 py-0.5 text-xs font-medium"
    : "px-2.5 py-1 text-xs font-semibold";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${sizeClasses} ${config.colorClass} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          config.variant === "success"
            ? "bg-emerald-500"
            : config.variant === "warning"
            ? "bg-amber-500"
            : config.variant === "danger"
            ? "bg-rose-500"
            : config.variant === "info"
            ? "bg-blue-500"
            : "bg-gray-400"
        }`}
      />
      {config.label}
    </span>
  );
}

