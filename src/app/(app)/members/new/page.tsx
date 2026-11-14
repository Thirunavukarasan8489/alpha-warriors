"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, User, Phone, Mail, MapPin, Calendar, Check, AlertCircle, Loader2 } from "lucide-react";
import { PhotoUploader } from "@/components/PhotoUploader";
import { PlanPicker, PlanOption } from "@/components/PlanPicker";
import { PaymentSplitRows, SplitModeRow } from "@/components/PaymentSplitRows";
import { MoneyText } from "@/components/MoneyText";
import { formatPaise, rupeesToPaise } from "@/lib/money";
import { toInputDateString } from "@/lib/dates";
import { useToast } from "@/components/Toast";

interface TrainerOption {
  id: string;
  name: string;
}

function NewMemberForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [duplicateError, setDuplicateError] = useState<{ message: string; existingMemberId?: string } | null>(null);

  // Form state
  const [photo, setPhoto] = useState("");
  const [name, setName] = useState(searchParams.get("name") || "");
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "prefer_not_to_say">("male");
  const [address, setAddress] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [notes, setNotes] = useState("");

  // Plan section
  const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null);
  const [startDate, setStartDate] = useState(toInputDateString(new Date()));
  const [discountPaise, setDiscountPaise] = useState(0);

  // First payment section
  const [firstPaymentPaise, setFirstPaymentPaise] = useState(0);
  const [splitRows, setSplitRows] = useState<SplitModeRow[]>([{ mode: "cash", amount: 0 }]);

  // Trainers list
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);

  useEffect(() => {
    fetch("/api/staff?role=trainer")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setTrainers(json.data.map((t: any) => ({ id: t.id, name: t.name })));
        }
      })
      .catch((err) => console.error("Error loading trainers:", err));
  }, []);

  const handlePlanChange = (plan: PlanOption) => {
    setSelectedPlan(plan);
    const finalAmount = Math.max(0, plan.price - discountPaise);
    setFirstPaymentPaise(finalAmount);
    setSplitRows([{ mode: "cash", amount: finalAmount }]);
  };

  const handleDiscountChange = (rupeesStr: string) => {
    const paise = rupeesToPaise(rupeesStr);
    const maxDiscount = selectedPlan ? selectedPlan.price : paise;
    const clamped = Math.min(paise, maxDiscount);
    setDiscountPaise(clamped);

    if (selectedPlan) {
      const finalAmount = Math.max(0, selectedPlan.price - clamped);
      setFirstPaymentPaise(finalAmount);
      setSplitRows([{ mode: splitRows[0]?.mode || "cash", amount: finalAmount }]);
    }
  };

  const handleFirstPaymentChange = (rupeesStr: string) => {
    const paise = rupeesToPaise(rupeesStr);
    const maxPayable = selectedPlan ? Math.max(0, selectedPlan.price - discountPaise) : paise;
    const clamped = Math.min(paise, maxPayable);
    setFirstPaymentPaise(clamped);
    setSplitRows([{ mode: splitRows[0]?.mode || "cash", amount: clamped }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) {
      toast("Please select a membership plan", "error");
      return;
    }

    // If first payment is entered, verify mode split
    if (firstPaymentPaise > 0) {
      const splitSum = splitRows.reduce((acc, r) => acc + (r.amount || 0), 0);
      if (splitSum !== firstPaymentPaise) {
        toast("Payment mode splits do not match first payment amount", "error");
        return;
      }
    }

    setLoading(true);
    setDuplicateError(null);

    try {
      const payload = {
        photo,
        name,
        phone,
        whatsapp: whatsappSameAsPhone ? phone : whatsapp,
        email: email || undefined,
        dateOfBirth: dateOfBirth || undefined,
        gender,
        address: address || undefined,
        trainerId: trainerId || undefined,
        notes: notes || undefined,
        planId: selectedPlan.id,
        startDate,
        discount: discountPaise,
        firstPaymentAmount: firstPaymentPaise,
        firstPaymentModes: firstPaymentPaise > 0 ? splitRows : undefined,
      };

      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json.error?.code === "DUPLICATE_PHONE") {
          setDuplicateError({
            message: json.error.message,
            existingMemberId: json.error.existingMemberId,
          });
          return;
        }
        throw new Error(json.error?.message || "Failed to create member");
      }

      toast("Member registered successfully!", "success");

      const leadId = searchParams.get("leadId");
      if (leadId && json.data?.member?.id) {
        fetch(`/api/leads/${leadId}/convert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: json.data.member.id }),
        }).catch((err) => console.error("Error converting lead:", err));
      }

      router.push(`/members/${json.data.member.id}`);
    } catch (err: unknown) {
      toast((err as Error).message || "An error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  const planFinalAmount = selectedPlan ? Math.max(0, selectedPlan.price - discountPaise) : 0;
  const balanceDue = Math.max(0, planFinalAmount - firstPaymentPaise);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/members"
          className="p-2 rounded-xl text-gray-500 hover:text-gray-900 bg-white border border-gray-200 shadow-2xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Add New Member</h1>
          <p className="text-xs text-gray-500">Enroll an athlete and sell their first plan</p>
        </div>
      </div>

      {duplicateError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{duplicateError.message}</span>
          </div>
          {duplicateError.existingMemberId && (
            <Link
              href={`/members/${duplicateError.existingMemberId}`}
              className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700"
            >
              View Member
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Member Personal Details */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-4">
          <h2 className="font-extrabold text-sm text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-2">
            <User className="w-4 h-4 text-red-600" />
            1. Member Details
          </h2>

          <PhotoUploader value={photo} onChange={setPhoto} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Member full name"
                required
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                required
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="whatsapp-same"
              checked={whatsappSameAsPhone}
              onChange={(e) => setWhatsappSameAsPhone(e.target.checked)}
              className="rounded text-red-600 focus:ring-red-600 w-4 h-4"
            />
            <label htmlFor="whatsapp-same" className="text-xs text-gray-600 cursor-pointer">
              WhatsApp number is same as phone
            </label>
          </div>

          {!whatsappSameAsPhone && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                WhatsApp Number
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="WhatsApp number with country code"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as "male" | "female" | "other" | "prefer_not_to_say")}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="athlete@example.com"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Assigned Trainer (Optional)
              </label>
              <select
                value={trainerId}
                onChange={(e) => setTrainerId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
              >
                <option value="">Unassigned (General Floor Member)</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Trainer)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Residential address or locality"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Medical notes, fitness goals or references..."
              className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Section 2: Membership Plan */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-4">
          <h2 className="font-extrabold text-sm text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-red-600" />
            2. Choose Membership Plan *
          </h2>

          <PlanPicker
            selectedPlanId={selectedPlan?.id}
            startDate={startDate}
            onChange={handlePlanChange}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Discount (₹)
              </label>
              <input
                type="number"
                min="0"
                value={discountPaise ? discountPaise / 100 : ""}
                onChange={(e) => handleDiscountChange(e.target.value)}
                placeholder="Optional discount amount"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white font-medium"
              />
            </div>
          </div>

          {selectedPlan && (
            <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
              <span className="text-gray-500">Plan Final Amount:</span>
              <span className="text-sm font-extrabold text-gray-900">
                <MoneyText paise={planFinalAmount} />
              </span>
            </div>
          )}
        </div>

        {/* Section 3: First Payment (Optional upon enrollment) */}
        {selectedPlan && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h2 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                3. First Payment
              </h2>
              <span className="text-xs font-bold text-rose-600">
                Due: <MoneyText paise={balanceDue} />
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Amount Paid Today (₹)
              </label>
              <input
                type="number"
                min="0"
                value={firstPaymentPaise ? firstPaymentPaise / 100 : ""}
                onChange={(e) => handleFirstPaymentChange(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 text-base font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
              />
            </div>

            {firstPaymentPaise > 0 && (
              <PaymentSplitRows
                totalTargetAmount={firstPaymentPaise}
                rows={splitRows}
                onChange={setSplitRows}
              />
            )}
          </div>
        )}

        {/* Sticky Action Footer on Mobile & Desktop */}
        <div className="sticky bottom-20 md:bottom-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-lg flex items-center justify-between gap-4 z-30">
          <Link
            href="/members"
            className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading || !selectedPlan}
            className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-red-600/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 touch-manipulation"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registering Member...</span>
              </>
            ) : (
              <span>Save & Create Member</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewMemberPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-12 text-center text-sm font-semibold text-gray-500">
          Loading registration form...
        </div>
      }
    >
      <NewMemberForm />
    </React.Suspense>
  );
}


