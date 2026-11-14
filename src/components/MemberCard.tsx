"use client";

import React from "react";
import Link from "next/link";
import { Phone, User, Calendar, CreditCard, RefreshCw, Trash2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { MoneyText } from "./MoneyText";
import { DateText } from "./DateText";
import { ShareButton } from "./ShareButton";

export interface MemberListItem {
  id: string;
  memberCode: string;
  name: string;
  phone: string;
  whatsapp?: string;
  photo?: string;
  trainerName?: string;
  currentPlan?: string | null;
  endDate?: Date | string | null;
  displayStatus: string;
  dues: number;
}

interface MemberCardProps {
  member: MemberListItem;
  onRenew?: (member: MemberListItem) => void;
  onDelete?: (member: MemberListItem) => void;
  className?: string;
}

export function MemberCard({ member, onRenew, onDelete, className = "" }: MemberCardProps) {
  const canRenew = member.displayStatus === "expiring" || member.displayStatus === "expired";

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs hover:shadow-md transition-all ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <Link href={`/members/${member.id}`} className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center overflow-hidden shrink-0 font-bold text-base shadow-xs">
            {member.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
            ) : (
              member.name.charAt(0).toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-gray-900 truncate hover:text-red-600 transition">
                {member.name}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
              <span className="font-mono font-medium text-gray-500">{member.memberCode}</span>
              <span>•</span>
              <span>{member.phone}</span>
            </div>
          </div>
        </Link>

        <StatusBadge status={member.displayStatus} size="sm" />
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-1.5 truncate">
          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate">
            {member.currentPlan ? (
              <>
                <span className="font-medium text-gray-700">{member.currentPlan}</span> (ends{" "}
                <DateText date={member.endDate} />)
              </>
            ) : (
              "No active plan"
            )}
          </span>
        </div>

        <div className="flex items-center justify-end gap-1.5 text-right">
          {member.dues > 0 ? (
            <span className="text-rose-600 font-bold flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" />
              Due: <MoneyText paise={member.dues} />
            </span>
          ) : (
            <span className="text-gray-400 text-[11px]">No pending dues</span>
          )}
        </div>
      </div>

      {/* Quick Action buttons */}
      <div className="mt-3 pt-2.5 border-t border-gray-50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <a
            href={`tel:${member.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-xl text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 transition"
            title="Call"
          >
            <Phone className="w-4 h-4" />
          </a>

          <ShareButton
            phone={member.whatsapp || member.phone}
            memberId={member.id}
            variant="iconOnly"
            label="WhatsApp"
          />
        </div>

        <div className="flex items-center gap-2">
          {canRenew && onRenew && (
            <button
              type="button"
              onClick={() => onRenew(member)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl border border-red-200 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Renew
            </button>
          )}

          <Link
            href={`/members/${member.id}`}
            className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition"
          >
            View
          </Link>

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(member)}
              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition"
              title="Delete Member"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

