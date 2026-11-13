import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, canExecuteMembershipAction } from "@/lib/rbac";
import { Membership, AuditLog } from "@/models";
import { extendMembershipSchema } from "@/lib/validation";
import { addDays } from "@/lib/dates";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  if (!canExecuteMembershipAction(auth.role, "extend")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Only owner and manager can extend memberships" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = extendMembershipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid extension details",
          },
        },
        { status: 422 }
      );
    }

    await connectDB();

    const membership = await Membership.findOne({ _id: id, gymId: auth.gymId });
    if (!membership) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Membership not found" } },
        { status: 404 }
      );
    }

    const newEndDate = addDays(new Date(membership.endDate), parsed.data.days);
    membership.endDate = newEndDate;
    await membership.save();

    await AuditLog.create({
      gymId: auth.gymId,
      userId: auth.userId,
      action: "EXTEND_MEMBERSHIP",
      targetType: "membership",
      targetId: id,
      reason: parsed.data.reason,
      metadata: { daysAdded: parsed.data.days, newEndDate },
    });

    return NextResponse.json({
      data: {
        id: membership._id,
        endDate: membership.endDate,
        daysAdded: parsed.data.days,
      },
    });
  } catch (error) {
    console.error("Extend membership error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to extend membership" } },
      { status: 500 }
    );
  }
}

