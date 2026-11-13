import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Attendance, Member, Membership, Invoice } from "@/models";
import { attendanceCheckInSchema } from "@/lib/validation";
import { getStartOfDay, getEndOfDay } from "@/lib/dates";
import { resolveEffectiveMembershipStatus } from "@/lib/status";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const dateStr = searchParams.get("date") || new Date().toISOString();
    const branchId = searchParams.get("branchId") || auth.branchId;

    const dayStart = getStartOfDay(dateStr);
    const dayEnd = getEndOfDay(dateStr);

    const query: Record<string, unknown> = {
      gymId: auth.gymId,
      checkInAt: { $gte: dayStart, $lte: dayEnd },
    };

    if (branchId) query.branchId = branchId;

    // Trainer sees check-ins for their members
    if (auth.role === "trainer") {
      const myMembers = await Member.find({ gymId: auth.gymId, trainerId: auth.userId }).select("_id");
      query.memberId = { $in: myMembers.map((m) => m._id) };
    }

    const attendanceRecords = await Attendance.find(query)
      .sort({ checkInAt: -1 })
      .populate("memberId", "name phone memberCode photo")
      .populate("checkedInBy", "name");

    return NextResponse.json({
      data: attendanceRecords.map((a) => ({
        id: a._id,
        checkInAt: a.checkInAt,
        source: a.source,
        member: a.memberId
          ? {
              id: (a.memberId as unknown as { _id: string })._id,
              name: (a.memberId as unknown as { name: string }).name,
              phone: (a.memberId as unknown as { phone: string }).phone,
              memberCode: (a.memberId as unknown as { memberCode: string }).memberCode,
              photo: (a.memberId as unknown as { photo?: string }).photo,
            }
          : null,
        checkedInByName: (a.checkedInBy as unknown as { name?: string })?.name || "Staff",
      })),
      date: dayStart,
    });
  } catch (error) {
    console.error("Fetch attendance error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch attendance" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    const body = await req.json();
    const force = body.force === true;
    const parsed = attendanceCheckInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid check-in details",
          },
        },
        { status: 422 }
      );
    }

    await connectDB();

    const { memberId, source, date } = parsed.data;

    // Check member exists
    const member = await Member.findOne({ _id: memberId, gymId: auth.gymId, isDeleted: false });
    if (!member) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Member not found" } },
        { status: 404 }
      );
    }

    const checkInDate = date ? new Date(date) : new Date();
    const dayStart = getStartOfDay(checkInDate);
    const dayEnd = getEndOfDay(checkInDate);

    // Check duplicate check-in today
    const existingCheckIn = await Attendance.findOne({
      gymId: auth.gymId,
      memberId,
      checkInAt: { $gte: dayStart, $lte: dayEnd },
    });

    if (existingCheckIn && !force) {
      return NextResponse.json(
        {
          warning: {
            code: "ALREADY_CHECKED_IN",
            message: `${member.name} has already checked in today at ${existingCheckIn.checkInAt.toLocaleTimeString()}. Check in again?`,
          },
        },
        { status: 200 }
      );
    }

    // Check member's status and dues for warning banners
    const [latestMs, unpaidInvoices] = await Promise.all([
      Membership.findOne({ gymId: auth.gymId, memberId }).sort({ createdAt: -1 }),
      Invoice.find({ gymId: auth.gymId, memberId, balance: { $gt: 0 }, status: { $ne: "void" } }),
    ]);

    const warnings: string[] = [];
    if (!latestMs) {
      warnings.push("Member has no active membership plan.");
    } else {
      const effective = resolveEffectiveMembershipStatus(latestMs.status, latestMs.endDate);
      if (effective === "expired") {
        warnings.push(`Membership expired on ${new Date(latestMs.endDate).toLocaleDateString()}. Please renew.`);
      } else if (effective === "frozen") {
        warnings.push("Membership is currently frozen.");
      }
    }

    const totalDues = unpaidInvoices.reduce((acc, inv) => acc + inv.balance, 0);
    if (totalDues > 0) {
      warnings.push(`Pending dues: ₹${totalDues / 100}.`);
    }

    const attendance = await Attendance.create({
      gymId: auth.gymId,
      branchId: auth.branchId,
      memberId,
      checkInAt: checkInDate,
      source,
      checkedInBy: auth.userId,
    });

    return NextResponse.json(
      {
        data: {
          id: attendance._id,
          memberId: member._id,
          memberName: member.name,
          checkInAt: attendance.checkInAt,
          source: attendance.source,
          warnings: warnings.length > 0 ? warnings : undefined,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to record check-in" } },
      { status: 500 }
    );
  }
}

