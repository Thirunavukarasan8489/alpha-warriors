import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import {
  Payment,
  Member,
  Membership,
  Attendance,
  Invoice,
  Gym,
  Plan,
} from "@/models";
import { getStartOfDay, getEndOfDay, addDays } from "@/lib/dates";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const branchId = searchParams.get("branchId") || auth.branchId;

    const gym = await Gym.findById(auth.gymId);
    const expiringSoonDays = gym?.settings?.expiringSoonDays || 7;

    const todayStart = getStartOfDay(new Date());
    const todayEnd = getEndOfDay(new Date());

    // 7 days from now
    const sevenDaysLater = addDays(todayStart, expiringSoonDays);

    // This week start (7 days ago)
    const weekStart = addDays(todayStart, -7);

    // This month start (30 days ago)
    const monthStart = addDays(todayStart, -30);

    // Base scoping
    const scopeQuery: Record<string, unknown> = { gymId: auth.gymId };
    if (branchId) scopeQuery.branchId = branchId;

    // 1. Today's collection
    const paymentsToday = await Payment.find({
      ...scopeQuery,
      isVoid: false,
      receivedAt: { $gte: todayStart, $lte: todayEnd },
    }).select("amount");
    const todayCollection = paymentsToday.reduce((acc, p) => acc + p.amount, 0);

    // 2. New members counts
    const [newMembersThisWeek, newMembersThisMonth, totalMembersCount] = await Promise.all([
      Member.countDocuments({ ...scopeQuery, isDeleted: false, joinedAt: { $gte: weekStart } }),
      Member.countDocuments({ ...scopeQuery, isDeleted: false, joinedAt: { $gte: monthStart } }),
      Member.countDocuments({ ...scopeQuery, isDeleted: false }),
    ]);

    // 3. Check-ins today
    const checkInsTodayCount = await Attendance.countDocuments({
      ...scopeQuery,
      checkInAt: { $gte: todayStart, $lte: todayEnd },
    });

    // 4. Expiring soon count and top 5 rows
    const expiringMemberships = await Membership.find({
      ...scopeQuery,
      status: "active",
      endDate: { $gte: todayStart, $lte: sevenDaysLater },
    })
      .sort({ endDate: 1 })
      .limit(5)
      .populate("memberId", "name phone memberCode photo");

    const expiringCount = await Membership.countDocuments({
      ...scopeQuery,
      status: "active",
      endDate: { $gte: todayStart, $lte: sevenDaysLater },
    });

    const expiringSoonList = expiringMemberships
      .filter((m) => m.memberId)
      .map((m) => {
        const mem = m.memberId as unknown as {
          _id: string;
          name: string;
          phone: string;
          memberCode: string;
          photo?: string;
        };
        return {
          membershipId: m._id,
          memberId: mem._id,
          name: mem.name,
          phone: mem.phone,
          memberCode: mem.memberCode,
          photo: mem.photo,
          planName: m.planName,
          endDate: m.endDate,
        };
      });

    // 5. Total dues
    let totalDues = 0;
    if (auth.role !== "trainer") {
      const unpaidInvoices = await Invoice.find({
        ...scopeQuery,
        balance: { $gt: 0 },
        status: { $ne: "void" },
      }).select("balance");
      totalDues = unpaidInvoices.reduce((acc, inv) => acc + inv.balance, 0);
    }

    // 6. Recent 5 payments
    let recentPayments: unknown[] = [];
    if (auth.role !== "trainer") {
      const recent = await Payment.find({ ...scopeQuery, isVoid: false })
        .sort({ receivedAt: -1 })
        .limit(5)
        .populate("memberId", "name phone memberCode photo");

      recentPayments = recent.map((p) => ({
        id: p._id,
        paymentNumber: p.paymentNumber,
        amount: p.amount,
        modes: p.modes,
        receivedAt: p.receivedAt,
        member: p.memberId
          ? {
              id: (p.memberId as unknown as { _id: string })._id,
              name: (p.memberId as unknown as { name: string }).name,
              phone: (p.memberId as unknown as { phone: string }).phone,
              memberCode: (p.memberId as unknown as { memberCode: string }).memberCode,
              photo: (p.memberId as unknown as { photo?: string }).photo,
            }
          : null,
      }));
    }

    // 7. Revenue chart (last 6 months) - hidden from receptionist and trainer
    let revenueChart: { month: string; amount: number }[] | null = null;
    if (auth.role === "owner" || auth.role === "manager") {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      const pastPayments = await Payment.find({
        ...scopeQuery,
        isVoid: false,
        receivedAt: { $gte: getStartOfDay(sixMonthsAgo) },
      }).select("amount receivedAt");

      const monthsMap = new Map<string, number>();
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleString("en-IN", { month: "short" });
        monthsMap.set(key, 0);
      }

      for (const p of pastPayments) {
        const mKey = new Date(p.receivedAt).toLocaleString("en-IN", { month: "short" });
        if (monthsMap.has(mKey)) {
          monthsMap.set(mKey, (monthsMap.get(mKey) || 0) + p.amount);
        }
      }

      revenueChart = Array.from(monthsMap.entries()).map(([month, amount]) => ({
        month,
        amount,
      }));
    }

    // 8. First-run checklist condition
    const plansCount = await Plan.countDocuments({ gymId: auth.gymId });
    const isFirstRun = plansCount === 0 || totalMembersCount === 0;

    return NextResponse.json({
      data: {
        gymName: gym?.name || "Alpha Warriors",
        stats: {
          todayCollection: auth.role === "trainer" ? 0 : todayCollection,
          newMembersWeek: newMembersThisWeek,
          newMembersMonth: newMembersThisMonth,
          checkInsToday: checkInsTodayCount,
          expiringIn7Days: expiringCount,
          duesTotal: totalDues,
        },
        expiringSoonList,
        recentPayments,
        revenueChart,
        isFirstRun,
        checklist: isFirstRun
          ? {
              hasPlan: plansCount > 0,
              hasMember: totalMembersCount > 0,
              hasPayment: (await Payment.countDocuments({ gymId: auth.gymId })) > 0,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to load dashboard data" } },
      { status: 500 }
    );
  }
}

