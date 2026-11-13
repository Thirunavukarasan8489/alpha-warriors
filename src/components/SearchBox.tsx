"use client";

import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

interface SearchBoxProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBox({
  value,
  onChange,
  placeholder = "Search name, phone, or code...",
  className = "",
}: SearchBoxProps) {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localVal !== value) {
        onChange(localVal);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [localVal, value, onChange]);

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent placeholder-gray-400 shadow-sm transition"
      />
      {localVal && (
        <button
          type="button"
          onClick={() => {
            setLocalVal("");
            onChange("");
          }}
          className="absolute right-3 p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

