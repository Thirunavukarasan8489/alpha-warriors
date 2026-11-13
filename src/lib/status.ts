/**
 * Single source of truth for member and membership statuses.
 */
import { getStartOfDay, diffInDays } from "./dates";

export type StoredMembershipStatus = "active" | "expired" | "frozen" | "ended";
export type MemberDisplayStatus =
  | "active"
  | "expiring"
  | "expired"
  | "frozen"
  | "ended"
  | "no_plan";

export interface StatusBadgeConfig {
  label: string;
  variant: "success" | "warning" | "danger" | "info" | "neutral";
  colorClass: string;
}

export const STATUS_CONFIG: Record<MemberDisplayStatus, StatusBadgeConfig> = {
  active: {
    label: "Active",
    variant: "success",
    colorClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
  },
  expiring: {
    label: "Expiring Soon",
    variant: "warning",
    colorClass: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
  },
  expired: {
    label: "Expired",
    variant: "danger",
    colorClass: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
  },
  frozen: {
    label: "Frozen",
    variant: "info",
    colorClass: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
  },
  ended: {
    label: "Ended",
    variant: "neutral",
    colorClass: "bg-slate-100 text-slate-700 ring-1 ring-slate-600/20",
  },
  no_plan: {
    label: "No Plan",
    variant: "neutral",
    colorClass: "bg-gray-100 text-gray-600 ring-1 ring-gray-500/20",
  },
};

/**
 * Check if a membership is considered expired when reading.
 * An active membership whose end date is before today is treated as expired.
 */
export function resolveEffectiveMembershipStatus(
  storedStatus: StoredMembershipStatus,
  endDate: Date | string
): StoredMembershipStatus {
  if (storedStatus === "active") {
    const end = new Date(endDate);
    const todayStart = getStartOfDay(new Date());
    if (end < todayStart) {
      return "expired";
    }
  }
  return storedStatus;
}

/**
 * Check if an active membership is ending within expiringSoonDays (default 7)
 */
export function isExpiringSoon(
  endDate: Date | string,
  expiringSoonDays: number = 7
): boolean {
  const daysLeft = diffInDays(endDate, getStartOfDay(new Date()));
  return daysLeft >= 0 && daysLeft <= expiringSoonDays;
}

/**
 * Determine a member's display status from their latest membership.
 */
export function calculateMemberDisplayStatus(
  latestMembership?: {
    status: StoredMembershipStatus;
    endDate: Date | string;
  } | null,
  expiringSoonDays: number = 7
): MemberDisplayStatus {
  if (!latestMembership) {
    return "no_plan";
  }

  const effectiveStatus = resolveEffectiveMembershipStatus(
    latestMembership.status,
    latestMembership.endDate
  );

  if (effectiveStatus === "frozen") return "frozen";
  if (effectiveStatus === "ended") return "ended";
  if (effectiveStatus === "expired") return "expired";

  if (effectiveStatus === "active") {
    if (isExpiringSoon(latestMembership.endDate, expiringSoonDays)) {
      return "expiring";
    }
    return "active";
  }

  return "no_plan";
}

