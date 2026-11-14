import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Member, DietPlan, AuditLog } from "@/models";
import { requireAuth } from "@/lib/rbac";
import { z } from "zod";

const dietSchema = z.object({
  title: z.string().min(2).default("Nutrition & Diet Chart"),
  notes: z.string().optional(),
  meals: z.array(
    z.object({
      time: z.string().min(1),
      items: z.string().min(1),
      notes: z.string().optional(),
      calories: z.number().optional(),
      protein: z.number().optional(),
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
    const parsed = dietSchema.safeParse(body);
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
    if (role === "trainer" && member.trainerId && member.trainerId.toString() !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Trainers can only edit diet plans for their own members" } },
        { status: 403 }
      );
    }

    // Deactivate existing diet plans
    await DietPlan.updateMany({ memberId: id, gymId }, { isActive: false });

    // Create new active diet plan
    const newDiet = await DietPlan.create({
      gymId,
      memberId: id,
      title: parsed.data.title,
      notes: parsed.data.notes,
      meals: parsed.data.meals,
      createdBy: userId,
      isActive: true,
    });

    await AuditLog.create({
      gymId,
      userId,
      action: "DIET_PLAN_UPDATED",
      resource: "DietPlan",
      resourceId: newDiet._id.toString(),
      details: { memberId: id, title: newDiet.title },
    });

    return NextResponse.json({
      data: {
        id: newDiet._id.toString(),
        title: newDiet.title,
        meals: newDiet.meals,
      },
    });
  } catch (error: any) {
    console.error("PUT /api/members/[id]/diet error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to save diet plan" } },
      { status: 500 }
    );
  }
}
