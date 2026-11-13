"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, UserPlus, CreditCard, CalendarCheck } from "lucide-react";

interface FloatingActionButtonProps {
  onCollectPaymentClick: () => void;
}

export function FloatingActionButton({ onCollectPaymentClick }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);

  return (
    <div className="fixed bottom-20 md:bottom-8 right-5 z-40 flex flex-col items-end select-none">
      {/* Backdrop when menu is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-2xs z-30 transition-opacity"
          onClick={close}
        />
      )}

      {/* Speed Dial Menu Actions */}
      <div
        className={`flex flex-col items-end gap-3 mb-3 z-40 transition-all duration-200 ${
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {/* Add Member */}
        <Link
          href="/members/new"
          onClick={close}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white text-gray-900 shadow-xl border border-gray-100 hover:bg-gray-50 transition-all text-xs sm:text-sm font-bold group"
        >
          <span className="group-hover:text-red-600 transition">Add Member</span>
          <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
            <UserPlus className="w-4 h-4" />
          </div>
        </Link>

        {/* Collect Payment */}
        <button
          type="button"
          onClick={() => {
            close();
            onCollectPaymentClick();
          }}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white text-gray-900 shadow-xl border border-gray-100 hover:bg-gray-50 transition-all text-xs sm:text-sm font-bold group"
        >
          <span className="group-hover:text-emerald-600 transition">Collect Payment</span>
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CreditCard className="w-4 h-4" />
          </div>
        </button>

        {/* Mark Attendance */}
        <Link
          href="/attendance"
          onClick={close}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white text-gray-900 shadow-xl border border-gray-100 hover:bg-gray-50 transition-all text-xs sm:text-sm font-bold group"
        >
          <span className="group-hover:text-blue-600 transition">Mark Attendance</span>
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <CalendarCheck className="w-4 h-4" />
          </div>
        </Link>
      </div>

      {/* Main Floating Trigger Button */}
      <button
        type="button"
        onClick={toggle}
        aria-label="Quick Actions"
        className={`w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-950/30 flex items-center justify-center transition-all duration-300 z-40 transform hover:scale-105 active:scale-95 ${
          isOpen ? "rotate-45 bg-slate-900 hover:bg-black ring-2 ring-red-500" : ""
        }`}
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
