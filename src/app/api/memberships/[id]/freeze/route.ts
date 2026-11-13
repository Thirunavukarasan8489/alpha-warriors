import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, canExecuteMembershipAction } from "@/lib/rbac";
import { Membership, AuditLog } from "@/models";
import { freezeMembershipSchema } from "@/lib/validation";
import { getStartOfDay } from "@/lib/dates";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  if (!canExecuteMembershipAction(auth.role, "freeze")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Not permitted to freeze membership" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = freezeMembershipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid freeze request",
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

    const freezeDate = parsed.data.startDate ? getStartOfDay(parsed.data.startDate) : getStartOfDay(new Date());

    membership.status = "frozen";
    membership.frozenAt = freezeDate;
    membership.freezeReason = parsed.data.reason;
    if (parsed.data.expectedResumeDate) {
      membership.expectedResumeDate = getStartOfDay(parsed.data.expectedResumeDate);
    }
    await membership.save();

    await AuditLog.create({
      gymId: auth.gymId,
      userId: auth.userId,
      action: "FREEZE_MEMBERSHIP",
      targetType: "membership",
      targetId: id,
      reason: parsed.data.reason,
      metadata: { frozenAt: freezeDate, expectedResumeDate: membership.expectedResumeDate },
    });

    return NextResponse.json({
      data: {
        id: membership._id,
        status: membership.status,
        frozenAt: membership.frozenAt,
      },
    });
  } catch (error) {
    console.error("Freeze membership error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to freeze membership" } },
      { status: 500 }
    );
  }
}

