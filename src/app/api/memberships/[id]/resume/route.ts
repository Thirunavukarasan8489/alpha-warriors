import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, canExecuteMembershipAction } from "@/lib/rbac";
import { Membership, AuditLog } from "@/models";
import { resumeMembershipSchema } from "@/lib/validation";
import { getStartOfDay, diffInDays, addDays } from "@/lib/dates";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  if (!canExecuteMembershipAction(auth.role, "resume")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Not permitted to resume membership" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = resumeMembershipSchema.safeParse(body);

    await connectDB();

    const membership = await Membership.findOne({ _id: id, gymId: auth.gymId });
    if (!membership) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Membership not found" } },
        { status: 404 }
      );
    }

    if (membership.status !== "frozen") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Membership is not currently frozen" } },
        { status: 400 }
      );
    }

    const resumeDate = parsed.success && parsed.data.resumeDate
      ? getStartOfDay(parsed.data.resumeDate)
      : getStartOfDay(new Date());

    // Calculate frozen duration
    const frozenStart = membership.frozenAt || resumeDate;
    const daysFrozen = Math.max(0, diffInDays(resumeDate, frozenStart));

    // Shift end date forward by the number of days frozen
    const newEndDate = addDays(new Date(membership.endDate), daysFrozen);

    membership.status = "active";
    membership.endDate = newEndDate;
    membership.frozenAt = undefined;
    membership.expectedResumeDate = undefined;
    await membership.save();

    await AuditLog.create({
      gymId: auth.gymId,
      userId: auth.userId,
      action: "RESUME_MEMBERSHIP",
      targetType: "membership",
      targetId: id,
      reason: `Resumed after ${daysFrozen} days frozen`,
      metadata: { resumeDate, daysFrozen, newEndDate },
    });

    return NextResponse.json({
      data: {
        id: membership._id,
        status: membership.status,
        daysFrozen,
        newEndDate,
      },
    });
  } catch (error) {
    console.error("Resume membership error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to resume membership" } },
      { status: 500 }
    );
  }
}

