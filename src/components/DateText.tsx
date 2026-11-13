import React from "react";
import { formatDate, formatDateTime, formatTime } from "@/lib/dates";

interface DateTextProps {
  date: Date | string | null | undefined;
  type?: "date" | "time" | "datetime";
  className?: string;
}

export function DateText({ date, type = "date", className = "" }: DateTextProps) {
  if (!date) return <span className={`text-gray-400 ${className}`}>—</span>;

  let text = "";
  if (type === "time") text = formatTime(date);
  else if (type === "datetime") text = formatDateTime(date);
  else text = formatDate(date);

  return <span className={className}>{text}</span>;
}

