import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gym Management | Alpha Warriors",
  description: "Modern gym management system for members, attendance, plans, and payments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
