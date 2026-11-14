"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  FileCheck2,
} from "lucide-react";

export default function MemberParqPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [signatureName, setSignatureName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/parq/${token}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.data) {
          setData(res.data);
          if (res.data.isCompleted) {
            setSubmittedResult({
              hasRisk: res.data.hasRisk,
              completedAt: res.data.completedAt,
              signatureName: res.data.signatureName,
            });
          }
        } else {
          setError(res.error?.message || "Invalid or expired link");
        }
      })
      .catch(() => setError("Network error loading questionnaire"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAnswer = (index: number, val: boolean) => {
    setAnswers((prev) => ({ ...prev, [index]: val }));
  };

  const hasAnyYes = Object.values(answers).some((val) => val === true);
  const allAnswered = data?.questions && Object.keys(answers).length === data.questions.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureName.trim()) {
      alert("Please provide your typed signature (full name)");
      return;
    }

    if (!allAnswered) {
      alert("Please answer all 7 readiness questions (Yes or No)");
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadAnswers = data.questions.map((_: any, idx: number) => ({
        questionIndex: idx,
        answer: !!answers[idx],
      }));

      const res = await fetch(`/api/parq/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureName: signatureName.trim(),
          answers: payloadAnswers,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setSubmittedResult({
          hasRisk: resData.data.hasRisk,
          completedAt: resData.data.completedAt,
          signatureName: signatureName.trim(),
        });
      } else {
        alert(resData.error?.message || "Failed to submit PAR-Q");
      }
    } catch {
      alert("Network error submitting form");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-red-500 mb-3" />
        <p className="text-sm font-bold text-gray-300">Loading Readiness Form...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl p-6 border border-gray-200 text-center shadow-md">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-black text-gray-900">Link Not Available</h2>
          <p className="text-xs text-gray-500 mt-1 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 mx-auto rounded-xl overflow-hidden ring-2 ring-red-600 shadow-md bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Alpha Warriors" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-black text-xl text-gray-900 uppercase tracking-tight">
            {data.gymName}
          </h1>
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest">
            PAR-Q • Physical Activity Readiness
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
          <div className="p-5 bg-slate-950 text-white flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase">Warrior Athlete</p>
              <h2 className="font-extrabold text-base">{data.memberName}</h2>
            </div>
            <HeartPulse className="w-6 h-6 text-red-500" />
          </div>

          {submittedResult ? (
            <div className="p-6 space-y-4 text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <FileCheck2 className="w-8 h-8" />
              </div>
              <h3 className="font-black text-lg text-gray-900">Questionnaire Completed</h3>
              <p className="text-xs text-gray-500">
                Digitally signed by <strong className="text-gray-800">{submittedResult.signatureName}</strong> on{" "}
                {new Date(submittedResult.completedAt).toLocaleDateString()}
              </p>

              {submittedResult.hasRisk ? (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-left text-xs text-amber-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Medical Advisory Notice:
                  </div>
                  <p>
                    Because you answered &quot;Yes&quot; to one or more questions, we strongly recommend that you consult with your physician prior to commencing high-intensity physical activity or personal training.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                  Cleared for physical activity and workouts.
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
              <p className="text-xs text-gray-500 leading-relaxed">
                Please answer the following 7 readiness questions honestly to ensure your safety during physical training.
              </p>

              <div className="space-y-4">
                {data.questions.map((q: string, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50 space-y-2">
                    <p className="text-xs font-semibold text-gray-800 leading-snug">
                      <span className="font-extrabold text-red-600 mr-1.5">{idx + 1}.</span>
                      {q}
                    </p>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAnswer(idx, true)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${
                          answers[idx] === true
                            ? "bg-red-600 text-white border-red-600 shadow-2xs"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAnswer(idx, false)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${
                          answers[idx] === false
                            ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {hasAnyYes && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Medical Attention Notice:</strong> Answering &quot;Yes&quot; to any readiness question indicates you should consult your doctor before starting any physical exercise program.
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Digital Signature (Type your full legal name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                />
                <p className="text-[11px] text-gray-400">
                  By typing your name and pressing submit, you affirm that your answers are truthful and accurate.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !allAnswered}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-md shadow-red-900/20 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Recording Submission...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Submit PAR-Q Readiness Form
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
