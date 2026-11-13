import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Attendance, Member, Membership } from "@/models";
import { getStartOfDay, diffInDays } from "@/lib/dates";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const daysThreshold = parseInt(searchParams.get("days") || "7", 10);
    const branchId = searchParams.get("branchId") || auth.branchId;

    const todayStart = getStartOfDay(new Date());

    // 1. Find all members with currently active memberships
    const activeMemberships = await Membership.find({
      gymId: auth.gymId,
      status: "active",
      endDate: { $gte: todayStart },
    });

    const activeMemberIds = Array.from(new Set(activeMemberships.map((m) => m.memberId.toString())));

    const memberQuery: Record<string, unknown> = {
      _id: { $in: activeMemberIds },
      gymId: auth.gymId,
      isDeleted: false,
    };
    if (branchId) memberQuery.branchId = branchId;
    if (auth.role === "trainer") memberQuery.trainerId = auth.userId;

    const members = await Member.find(memberQuery).select("name phone memberCode photo");

    // 2. For each member, find latest check-in
    const absentMembers = [];

    for (const member of members) {
      const lastCheckIn = await Attendance.findOne({
        gymId: auth.gymId,
        memberId: member._id,
      }).sort({ checkInAt: -1 });

      let daysAbsent: number;
      let lastVisitDate: Date | null = null;

      if (!lastCheckIn) {
        // Never visited
        daysAbsent = 999;
      } else {
        lastVisitDate = lastCheckIn.checkInAt;
        daysAbsent = Math.max(0, diffInDays(todayStart, lastVisitDate));
      }

      if (daysAbsent >= daysThreshold) {
        absentMembers.push({
          member: {
            id: member._id,
            name: member.name,
            phone: member.phone,
            memberCode: member.memberCode,
            photo: member.photo,
          },
          lastVisitDate,
          daysAbsent: daysAbsent === 999 ? "Never" : daysAbsent,
        });
      }
    }

    // Sort by days absent descending
    absentMembers.sort((a, b) => {
      const da = typeof a.daysAbsent === "number" ? a.daysAbsent : 1000;
      const db = typeof b.daysAbsent === "number" ? b.daysAbsent : 1000;
      return db - da;
    });

    return NextResponse.json({
      data: absentMembers,
    });
  } catch (error) {
    console.error("Fetch absent members error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch missed attendance" } },
      { status: 500 }
    );
  }
}

