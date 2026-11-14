import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Member, Gym, Membership, Invoice, Attendance, WorkoutPlan, DietPlan } from "@/models";
import { getDaysDifference, getTodayStartEndUTC } from "@/lib/dates";
import crypto from "crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    await connectDB();

    // Hash the provided token with SHA-256
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const member = await Member.findOne({
      portalTokenHash: tokenHash,
      isDeleted: false,
    }).lean();

    // STRICT RULE: "A revoked or guessed token shows nothing about any member"
    if (!member) {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "This member portal link is no longer valid" } },
        { status: 404 }
      );
    }

    const gymId = member.gymId;

    // Fetch gym public profile
    const gym = await Gym.findById(gymId).select("name logo").lean();

    // Fetch latest membership
    const membership = await Membership.findOne({ memberId: member._id, gymId })
      .populate("planId", "name durationDays price")
      .sort({ createdAt: -1 })
      .lean();

    let planData: any = null;
    if (membership) {
      const now = new Date();
      const isExpired = new Date(membership.endDate) < now;
      const daysLeft = Math.max(0, getDaysDifference(now, new Date(membership.endDate)));

      planData = {
        planName: (membership as any).planId?.name || "Gym Membership",
        startDate: membership.startDate,
        endDate: membership.endDate,
        status: isExpired ? "expired" : membership.status,
        daysLeft,
      };
    }

    // Fetch invoices and dues
    const invoices = await Invoice.find({ memberId: member._id, gymId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const duesPaise = invoices.reduce((sum, inv) => sum + Math.max(0, inv.balance || 0), 0);

    const formattedInvoices = invoices.map((inv) => ({
      id: inv._id.toString(),
      invoiceNumber: inv.invoiceNumber,
      total: inv.totalAmount,
      paidAmount: inv.paidAmount,
      balance: inv.balance,
      status: inv.status,
      shareToken: inv.shareToken,
      date: inv.createdAt,
    }));

    // Fetch attendance stats:
    // Recent 10 check-ins and check-ins this calendar month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyCount = await Attendance.countDocuments({
      memberId: member._id,
      gymId,
      checkInAt: { $gte: startOfMonth },
    });

    const recentAttendance = await Attendance.find({ memberId: member._id, gymId })
      .sort({ checkInAt: -1 })
      .limit(10)
      .lean();

    // Fetch active training routines
    const workoutPlan = await WorkoutPlan.findOne({
      memberId: member._id,
      gymId,
      isActive: true,
    })
      .select("title notes days updatedAt")
      .lean();

    const dietPlan = await DietPlan.findOne({
      memberId: member._id,
      gymId,
      isActive: true,
    })
      .select("title notes meals updatedAt")
      .lean();

    return NextResponse.json({
      data: {
        gym: {
          name: gym?.name || "Alpha Warriors Fitness",
          logo: gym?.logo || "/logo.jpg",
        },
        member: {
          name: member.name,
          memberCode: member.memberCode,
          joinedAt: member.joinedAt,
          photo: member.photo,
        },
        membership: planData,
        dues: {
          totalDuesPaise: duesPaise,
          hasDues: duesPaise > 0,
        },
        invoices: formattedInvoices,
        attendance: {
          monthlyCount,
          recent: recentAttendance.map((a) => ({
            id: a._id.toString(),
            checkInAt: a.checkInAt,
          })),
        },
        workoutPlan: workoutPlan
          ? {
              title: workoutPlan.title,
              notes: workoutPlan.notes,
              days: workoutPlan.days,
            }
          : null,
        dietPlan: dietPlan
          ? {
              title: dietPlan.title,
              notes: dietPlan.notes,
              meals: dietPlan.meals,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error("GET /api/portal/[token] error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to load member portal" } },
      { status: 500 }
    );
  }
}
