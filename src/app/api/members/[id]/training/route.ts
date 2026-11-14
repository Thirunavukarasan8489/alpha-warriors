import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Member, Membership, Plan, WorkoutPlan, DietPlan, PTSession, PARQForm } from "@/models";
import { requireAuth } from "@/lib/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner", "manager", "receptionist", "trainer"]);
  if ("response" in authResult) return authResult.response;
  const { gymId, role, userId } = authResult.auth;
  const { id } = await params;

  try {
    await connectDB();
    const member = await Member.findOne({ _id: id, gymId, isDeleted: false })
      .populate("trainerId", "name")
      .lean();

    if (!member) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Member not found" } },
        { status: 404 }
      );
    }

    // Security Check: Trainer can view training details for assigned or unassigned members (never other trainers' members)
    if (role === "trainer") {
      const assignedTrainerId = (member as any).trainerId?._id?.toString() || (member as any).trainerId?.toString();
      if (assignedTrainerId && assignedTrainerId !== userId) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Trainers can only view training details for their own members" } },
          { status: 403 }
        );
      }
    }

    // Fetch active membership to check total sessions
    const membership = await Membership.findOne({
      memberId: id,
      gymId,
      status: { $in: ["active", "frozen"] },
    })
      .populate("planId", "name sessions")
      .sort({ createdAt: -1 })
      .lean();

    const planSessionsTotal = (membership as any)?.planId?.sessions || 0;

    // Fetch active workout plan
    const workoutPlan = await WorkoutPlan.findOne({
      memberId: id,
      gymId,
      isActive: true,
    })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Fetch active diet plan
    const dietPlan = await DietPlan.findOne({
      memberId: id,
      gymId,
      isActive: true,
    })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Fetch PT sessions
    const ptSessions = await PTSession.find({
      memberId: id,
      gymId,
    })
      .populate("trainerId", "name")
      .sort({ date: -1 })
      .lean();

    // Fetch latest completed PAR-Q form
    const parqForm = await PARQForm.findOne({
      memberId: id,
      gymId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const sessionsUsed = ptSessions.length;
    const sessionsRemaining = planSessionsTotal > 0 ? Math.max(0, planSessionsTotal - sessionsUsed) : null;

    return NextResponse.json({
      data: {
        member: {
          id: member._id.toString(),
          name: member.name,
          phone: member.phone,
          memberCode: member.memberCode,
          trainer: (member as any).trainerId ? { name: (member as any).trainerId.name } : null,
        },
        plan: membership
          ? {
              name: (membership as any).planId?.name,
              totalSessions: planSessionsTotal,
              sessionsUsed,
              sessionsRemaining,
            }
          : null,
        workoutPlan: workoutPlan
          ? {
              id: workoutPlan._id.toString(),
              title: workoutPlan.title,
              notes: workoutPlan.notes,
              days: workoutPlan.days,
              createdBy: (workoutPlan as any).createdBy?.name,
              updatedAt: workoutPlan.updatedAt,
            }
          : null,
        dietPlan: dietPlan
          ? {
              id: dietPlan._id.toString(),
              title: dietPlan.title,
              notes: dietPlan.notes,
              meals: dietPlan.meals,
              createdBy: (dietPlan as any).createdBy?.name,
              updatedAt: dietPlan.updatedAt,
            }
          : null,
        ptSessions: ptSessions.map((s: any) => ({
          id: s._id.toString(),
          date: s.date,
          trainerName: s.trainerId?.name || "Trainer",
          notes: s.notes,
        })),
        parqForm: parqForm
          ? {
              id: parqForm._id.toString(),
              token: parqForm.token,
              isCompleted: parqForm.isCompleted,
              hasRisk: parqForm.hasRisk,
              completedAt: parqForm.completedAt,
              signatureName: parqForm.signatureName,
              answers: parqForm.answers,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error("GET /api/members/[id]/training error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch training data" } },
      { status: 500 }
    );
  }
}
