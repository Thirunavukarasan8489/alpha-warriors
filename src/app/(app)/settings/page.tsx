"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Building2,
  Receipt,
  MessageSquare,
  UploadCloud,
  User,
  CheckCircle2,
  AlertTriangle,
  Download,
  Lock,
  LogOut,
  Save,
  HelpCircle,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { SkeletonList, SkeletonStats } from "@/components/Skeleton";
import { PhotoUploader } from "@/components/PhotoUploader";

interface GymSettingsData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  state?: string;
  logo?: string;
  settings: {
    defaultTaxPercent: number;
    expiringSoonDays: number;
    memberCodePrefix: string;
    invoicePrefix: string;
    nextMemberCodeNumber: number;
    nextInvoiceNumber: number;
  };
}

export default function SettingsPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<
    "gym" | "billing" | "templates" | "import" | "account"
  >("gym");
  const [currentUserRole, setCurrentUserRole] = useState<string>("owner");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [gymData, setGymData] = useState<GymSettingsData | null>(null);

  // Template State
  const [templates, setTemplates] = useState({
    expiringSoon: "",
    expired: "",
    dues: "",
    absent: "",
  });

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Bulk Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<{
    totalRows: number;
    validCount: number;
    invalidCount: number;
    errors: { row: number; name: string; phone: string; issue: string }[];
    sampleValid?: any[];
  } | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  const loadAllSettings = async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      const meJson = await meRes.json();
      const role = meJson.data?.user?.role || "owner";
      setCurrentUserRole(role);

      if (role !== "owner") {
        setActiveTab("account");
        setLoading(false);
        return;
      }

      const [settingsRes, templatesRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/settings/templates"),
      ]);

      const settingsJson = await settingsRes.json();
      const templatesJson = await templatesRes.json();

      if (settingsJson.data) setGymData(settingsJson.data);
      if (templatesJson.data) setTemplates(templatesJson.data);
    } catch (err) {
      toast("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  // Save Gym / Billing Info
  const handleSaveGymSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymData) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: gymData.name,
          phone: gymData.phone,
          email: gymData.email,
          address: gymData.address,
          gstin: gymData.gstin,
          state: gymData.state,
          defaultTaxPercent: gymData.settings.defaultTaxPercent,
          expiringSoonDays: gymData.settings.expiringSoonDays,
          invoicePrefix: gymData.settings.invoicePrefix,
          memberCodePrefix: gymData.settings.memberCodePrefix,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update settings");

      toast("Settings saved successfully!", "success");
    } catch (err: any) {
      toast(err.message || "An error occurred", "error");
    } finally {
      setSaving(false);
    }
  };

  // Save WhatsApp Templates
  const handleSaveTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templates),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to save templates");

      toast("Message templates updated!", "success");
    } catch (err: any) {
      toast(err.message || "An error occurred", "error");
    } finally {
      setSaving(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast("New passwords do not match", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update password");

      toast("Password updated successfully!", "success");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast(err.message || "An error occurred", "error");
    } finally {
      setSaving(false);
    }
  };

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const csvContent =
      "name,phone,planName,startDate,endDate,amountPaidRupees,balanceRupees\n" +
      "Vikram Singh,9876543210,Monthly,2026-11-01,2026-12-01,1500,0\n" +
      "Anita Sharma,9876543211,Quarterly,2026-10-15,2027-01-15,3000,1000\n" +
      "Rohit Verma,9876543212,,2026-11-10,,0,0\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "alpha_warriors_members_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV client-side and trigger Dry-Run Preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        toast("CSV file must contain a header and at least one member row", "error");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const rows = lines.slice(1).map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        const rowObj: any = {};
        headers.forEach((h, idx) => {
          rowObj[h] = parts[idx] || "";
        });
        return {
          name: rowObj.name,
          phone: rowObj.phone,
          planName: rowObj.planname || rowObj.plan,
          startDate: rowObj.startdate,
          endDate: rowObj.enddate,
          amountPaidRupees: rowObj.amountpaidrupees || rowObj.paid,
          balanceRupees: rowObj.balancerupees || rowObj.balance,
        };
      });

      setParsedRows(rows);

      // Perform dry-run preview with server
      setImporting(true);
      try {
        const res = await fetch("/api/members/import?preview=true", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        });
        const json = await res.json();
        if (json.data) {
          setPreviewResult(json.data);
          toast(`Preview ready: ${json.data.validCount} valid rows`, "success");
        }
      } catch (err) {
        toast("Preview generation failed", "error");
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  // Final Commit Import
  const handleCommitImport = async () => {
    if (!parsedRows.length) return;
    setImporting(true);
    try {
      const res = await fetch("/api/members/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Import failed");

      toast(
        `Successfully imported ${json.data.importedCount} members!`,
        "success"
      );
      setPreviewResult(null);
      setParsedRows([]);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast(err.message || "Import failed", "error");
    } finally {
      setImporting(false);
    }
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <SkeletonStats count={2} />
        <SkeletonList count={2} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
          Gym Settings & Configuration
        </h1>
        <p className="text-xs text-gray-500">
          Manage business credentials, billing parameters, reminder templates, and bulk data import
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
        {(currentUserRole === "owner"
          ? [
              { id: "gym", label: "Gym Profile", icon: Building2 },
              { id: "billing", label: "Billing Defaults", icon: Receipt },
              { id: "templates", label: "WhatsApp Templates", icon: MessageSquare },
              { id: "import", label: "Import Members", icon: UploadCloud },
              { id: "account", label: "My Account", icon: User },
            ]
          : [{ id: "account", label: "My Account & Password", icon: User }]
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. GYM PROFILE SECTION */}
      {activeTab === "gym" && gymData && (
        <form onSubmit={handleSaveGymSettings} className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-gray-900 pb-2 border-b border-gray-100">
              Facility Information (Printed on Tax Invoices)
            </h2>

            {/* Gym Logo Upload */}
            <div className="pb-3 border-b border-gray-100">
              <PhotoUploader
                value={gymData.logo}
                onChange={(url) => setGymData({ ...gymData, logo: url })}
                folder="branding"
                label="Gym Logo (Shown on tax receipts, invoice printouts & member pass)"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Gym Name *
                </label>
                <input
                  type="text"
                  value={gymData.name}
                  onChange={(e) => setGymData({ ...gymData, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={gymData.phone}
                  onChange={(e) => setGymData({ ...gymData, phone: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={gymData.email || ""}
                  onChange={(e) => setGymData({ ...gymData, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  GSTIN (GST Number)
                </label>
                <input
                  type="text"
                  value={gymData.gstin || ""}
                  onChange={(e) => setGymData({ ...gymData, gstin: e.target.value })}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={gymData.state || ""}
                  onChange={(e) => setGymData({ ...gymData, state: e.target.value })}
                  placeholder="e.g. Delhi, Maharashtra, Karnataka"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Physical Address
                </label>
                <input
                  type="text"
                  value={gymData.address || ""}
                  onChange={(e) => setGymData({ ...gymData, address: e.target.value })}
                  placeholder="Plot #, Street, City"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition touch-manipulation cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Gym Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* 2. BILLING DEFAULTS */}
      {activeTab === "billing" && gymData && (
        <form onSubmit={handleSaveGymSettings} className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-gray-900 pb-2 border-b border-gray-100">
              Tax & Invoicing Sequences
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Default GST Tax %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={gymData.settings.defaultTaxPercent}
                  onChange={(e) =>
                    setGymData({
                      ...gymData,
                      settings: {
                        ...gymData.settings,
                        defaultTaxPercent: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <span className="text-[10px] text-gray-400">
                  Applied as default when creating new membership plans
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Expiring Soon Days (Alert Window)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={gymData.settings.expiringSoonDays}
                  onChange={(e) =>
                    setGymData({
                      ...gymData,
                      settings: {
                        ...gymData.settings,
                        expiringSoonDays: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <span className="text-[10px] text-gray-400">
                  Days before end date when &quot;Expiring Soon&quot; badge appears (default 7)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  value={gymData.settings.invoicePrefix}
                  onChange={(e) =>
                    setGymData({
                      ...gymData,
                      settings: {
                        ...gymData.settings,
                        invoicePrefix: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-mono uppercase"
                />
                <span className="text-[10px] text-gray-400">e.g. INV- results in INV-0001</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Member Code Prefix
                </label>
                <input
                  type="text"
                  value={gymData.settings.memberCodePrefix}
                  onChange={(e) =>
                    setGymData({
                      ...gymData,
                      settings: {
                        ...gymData.settings,
                        memberCodePrefix: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-mono uppercase"
                />
                <span className="text-[10px] text-gray-400">e.g. AW- results in AW-1001</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition touch-manipulation cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Billing Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* 3. WHATSAPP TEMPLATES */}
      {activeTab === "templates" && (
        <form onSubmit={handleSaveTemplates} className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-5">
            <div>
              <h2 className="font-bold text-sm text-gray-900">WhatsApp Notification Templates</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Placeholders: <code className="bg-gray-100 px-1 py-0.5 rounded text-red-600">&#123;name&#125;</code>,{" "}
                <code className="bg-gray-100 px-1 py-0.5 rounded text-red-600">&#123;plan&#125;</code>,{" "}
                <code className="bg-gray-100 px-1 py-0.5 rounded text-red-600">&#123;endDate&#125;</code>,{" "}
                <code className="bg-gray-100 px-1 py-0.5 rounded text-red-600">&#123;amount&#125;</code>,{" "}
                <code className="bg-gray-100 px-1 py-0.5 rounded text-red-600">&#123;gym&#125;</code>,{" "}
                <code className="bg-gray-100 px-1 py-0.5 rounded text-red-600">&#123;days&#125;</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Expiring Soon Reminder
              </label>
              <textarea
                rows={2}
                value={templates.expiringSoon}
                onChange={(e) => setTemplates({ ...templates, expiringSoon: e.target.value })}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Expired Membership Notice
              </label>
              <textarea
                rows={2}
                value={templates.expired}
                onChange={(e) => setTemplates({ ...templates, expired: e.target.value })}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Pending Dues Reminder
              </label>
              <textarea
                rows={2}
                value={templates.dues}
                onChange={(e) => setTemplates({ ...templates, dues: e.target.value })}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Missed Workout (7+ Days Absent)
              </label>
              <textarea
                rows={2}
                value={templates.absent}
                onChange={(e) => setTemplates({ ...templates, absent: e.target.value })}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition touch-manipulation cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Templates</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* 4. IMPORT MEMBERS */}
      {activeTab === "import" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-sm text-gray-900">Bulk Member Import</h2>
                <p className="text-xs text-gray-500">
                  Import hundreds of member records, past subscriptions, and balances via CSV
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
              >
                <Download className="w-3.5 h-3.5 text-red-400" />
                <span>Download Sample CSV</span>
              </button>
            </div>

            {/* Drop Zone */}
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center space-y-3 hover:border-red-400 transition bg-gray-50/50">
              <FileSpreadsheet className="w-10 h-10 text-red-600 mx-auto" />
              <div>
                <p className="text-sm font-bold text-gray-900">Select or drop CSV file here</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Safe import: duplicates are skipped and you see a preview before anything is saved
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
              />

              <label
                htmlFor="csv-file-input"
                className="inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition"
              >
                {importing ? "Parsing File..." : "Choose CSV File"}
              </label>

              {importFile && (
                <p className="text-xs font-mono font-semibold text-gray-600">
                  Selected: {importFile.name}
                </p>
              )}
            </div>

            {/* Preview Section */}
            {previewResult && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Total Rows</span>
                    <p className="text-xl font-black text-gray-900">{previewResult.totalRows}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-600 uppercase font-bold">Valid Ready</span>
                    <p className="text-xl font-black text-emerald-700">{previewResult.validCount}</p>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <span className="text-[10px] text-rose-600 uppercase font-bold">Issues/Skipped</span>
                    <p className="text-xl font-black text-rose-700">{previewResult.invalidCount}</p>
                  </div>
                </div>

                {/* Error issues list */}
                {previewResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-rose-700">
                      Issues Found ({previewResult.errors.length} rows will be skipped):
                    </p>
                    <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 bg-rose-50/50 rounded-xl border border-rose-100 p-2 text-xs">
                      {previewResult.errors.map((err, i) => (
                        <div key={i} className="py-1.5 flex items-center justify-between gap-2">
                          <span className="font-mono text-gray-600">Row {err.row}:</span>
                          <span className="font-bold text-gray-900">{err.name} ({err.phone})</span>
                          <span className="text-rose-600 font-semibold">{err.issue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewResult(null);
                      setParsedRows([]);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitImport}
                    disabled={importing || previewResult.validCount === 0}
                    className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition touch-manipulation cursor-pointer"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <span>Confirm Import ({previewResult.validCount} Members)</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. ACCOUNT SECTION */}
      {activeTab === "account" && (
        <div className="space-y-6">
          <form onSubmit={handleChangePassword} className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-600" />
              Change Your Password
            </h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Current Password *
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                }
                required
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition touch-manipulation cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </div>
          </form>

          {/* Sign Out Card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-gray-900">Sign Out</h3>
              <p className="text-xs text-gray-500">End your current session on this device</p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-rose-50 hover:text-rose-700 text-gray-700 font-bold text-xs rounded-xl transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
