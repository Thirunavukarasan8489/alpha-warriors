import React from "react";
import { AppShell } from "@/components/Navigation/AppShell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}

