"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CreditCard,
  Layers,
  BarChart3,
  Receipt,
  Bell,
  Wallet,
  UserCheck,
  Settings,
  LogOut,
  Flame,
  ShoppingBag,
  Banknote,
  Building2,
} from "lucide-react";

interface SidebarProps {
  gymName?: string;
  userName?: string;
  userRole?: string;
}

export function Sidebar({
  gymName = "Alpha Warriors",
  userName = "Staff",
  userRole = "owner",
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/members", label: "Members", icon: Users },
    { href: "/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/payments", label: "Payments & Dues", icon: CreditCard },
    { href: "/leads", label: "Leads CRM", icon: Flame },
    { href: "/sales", label: "POS Sales", icon: ShoppingBag },
    { href: "/plans", label: "Plans", icon: Layers },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/invoices", label: "Invoices", icon: Receipt },
    { href: "/reminders", label: "Reminders", icon: Bell },
    { href: "/expenses", label: "Expenses", icon: Wallet },
    { href: "/staff", label: "Staff", icon: UserCheck },
    ...(userRole === "owner"
      ? [
          { href: "/staff/payroll", label: "Payroll", icon: Banknote },
          { href: "/settings/branches", label: "Branches", icon: Building2 },
        ]
      : []),
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-950 text-slate-300 border-r border-slate-900 shrink-0 select-none shadow-xl">
      {/* Brand Header with Badger Logo */}
      <div className="h-20 px-5 flex items-center gap-3.5 border-b border-slate-900 bg-slate-950/80">
        <div className="relative w-11 h-11 rounded-xl overflow-hidden ring-2 ring-red-600/50 shadow-md shrink-0 bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="Alpha Warriors Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <h1 className="font-black text-sm tracking-wider uppercase text-white truncate font-sans">
            {gymName}
          </h1>
          <p className="text-[10px] text-red-500 font-extrabold uppercase tracking-widest">
            Train • Push • Dominate
          </p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                isActive
                  ? "bg-red-600 text-white shadow-md shadow-red-900/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/90"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User profile & Logout */}
      <div className="p-3 border-t border-slate-900 bg-slate-950/50">
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/60 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-bold text-white truncate">{userName}</p>
            <p className="text-[10px] text-red-400 uppercase font-bold tracking-wider capitalize">
              {userRole}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
