"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { BottomTabs } from "./BottomTabs";
import { FloatingActionButton } from "./FloatingActionButton";
import { CollectPaymentModal } from "./CollectPaymentModal";
import { BranchSwitcher } from "./BranchSwitcher";
import { ToastProvider } from "@/components/Toast";
import { MapPin } from "lucide-react";
import { formatDate } from "@/lib/dates";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [gymInfo, setGymInfo] = useState<{
    gymName: string;
    userName: string;
    userRole: string;
    branchName?: string;
  }>({
    gymName: "Alpha Warriors",
    userName: "Gym Staff",
    userRole: "owner",
    branchName: "Main Branch",
  });

  const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setGymInfo({
            gymName: data.data.gym.name,
            userName: data.data.user.name,
            userRole: data.data.user.role,
            branchName: data.data.branches?.[0]?.name || "Main Branch",
          });
        }
      })
      .catch((err) => console.error("Error loading auth info:", err));
  }, []);

  return (
    <ToastProvider>
      <div className="flex h-screen w-full bg-slate-900/5 overflow-hidden font-sans antialiased text-gray-900">
        {/* Desktop Left Sidebar */}
        <Sidebar
          gymName={gymInfo.gymName}
          userName={gymInfo.userName}
          userRole={gymInfo.userRole}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-slate-50">
          {/* Top Header */}
          <header className="h-16 px-4 sm:px-6 bg-white border-b border-gray-200/80 flex items-center justify-between shrink-0 shadow-2xs">
            {/* Left: Mobile Brand & Branch indicator */}
            <div className="flex items-center gap-3">
              <div className="md:hidden w-10 h-10 rounded-xl overflow-hidden ring-2 ring-red-600/40 shadow-xs shrink-0 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.jpg"
                  alt="Alpha Warriors"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="font-black text-sm sm:text-base text-gray-900 tracking-tight flex items-center gap-2">
                  <span>{gymInfo.gymName}</span>
                  <span className="hidden sm:inline-block text-[10px] font-extrabold uppercase tracking-widest text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                    Fitness
                  </span>
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <BranchSwitcher
                    userRole={gymInfo.userRole}
                    onBranchChange={(_, branchName) => {
                      setGymInfo((prev) => ({ ...prev, branchName }));
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Date in Asia/Kolkata & User chip */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full border border-gray-200/60">
                {formatDate(new Date())}
              </span>
              <div className="flex items-center gap-2.5 pl-2 border-l border-gray-200">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs ring-1 ring-slate-800">
                  {gymInfo.userName.charAt(0)}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-bold text-gray-900 leading-none">{gymInfo.userName}</p>
                  <p className="text-[10px] text-red-600 font-extrabold capitalize mt-0.5 tracking-wide">
                    {gymInfo.userRole}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Scrollable Page Body: pb-24 on phone prevents bottom tab overlap */}
          <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 pb-24 md:pb-8">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>

          {/* Floating Action Button for Quick Actions */}
          <FloatingActionButton
            onCollectPaymentClick={() => setIsCollectPaymentOpen(true)}
          />

          {/* Mobile Bottom Tabs */}
          <BottomTabs />

          {/* Global Collect Payment Modal */}
          <CollectPaymentModal
            isOpen={isCollectPaymentOpen}
            onClose={() => setIsCollectPaymentOpen(false)}
            onSuccess={() => {
              // Trigger route refresh or event if needed
            }}
          />
        </div>
      </div>
    </ToastProvider>
  );
}
