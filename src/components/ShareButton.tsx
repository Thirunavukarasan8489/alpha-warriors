"use client";

import React from "react";
import { MessageSquareShare } from "lucide-react";
import { buildShareLink } from "@/lib/whatsapp";

interface ShareButtonProps {
  phone: string;
  message?: string;
  memberId?: string;
  type?: "welcome" | "receipt" | "reminder_expiry" | "reminder_dues" | "reminder_absent" | "custom";
  label?: string;
  className?: string;
  variant?: "primary" | "secondary" | "iconOnly";
}

export function ShareButton({
  phone,
  message = "",
  memberId,
  type = "custom",
  label = "WhatsApp",
  className = "",
  variant = "secondary",
}: ShareButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Background log of message share without blocking WhatsApp open
    if (memberId) {
      fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, type }),
      }).catch((err) => console.error("Message log error:", err));
    }

    const shareUrl = buildShareLink(phone, message);
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  if (variant === "iconOnly") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={label}
        className={`p-2 rounded-xl text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition ${className}`}
        aria-label={label}
      >
        <MessageSquareShare className="w-4 h-4" />
      </button>
    );
  }

  const baseStyle =
    variant === "primary"
      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition ${baseStyle} ${className}`}
    >
      <MessageSquareShare className="w-4 h-4 shrink-0" />
      {label}
    </button>
  );
}

