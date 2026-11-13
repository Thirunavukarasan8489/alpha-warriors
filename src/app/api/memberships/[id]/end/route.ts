import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, canExecuteMembershipAction } from "@/lib/rbac";
import { Membership, AuditLog } from "@/models";
import { endMembershipSchema } from "@/lib/validation";
import { getStartOfDay } from "@/lib/dates";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  if (!canExecuteMembershipAction(auth.role, "end")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Only owner and manager can terminate memberships" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = endMembershipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Reason is required to end membership",
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

    membership.status = "ended";
    membership.endDate = getStartOfDay(new Date());
    await membership.save();

    await AuditLog.create({
      gymId: auth.gymId,
      userId: auth.userId,
      action: "END_MEMBERSHIP",
      targetType: "membership",
      targetId: id,
      reason: parsed.data.reason,
      metadata: { endedAt: membership.endDate },
    });

    return NextResponse.json({
      data: {
        id: membership._id,
        status: membership.status,
        endDate: membership.endDate,
      },
    });
  } catch (error) {
    console.error("End membership error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to end membership" } },
      { status: 500 }
    );
  }
}

