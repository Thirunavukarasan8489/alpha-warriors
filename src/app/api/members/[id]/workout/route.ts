import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Member, WorkoutPlan, AuditLog } from "@/models";
import { requireAuth } from "@/lib/rbac";
import { z } from "zod";

const workoutSchema = z.object({
  title: z.string().min(2).default("Personalized Workout Routine"),
  notes: z.string().optional(),
  days: z.array(
    z.object({
      day: z.string().min(1),
      exercises: z.array(
        z.object({
          name: z.string().min(1),
          sets: z.number().int().min(1).default(3),
          reps: z.string().default("10-12"),
          notes: z.string().optional(),
        })
      ),
    })
  ),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner", "manager", "trainer"]);
  if ("response" in authResult) return authResult.response;
  const { gymId, role, userId } = authResult.auth;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = workoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 422 }
      );
    }

    await connectDB();
    const member = await Member.findOne({ _id: id, gymId, isDeleted: false });
    if (!member) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Member not found" } },
        { status: 404 }
      );
    }

    // Role check for trainers
    if (role === "trainer" && member.trainerId?.toString() !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Trainers can only edit routines for assigned members" } },
        { status: 403 }
      );
    }

    // Deactivate existing workout plans
    await WorkoutPlan.updateMany({ memberId: id, gymId }, { isActive: false });

    // Create new active workout plan
    const newPlan = await WorkoutPlan.create({
      gymId,
      memberId: id,
      title: parsed.data.title,
      notes: parsed.data.notes,
      days: parsed.data.days,
      createdBy: userId,
      isActive: true,
    });

    await AuditLog.create({
      gymId,
      userId,
      action: "WORKOUT_PLAN_UPDATED",
      resource: "WorkoutPlan",
      resourceId: newPlan._id.toString(),
      details: { memberId: id, title: newPlan.title },
    });

    return NextResponse.json({
      data: {
        id: newPlan._id.toString(),
        title: newPlan.title,
        days: newPlan.days,
      },
    });
  } catch (error: any) {
    console.error("PUT /api/members/[id]/workout error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to save workout plan" } },
      { status: 500 }
    );
  }
}
