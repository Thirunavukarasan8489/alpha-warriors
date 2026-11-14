"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, User, Phone, Mail, MapPin, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { PhotoUploader } from "@/components/PhotoUploader";
import { toInputDateString } from "@/lib/dates";
import { useToast } from "@/components/Toast";

export default function EditMemberPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const memberId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [photo, setPhoto] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "prefer_not_to_say">("male");
  const [address, setAddress] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [trainers, setTrainers] = useState<{ id: string; name: string }[]>([]);
  const [notes, setNotes] = useState("");

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

  useEffect(() => {
    fetch(`/api/members/${memberId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          const m = data.data;
          setName(m.name || "");
          setPhone(m.phone || "");
          setWhatsapp(m.whatsapp || "");
          setEmail(m.email || "");
          setDateOfBirth(m.dateOfBirth ? toInputDateString(m.dateOfBirth) : "");
          setGender(m.gender || "male");
          setAddress(m.address || "");
          setPhoto(m.photo || "");
          setTrainerId(m.trainer?.id || "");
          setNotes(m.notes || "");
        }
      })
      .catch((err) => toast("Failed to load member details", "error"))
      .finally(() => setLoading(false));
  }, [memberId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          whatsapp,
          email: email || undefined,
          dateOfBirth: dateOfBirth || undefined,
          gender,
          address: address || undefined,
          photo: photo || undefined,
          trainerId: trainerId || "",
          notes: notes || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update member");
      }

      toast("Member updated successfully!", "success");
      router.push(`/members/${memberId}`);
    } catch (err: unknown) {
      toast((err as Error).message || "An error occurred", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-64 bg-white rounded-2xl animate-pulse" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Link
          href={`/members/${memberId}`}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-900 bg-white border border-gray-200 shadow-2xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Edit Member</h1>
          <p className="text-xs text-gray-500">Update personal profile and contact information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-4">
          <PhotoUploader
            value={photo}
            onChange={setPhoto}
            folder="members"
            label="Athlete Profile Photo"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                disabled
                className="w-full px-3.5 py-2.5 text-sm bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed font-medium"
              />
              <span className="text-[10px] text-gray-400">Phone cannot be edited after enrollment</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                WhatsApp Number
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as "male" | "female" | "other" | "prefer_not_to_say")}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Assigned Trainer
              </label>
              <select
                value={trainerId}
                onChange={(e) => setTrainerId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
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
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 relative z-10">
          <Link
            href={`/members/${memberId}`}
            className="w-full sm:w-auto px-5 py-3 text-center text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-red-900/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer touch-manipulation"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

