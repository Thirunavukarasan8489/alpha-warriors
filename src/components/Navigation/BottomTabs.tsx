"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CreditCard,
  MoreHorizontal,
  Layers,
  BarChart3,
  Receipt,
  Bell,
  Wallet,
  UserCheck,
  Settings,
  LogOut,
  X,
} from "lucide-react";

export function BottomTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const primaryTabs = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/members", label: "Members", icon: Users },
    { href: "/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/payments", label: "Payments", icon: CreditCard },
  ];

  const moreItems = [
    { href: "/plans", label: "Plans", icon: Layers },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/invoices", label: "Invoices", icon: Receipt },
    { href: "/reminders", label: "Reminders", icon: Bell },
    { href: "/expenses", label: "Expenses", icon: Wallet },
    { href: "/staff", label: "Staff", icon: UserCheck },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const isMoreActive = moreItems.some((item) => pathname.startsWith(item.href));

  return (
    <>
      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/80 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
                isActive
                  ? "text-red-600 font-bold"
                  : "text-gray-500 hover:text-gray-900 font-medium"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </Link>
          );
        })}

        {/* More Tab */}
        <button
          type="button"
          onClick={() => setShowMore(true)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
            isMoreActive
              ? "text-red-600 font-bold"
              : "text-gray-500 hover:text-gray-900 font-medium"
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </div>

      {/* More Bottom Sheet Drawer */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="absolute inset-0" onClick={() => setShowMore(false)} />

          <div className="relative z-10 bg-white rounded-t-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto -mt-2 mb-2" />

            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-base text-gray-900">More Options</h3>
              <button
                type="button"
                onClick={() => setShowMore(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition ${
                      isActive
                        ? "bg-red-50 border-red-200 text-red-600 font-semibold"
                        : "bg-gray-50/70 border-gray-100 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1.5 text-gray-600" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl text-sm font-semibold transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
