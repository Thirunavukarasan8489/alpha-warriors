import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PARQForm, Member, Gym } from "@/models";
import { z } from "zod";

const PARQ_QUESTIONS = [
  "Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?",
  "Do you feel pain in your chest when you do physical activity?",
  "In the past month, have you had chest pain when you were not doing physical activity?",
  "Do you lose your balance because of dizziness or do you ever lose consciousness?",
  "Do you have a bone or joint problem (for example, back, knee, or hip) that could be made worse by a change in your physical activity?",
  "Is your doctor currently prescribing drugs (for example, water pills) for your blood pressure or heart condition?",
  "Do you know of any other reason why you should not do physical activity?",
];

const submitParqSchema = z.object({
  signatureName: z.string().min(2, "Please provide your full legal name as digital signature").trim(),
  answers: z.array(
    z.object({
      questionIndex: z.number().int().min(0).max(6),
      answer: z.boolean(),
      notes: z.string().optional(),
    })
  ).length(7, "All 7 readiness questions must be answered"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    await connectDB();
    const parq = await PARQForm.findOne({ token })
      .populate("memberId", "name memberCode")
      .populate("gymId", "name")
      .lean();

    if (!parq) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "This health readiness link is invalid or expired" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        isCompleted: parq.isCompleted,
        hasRisk: parq.hasRisk,
        completedAt: parq.completedAt,
        signatureName: parq.signatureName,
        gymName: (parq.gymId as any)?.name || "Alpha Warriors",
        memberName: (parq.memberId as any)?.name || "Warrior",
        questions: PARQ_QUESTIONS,
        answers: parq.answers,
      },
    });
  } catch (error: any) {
    console.error("GET /api/parq/[token] error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to load questionnaire" } },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    await connectDB();
    const parq = await PARQForm.findOne({ token });
    if (!parq) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Questionnaire link not found or expired" } },
        { status: 404 }
      );
    }

    // STRICT RULE: "PAR-Q submissions cannot be edited later, only replaced by a new one"
    if (parq.isCompleted) {
      return NextResponse.json(
        {
          error: {
            code: "ALREADY_SUBMITTED",
            message: "This PAR-Q questionnaire has already been submitted and cannot be modified. Please request a new form link from gym staff if your health status has changed.",
          },
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = submitParqSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 422 }
      );
    }

    const formattedAnswers = parsed.data.answers.map((a) => ({
      questionIndex: a.questionIndex,
      questionText: PARQ_QUESTIONS[a.questionIndex],
      answer: a.answer,
      notes: a.notes,
    }));

    const hasRisk = formattedAnswers.some((a) => a.answer === true);

    parq.answers = formattedAnswers;
    parq.signatureName = parsed.data.signatureName;
    parq.signedDate = new Date();
    parq.completedAt = new Date();
    parq.hasRisk = hasRisk;
    parq.isCompleted = true;

    await parq.save();

    return NextResponse.json({
      data: {
        success: true,
        hasRisk,
        completedAt: parq.completedAt,
        message: hasRisk
          ? "PAR-Q recorded. Based on your responses, we strongly advise consulting with your physician prior to commencing high-intensity physical activity."
          : "PAR-Q recorded. You are cleared for physical training.",
      },
    });
  } catch (error: any) {
    console.error("POST /api/parq/[token] error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to submit questionnaire" } },
      { status: 500 }
    );
  }
}
