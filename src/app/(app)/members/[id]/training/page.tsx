"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Dumbbell,
  Apple,
  CalendarCheck,
  HeartPulse,
  ArrowLeft,
  Plus,
  Share2,
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Clock,
  User,
  ShieldCheck,
  Loader2,
  ExternalLink,
  Edit2,
  Save,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/dates";
import { buildShareLink } from "@/lib/whatsapp";

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
}

interface WorkoutDay {
  day: string;
  exercises: Exercise[];
}

interface DietMeal {
  time: string;
  items: string;
  notes?: string;
  calories?: number;
  protein?: number;
}

export default function MemberTrainingPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trainingData, setTrainingData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"workout" | "diet" | "sessions" | "parq">("workout");

  // Workout Edit State
  const [isEditingWorkout, setIsEditingWorkout] = useState(false);
  const [workoutTitle, setWorkoutTitle] = useState("");
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);

  // Diet Edit State
  const [isEditingDiet, setIsEditingDiet] = useState(false);
  const [dietTitle, setDietTitle] = useState("");
  const [dietNotes, setDietNotes] = useState("");
  const [dietMeals, setDietMeals] = useState<DietMeal[]>([]);
  const [isSavingDiet, setIsSavingDiet] = useState(false);

  // PT Session Log State
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionDate, setSessionDate] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [isLoggingSession, setIsLoggingSession] = useState(false);

  // PAR-Q Link Generation
  const [isGeneratingParq, setIsGeneratingParq] = useState(false);

  const loadTrainingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/members/${id}/training`);
      const data = await res.json();
      if (res.ok) {
        setTrainingData(data.data);
        if (data.data.workoutPlan) {
          setWorkoutTitle(data.data.workoutPlan.title);
          setWorkoutNotes(data.data.workoutPlan.notes || "");
          setWorkoutDays(data.data.workoutPlan.days || []);
        } else {
          setWorkoutTitle("Standard Workout Split");
          setWorkoutDays([
            {
              day: "Day 1 - Chest & Triceps",
              exercises: [
                { name: "Barbell Bench Press", sets: 4, reps: "8-10", notes: "Warmup with bar" },
                { name: "Incline Dumbbell Press", sets: 3, reps: "10-12" },
                { name: "Cable Tricep Pushdown", sets: 4, reps: "12-15" },
              ],
            },
          ]);
        }

        if (data.data.dietPlan) {
          setDietTitle(data.data.dietPlan.title);
          setDietNotes(data.data.dietPlan.notes || "");
          setDietMeals(data.data.dietPlan.meals || []);
        } else {
          setDietTitle("Personalized Nutrition Routine");
          setDietMeals([
            { time: "08:00 AM - Breakfast", items: "4 egg whites, 2 whole eggs, 1 cup oats", calories: 450, protein: 30 },
            { time: "01:30 PM - Lunch", items: "200g grilled chicken/paneer, 1 cup brown rice, greens", calories: 600, protein: 45 },
            { time: "05:00 PM - Pre-Workout", items: "1 banana, 1 scoop whey protein with water", calories: 220, protein: 25 },
          ]);
        }
      } else {
        setError(data.error?.message || "Failed to load training details");
      }
    } catch {
      setError("Network error loading training page");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainingData();
  }, [id]);

  // Workout Handlers
  const handleSaveWorkout = async () => {
    setIsSavingWorkout(true);
    try {
      const res = await fetch(`/api/members/${id}/workout`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: workoutTitle,
          notes: workoutNotes,
          days: workoutDays,
        }),
      });
      if (res.ok) {
        showToast("Workout plan updated successfully!", "success");
        setIsEditingWorkout(false);
        loadTrainingData();
      } else {
        const err = await res.json();
        showToast(err.error?.message || "Failed to save workout plan", "error");
      }
    } catch {
      showToast("Network error saving workout plan", "error");
    } finally {
      setIsSavingWorkout(false);
    }
  };

  const handleShareWorkoutWhatsApp = () => {
    let text = `*ALPHA WARRIORS - WORKOUT PLAN*\nAthlete: ${trainingData.member.name}\nPlan: ${workoutTitle}\n\n`;
    workoutDays.forEach((d) => {
      text += `*${d.day}*\n`;
      d.exercises.forEach((ex) => {
        text += `• ${ex.name} - ${ex.sets} sets x ${ex.reps}${ex.notes ? ` (${ex.notes})` : ""}\n`;
      });
      text += "\n";
    });
    text += "Train. Push. Dominate. 💪";
    const link = buildShareLink(trainingData.member.phone, text);
    window.open(link, "_blank");
  };

  // Diet Handlers
  const handleSaveDiet = async () => {
    setIsSavingDiet(true);
    try {
      const res = await fetch(`/api/members/${id}/diet`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: dietTitle,
          notes: dietNotes,
          meals: dietMeals,
        }),
      });
      if (res.ok) {
        showToast("Diet chart updated successfully!", "success");
        setIsEditingDiet(false);
        loadTrainingData();
      } else {
        const err = await res.json();
        showToast(err.error?.message || "Failed to save diet chart", "error");
      }
    } catch {
      showToast("Network error saving diet chart", "error");
    } finally {
      setIsSavingDiet(false);
    }
  };

  const handleShareDietWhatsApp = () => {
    let text = `*ALPHA WARRIORS - DIET CHART*\nAthlete: ${trainingData.member.name}\nPlan: ${dietTitle}\n\n`;
    dietMeals.forEach((m) => {
      text += `*${m.time}*\n${m.items}${m.calories ? ` (${m.calories} kcal, ${m.protein}g protein)` : ""}\n\n`;
    });
    text += "Fuel your warrior journey! 🥗⚡";
    const link = buildShareLink(trainingData.member.phone, text);
    window.open(link, "_blank");
  };

  // PT Session Logging
  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingSession(true);
    try {
      const res = await fetch(`/api/members/${id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: sessionDate || undefined,
          notes: sessionNotes,
        }),
      });
      if (res.ok) {
        showToast("PT session logged!", "success");
        setIsSessionModalOpen(false);
        setSessionNotes("");
        setSessionDate("");
        loadTrainingData();
      } else {
        const err = await res.json();
        showToast(err.error?.message || "Failed to log session", "error");
      }
    } catch {
      showToast("Network error logging session", "error");
    } finally {
      setIsLoggingSession(false);
    }
  };

  // PAR-Q Link Generation
  const handleCreateParqLink = async () => {
    setIsGeneratingParq(true);
    try {
      const res = await fetch(`/api/members/${id}/parq-link`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        const text = `Hi ${trainingData.member.name}, please complete your Alpha Warriors health readiness questionnaire (PAR-Q) by opening this link: ${data.data.shareUrl}`;
        const link = buildShareLink(trainingData.member.phone, text);
        window.open(link, "_blank");
        showToast("PAR-Q link created! WhatsApp opened.", "success");
        loadTrainingData();
      } else {
        showToast(data.error?.message || "Failed to create PAR-Q link", "error");
      }
    } catch {
      showToast("Network error creating PAR-Q link", "error");
    } finally {
      setIsGeneratingParq(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
        <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-gray-500">Loading training dashboard...</p>
      </div>
    );
  }

  if (error || !trainingData) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-rose-200 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-black text-gray-900">{error || "Access Denied"}</h2>
        <Link
          href={`/members/${id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Member Profile
        </Link>
      </div>
    );
  }

  const { member, plan, workoutPlan, dietPlan, ptSessions, parqForm } = trainingData;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/members/${id}`}
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition shadow-2xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-red-600" />
              {member.name} • Training
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Workouts, meal charts, personal training sessions & PAR-Q clearance
            </p>
          </div>
        </div>
      </div>

      {/* PT Sessions Summary Card (if session quotas exist) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-950 text-white rounded-2xl p-4 shadow-sm border border-slate-900">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
            Current Plan
          </p>
          <p className="text-base font-black text-white mt-0.5">{plan?.name || "No active plan"}</p>
          <p className="text-xs text-red-500 font-semibold mt-1">
            Trainer: {member.trainer?.name || "Gym General"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
            PT Sessions Quota
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-black text-gray-900">{plan?.sessionsUsed || 0}</span>
            <span className="text-xs text-gray-500 font-semibold">
              / {plan?.totalSessions ? `${plan.totalSessions} Total` : "Unlimited"}
            </span>
          </div>
          {plan?.sessionsRemaining !== null && (
            <p className="text-xs text-emerald-600 font-bold mt-1">
              {plan?.sessionsRemaining} sessions left
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              Health Readiness
            </p>
            <p className="text-sm font-black text-gray-900 mt-1 flex items-center gap-1.5">
              {parqForm?.isCompleted ? (
                parqForm.hasRisk ? (
                  <span className="text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Medical Advisory
                  </span>
                ) : (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cleared (No Risk)
                  </span>
                )
              ) : (
                <span className="text-gray-500">Not Submitted</span>
              )}
            </p>
          </div>
          <button
            onClick={() => setActiveTab("parq")}
            className="text-xs font-bold text-red-600 hover:underline"
          >
            Details →
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("workout")}
          className={`px-4 py-3 text-xs sm:text-sm font-extrabold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "workout"
              ? "border-red-600 text-red-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          Workout Plan
        </button>

        <button
          onClick={() => setActiveTab("diet")}
          className={`px-4 py-3 text-xs sm:text-sm font-extrabold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "diet"
              ? "border-red-600 text-red-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Apple className="w-4 h-4" />
          Diet & Nutrition
        </button>

        <button
          onClick={() => setActiveTab("sessions")}
          className={`px-4 py-3 text-xs sm:text-sm font-extrabold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "sessions"
              ? "border-red-600 text-red-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          PT Sessions ({ptSessions.length})
        </button>

        <button
          onClick={() => setActiveTab("parq")}
          className={`px-4 py-3 text-xs sm:text-sm font-extrabold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "parq"
              ? "border-red-600 text-red-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          PAR-Q Readiness
        </button>
      </div>

      {/* SECTION 1: WORKOUT PLAN */}
      {activeTab === "workout" && (
        <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div>
              <h2 className="font-black text-base text-gray-900">{workoutTitle}</h2>
              {workoutPlan?.updatedAt && (
                <p className="text-xs text-gray-500">
                  Last updated {formatDate(workoutPlan.updatedAt)} by {workoutPlan.createdBy || "Trainer"}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShareWorkoutWhatsApp}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
              >
                <MessageCircle className="w-4 h-4" />
                Share WhatsApp
              </button>

              {!isEditingWorkout ? (
                <button
                  onClick={() => setIsEditingWorkout(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Routine
                </button>
              ) : (
                <button
                  onClick={handleSaveWorkout}
                  disabled={isSavingWorkout}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSavingWorkout ? "Saving..." : "Save Routine"}
                </button>
              )}
            </div>
          </div>

          {/* Routine Days */}
          {workoutDays.map((dayItem, dIdx) => (
            <div key={dIdx} className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/50 space-y-3">
              <div className="flex items-center justify-between">
                {isEditingWorkout ? (
                  <input
                    type="text"
                    value={dayItem.day}
                    onChange={(e) => {
                      const next = [...workoutDays];
                      next[dIdx].day = e.target.value;
                      setWorkoutDays(next);
                    }}
                    className="font-bold text-sm text-gray-900 px-2 py-1 rounded border border-gray-300 bg-white"
                  />
                ) : (
                  <h3 className="font-extrabold text-sm text-gray-900">{dayItem.day}</h3>
                )}

                {isEditingWorkout && (
                  <button
                    onClick={() => {
                      const next = workoutDays.filter((_, idx) => idx !== dIdx);
                      setWorkoutDays(next);
                    }}
                    className="text-xs text-rose-600 font-bold hover:underline"
                  >
                    Remove Day
                  </button>
                )}
              </div>

              {/* Exercises */}
              <div className="space-y-2">
                {dayItem.exercises.map((ex, exIdx) => (
                  <div
                    key={exIdx}
                    className="p-3 bg-white rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex-1 font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-[10px] font-black">
                        {exIdx + 1}
                      </span>
                      {isEditingWorkout ? (
                        <input
                          type="text"
                          value={ex.name}
                          onChange={(e) => {
                            const next = [...workoutDays];
                            next[dIdx].exercises[exIdx].name = e.target.value;
                            setWorkoutDays(next);
                          }}
                          className="px-2 py-1 rounded border border-gray-300 w-full max-w-xs"
                        />
                      ) : (
                        <span>{ex.name}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-gray-600 font-medium">
                      <span>
                        <strong>{ex.sets}</strong> sets × <strong>{ex.reps}</strong> reps
                      </span>
                      {ex.notes && <span className="text-gray-400 italic">({ex.notes})</span>}
                      {isEditingWorkout && (
                        <button
                          onClick={() => {
                            const next = [...workoutDays];
                            next[dIdx].exercises = next[dIdx].exercises.filter((_, idx) => idx !== exIdx);
                            setWorkoutDays(next);
                          }}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {isEditingWorkout && (
                <button
                  type="button"
                  onClick={() => {
                    const next = [...workoutDays];
                    next[dIdx].exercises.push({ name: "New Exercise", sets: 3, reps: "10-12" });
                    setWorkoutDays(next);
                  }}
                  className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Exercise
                </button>
              )}
            </div>
          ))}

          {isEditingWorkout && (
            <button
              type="button"
              onClick={() => {
                setWorkoutDays([...workoutDays, { day: `Day ${workoutDays.length + 1}`, exercises: [] }]);
              }}
              className="py-2.5 px-4 rounded-xl border border-dashed border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 w-full"
            >
              <Plus className="w-4 h-4" /> Add Training Day
            </button>
          )}
        </div>
      )}

      {/* SECTION 2: DIET & NUTRITION */}
      {activeTab === "diet" && (
        <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div>
              <h2 className="font-black text-base text-gray-900">{dietTitle}</h2>
              {dietPlan?.updatedAt && (
                <p className="text-xs text-gray-500">
                  Last updated {formatDate(dietPlan.updatedAt)} by {dietPlan.createdBy || "Nutritionist"}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShareDietWhatsApp}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
              >
                <MessageCircle className="w-4 h-4" />
                Share WhatsApp
              </button>

              {!isEditingDiet ? (
                <button
                  onClick={() => setIsEditingDiet(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Meals
                </button>
              ) : (
                <button
                  onClick={handleSaveDiet}
                  disabled={isSavingDiet}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSavingDiet ? "Saving..." : "Save Nutrition"}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {dietMeals.map((meal, mIdx) => (
              <div
                key={mIdx}
                className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 flex-1">
                  {isEditingDiet ? (
                    <input
                      type="text"
                      value={meal.time}
                      onChange={(e) => {
                        const next = [...dietMeals];
                        next[mIdx].time = e.target.value;
                        setDietMeals(next);
                      }}
                      className="font-extrabold text-sm text-gray-900 px-2 py-1 rounded border border-gray-300 bg-white w-full max-w-xs"
                    />
                  ) : (
                    <span className="font-extrabold text-sm text-gray-900 block">{meal.time}</span>
                  )}

                  {isEditingDiet ? (
                    <textarea
                      rows={2}
                      value={meal.items}
                      onChange={(e) => {
                        const next = [...dietMeals];
                        next[mIdx].items = e.target.value;
                        setDietMeals(next);
                      }}
                      className="w-full px-2 py-1 rounded border border-gray-300 bg-white text-xs mt-1"
                    />
                  ) : (
                    <p className="text-gray-700 font-medium leading-relaxed">{meal.items}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {meal.calories && (
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
                      {meal.calories} kcal
                    </span>
                  )}
                  {meal.protein && (
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 font-bold border border-blue-200">
                      {meal.protein}g protein
                    </span>
                  )}
                  {isEditingDiet && (
                    <button
                      onClick={() => {
                        setDietMeals(dietMeals.filter((_, idx) => idx !== mIdx));
                      }}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isEditingDiet && (
              <button
                type="button"
                onClick={() => {
                  setDietMeals([
                    ...dietMeals,
                    { time: "Meal Time", items: "Meal details here", calories: 300, protein: 20 },
                  ]);
                }}
                className="py-2.5 px-4 rounded-xl border border-dashed border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 w-full"
              >
                <Plus className="w-4 h-4" /> Add Meal
              </button>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: PT SESSIONS */}
      {activeTab === "sessions" && (
        <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 className="font-black text-base text-gray-900">Personal Training Log</h2>
              <p className="text-xs text-gray-500">Track 1-on-1 coaching sessions and progress</p>
            </div>

            <button
              onClick={() => setIsSessionModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
            >
              <Plus className="w-4 h-4" /> Log PT Session
            </button>
          </div>

          {ptSessions.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              No personal training sessions logged for this member yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {ptSessions.map((session: any) => (
                <div key={session.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <p className="font-black text-gray-900">{formatDate(session.date)}</p>
                    <p className="text-gray-500 font-medium">Trainer: {session.trainerName}</p>
                    {session.notes && (
                      <p className="text-gray-700 italic mt-1 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        &quot;{session.notes}&quot;
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Completed
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: PAR-Q READINESS */}
      {activeTab === "parq" && (
        <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div>
              <h2 className="font-black text-base text-gray-900 flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-red-600" />
                Physical Activity Readiness Questionnaire (PAR-Q)
              </h2>
              <p className="text-xs text-gray-500">
                Self-attested readiness questionnaire required before high-intensity workouts
              </p>
            </div>

            <button
              onClick={handleCreateParqLink}
              disabled={isGeneratingParq}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-2 transition disabled:opacity-50 shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              {isGeneratingParq ? "Generating..." : "Share PAR-Q Link via WhatsApp"}
            </button>
          </div>

          {parqForm && parqForm.isCompleted ? (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                  parqForm.hasRisk
                    ? "bg-amber-50 border-amber-300 text-amber-900"
                    : "bg-emerald-50 border-emerald-200 text-emerald-900"
                }`}
              >
                {parqForm.hasRisk ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-extrabold text-sm">
                    {parqForm.hasRisk ? "Medical Clearance Advised" : "Medically Cleared"}
                  </h4>
                  <p className="mt-0.5">
                    Digitally signed by <strong className="font-bold">{parqForm.signatureName}</strong> on{" "}
                    {formatDate(parqForm.completedAt)}.
                  </p>
                  {parqForm.hasRisk && (
                    <p className="font-semibold text-amber-800 mt-1">
                      Note: One or more readiness questions were answered &apos;Yes&apos;. The member is advised to consult a doctor before starting strenuous training.
                    </p>
                  )}
                </div>
              </div>

              {/* Answers List */}
              <div className="divide-y divide-gray-100 text-xs">
                {parqForm.answers?.map((ans: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex items-start justify-between gap-4">
                    <span className="text-gray-800 font-medium">
                      {idx + 1}. {ans.questionText}
                    </span>
                    <span
                      className={`font-black uppercase px-2 py-0.5 rounded text-[10px] shrink-0 ${
                        ans.answer
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {ans.answer ? "Yes" : "No"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <HeartPulse className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="font-bold text-gray-800 text-sm">No Completed PAR-Q On File</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Click &quot;Share PAR-Q Link via WhatsApp&quot; to send the digital form to the member&apos;s phone.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Log Session Modal */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden text-xs">
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-red-500" />
                Log 1-on-1 PT Session
              </h3>
              <button
                onClick={() => setIsSessionModalOpen(false)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogSession} className="p-5 space-y-3.5">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Session Date</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Session Notes / Focus</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Leg day heavy squats, form check on deadlifts, 500m rowing conditioning"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSessionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-gray-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingSession}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50"
                >
                  {isLoggingSession ? "Logging..." : "Confirm Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
