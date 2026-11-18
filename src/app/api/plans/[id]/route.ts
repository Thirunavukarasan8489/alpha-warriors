import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, canManagePlans } from "@/lib/rbac";
import { Plan, Membership } from "@/models";
import { planSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  if (!canManagePlans(auth.role)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Only owner and manager can edit plans" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = planSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid plan details",
          },
        },
        { status: 422 }
      );
    }

    await connectDB();

    const plan = await Plan.findOneAndUpdate(
      { _id: id, gymId: auth.gymId },
      { $set: parsed.data },
      { new: true }
    );

    if (!plan) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Plan not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: plan._id,
        name: plan.name,
        durationDays: plan.durationDays,
        price: plan.price,
        admissionFee: plan.admissionFee || 0,
        taxPercent: plan.taxPercent,
        sessions: plan.sessions,
        isActive: plan.isActive,
      },
    });
  } catch (error) {
    console.error("Update plan error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to update plan" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  if (!canManagePlans(auth.role)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Only owner and manager can delete plans" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    await connectDB();

    // Check if any membership uses this plan
    const usedCount = await Membership.countDocuments({
      gymId: auth.gymId,
      planId: id,
    });

    if (usedCount > 0) {
      // Deactivate instead of deleting to preserve history
      await Plan.findOneAndUpdate(
        { _id: id, gymId: auth.gymId },
        { $set: { isActive: false } }
      );
      return NextResponse.json({
        data: {
          deactivated: true,
          message: "Plan is associated with existing memberships. It has been deactivated instead of deleted.",
        },
      });
    }

    const deleted = await Plan.findOneAndDelete({ _id: id, gymId: auth.gymId });

    if (!deleted) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Plan not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Delete plan error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to delete plan" } },
      { status: 500 }
    );
  }
}

