import React from "react";
import { formatPaise } from "@/lib/money";

interface MoneyTextProps {
  paise: number;
  className?: string;
  showDecimals?: boolean;
}

export function MoneyText({ paise, className = "", showDecimals = false }: MoneyTextProps) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      {formatPaise(paise, showDecimals)}
    </span>
  );
}

