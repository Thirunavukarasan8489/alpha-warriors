"use client";

import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ className = "", width, height }: SkeletonProps) {
  return (
    <div
      style={{ width, height }}
      className={`animate-pulse bg-gray-200/80 rounded-xl ${className}`}
    />
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-${count} gap-3 sm:gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <div className="pt-2 flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
      <div className="p-4 bg-slate-950 flex items-center justify-between gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3.5 bg-slate-800 rounded-md flex-1 animate-pulse" />
        ))}
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex items-center justify-between gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-3.5 bg-gray-100 rounded-md flex-1 animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
