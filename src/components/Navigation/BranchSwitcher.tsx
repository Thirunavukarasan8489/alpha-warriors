"use client";

import React, { useState, useEffect } from "react";
import { Building2, ChevronDown } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  isDefault: boolean;
}

interface BranchSwitcherProps {
  userRole?: string;
  onBranchChange?: (branchId: string, branchName: string) => void;
}

export function BranchSwitcher({ userRole = "owner", onBranchChange }: BranchSwitcherProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const isOwner = userRole === "owner";

  useEffect(() => {
    fetch("/api/branches?activeOnly=true")
      .then((res) => res.json())
      .then((res) => {
        if (res.data) {
          setBranches(res.data);
          const savedBranchId = localStorage.getItem("alpha_active_branch_id");
          if (savedBranchId && (savedBranchId === "" || res.data.some((b: Branch) => b.id === savedBranchId))) {
            setSelectedBranchId(savedBranchId);
            const found = res.data.find((b: Branch) => b.id === savedBranchId);
            onBranchChange?.(savedBranchId, found ? found.name : "All Branches");
          } else {
            // Default: All branches for owner, or first branch for others
            if (isOwner) {
              setSelectedBranchId("");
              onBranchChange?.("", "All Branches");
            } else if (res.data.length > 0) {
              setSelectedBranchId(res.data[0].id);
              onBranchChange?.(res.data[0].id, res.data[0].name);
            }
          }
        }
      })
      .catch((err) => console.error("Error loading branches for switcher:", err));
  }, [isOwner]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedBranchId(val);
    localStorage.setItem("alpha_active_branch_id", val);
    const branchName = val === "" ? "All Branches" : branches.find((b) => b.id === val)?.name || "Branch";
    onBranchChange?.(val, branchName);
    window.dispatchEvent(new CustomEvent("branchChanged", { detail: { branchId: val, branchName } }));
  };

  if (branches.length === 0) return null;

  return (
    <div className="relative inline-flex items-center">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100/90 border border-gray-200 text-xs font-semibold text-gray-800 hover:bg-gray-200/70 transition shadow-2xs">
        <Building2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
        <select
          value={selectedBranchId}
          onChange={handleChange}
          className="bg-transparent border-none text-xs font-bold text-gray-800 focus:outline-none cursor-pointer pr-4 appearance-none"
        >
          {isOwner && <option value="">All Branches</option>}
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.isDefault ? "(Primary)" : ""}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 text-gray-500 pointer-events-none -ml-3" />
      </div>
    </div>
  );
}
