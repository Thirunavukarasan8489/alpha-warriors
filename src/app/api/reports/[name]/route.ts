import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import {
  Payment,
  Membership,
  Member,
  Invoice,
  Attendance,
  Plan,
} from "@/models";
import { getStartOfDay, getEndOfDay, formatDate } from "@/lib/dates";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    const { name: reportName } = await params;

    // Role check: Receptionist can only view daily collection, expiring, and dues
    const receptionistAllowed = ["daily_collection", "expiring", "dues"];
    if (auth.role === "receptionist" && !receptionistAllowed.includes(reportName)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have access to this report" } },
        { status: 403 }
      );
    }

    if (auth.role === "trainer") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Trainers cannot view financial reports" } },
        { status: 403 }
      );
    }

    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const branchId = searchParams.get("branchId") || auth.branchId;

    const fromDate = fromStr ? getStartOfDay(fromStr) : getStartOfDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const toDate = toStr ? getEndOfDay(toStr) : getEndOfDay(new Date());

    const scope: Record<string, unknown> = { gymId: auth.gymId };
    if (branchId) scope.branchId = branchId;

    if (reportName === "daily_collection") {
      const payments = await Payment.find({
        ...scope,
        isVoid: false,
        receivedAt: { $gte: fromDate, $lte: toDate },
      }).sort({ receivedAt: -1 });

      const dayGroups = new Map<string, { date: string; cash: number; upi: number; card: number; bank: number; other: number; total: number }>();

      for (const p of payments) {
        const dKey = formatDate(p.receivedAt);
        if (!dayGroups.has(dKey)) {
          dayGroups.set(dKey, { date: dKey, cash: 0, upi: 0, card: 0, bank: 0, other: 0, total: 0 });
        }
        const g = dayGroups.get(dKey)!;
        g.total += p.amount;
        for (const m of p.modes) {
          if (m.mode === "cash") g.cash += m.amount;
          else if (m.mode === "upi") g.upi += m.amount;
          else if (m.mode === "card") g.card += m.amount;
          else if (m.mode === "bank") g.bank += m.amount;
          else g.other += m.amount;
        }
      }

      return NextResponse.json({
        data: {
          title: "Daily Collection",
          rows: Array.from(dayGroups.values()),
        },
      });
    }

    if (reportName === "expiring") {
      const memberships = await Membership.find({
        ...scope,
        endDate: { $gte: fromDate, $lte: toDate },
      })
        .populate("memberId", "name phone memberCode")
        .sort({ endDate: 1 });

      const rows = memberships
        .filter((m) => m.memberId)
        .map((m) => {
          const mem = m.memberId as unknown as { name: string; phone: string; memberCode: string; _id: string };
          return {
            memberId: mem._id,
            memberName: mem.name,
            phone: mem.phone,
            memberCode: mem.memberCode,
            planName: m.planName,
            endDate: m.endDate,
            status: m.status,
          };
        });

      return NextResponse.json({
        data: {
          title: "Expiring & Expired Memberships",
          rows,
        },
      });
    }

    if (reportName === "dues") {
      const invoices = await Invoice.find({
        ...scope,
        balance: { $gt: 0 },
        status: { $ne: "void" },
      })
        .populate("memberId", "name phone memberCode")
        .sort({ issueDate: 1 });

      const rows = invoices
        .filter((inv) => inv.memberId)
        .map((inv) => {
          const mem = inv.memberId as unknown as { name: string; phone: string; memberCode: string; _id: string };
          return {
            memberId: mem._id,
            memberName: mem.name,
            phone: mem.phone,
            memberCode: mem.memberCode,
            invoiceNumber: inv.invoiceNumber,
            totalAmount: inv.totalAmount,
            paidAmount: inv.paidAmount,
            balance: inv.balance,
            issueDate: inv.issueDate,
          };
        });

      return NextResponse.json({
        data: {
          title: "Dues Report",
          rows,
        },
      });
    }

    if (reportName === "new_members") {
      const members = await Member.find({
        ...scope,
        isDeleted: false,
        joinedAt: { $gte: fromDate, $lte: toDate },
      }).sort({ joinedAt: -1 });

      const dayGroups = new Map<string, number>();
      for (const m of members) {
        const dKey = formatDate(m.joinedAt);
        dayGroups.set(dKey, (dayGroups.get(dKey) || 0) + 1);
      }

      return NextResponse.json({
        data: {
          title: "New Members Joined",
          rows: Array.from(dayGroups.entries()).map(([date, count]) => ({ date, count })),
        },
      });
    }

    if (reportName === "revenue_by_plan") {
      const memberships = await Membership.find({
        ...scope,
        createdAt: { $gte: fromDate, $lte: toDate },
      });

      const planMap = new Map<string, { planName: string; count: number; totalRevenue: number }>();
      for (const m of memberships) {
        const pName = m.planName;
        if (!planMap.has(pName)) {
          planMap.set(pName, { planName: pName, count: 0, totalRevenue: 0 });
        }
        const item = planMap.get(pName)!;
        item.count += 1;
        item.totalRevenue += m.finalAmount;
      }

      return NextResponse.json({
        data: {
          title: "Revenue by Plan",
          rows: Array.from(planMap.values()),
        },
      });
    }

    if (reportName === "attendance_summary") {
      const attendance = await Attendance.find({
        ...scope,
        checkInAt: { $gte: fromDate, $lte: toDate },
      });

      const dayMap = new Map<string, number>();
      for (const a of attendance) {
        const dKey = formatDate(a.checkInAt);
        dayMap.set(dKey, (dayMap.get(dKey) || 0) + 1);
      }

      return NextResponse.json({
        data: {
          title: "Attendance Summary",
          rows: Array.from(dayMap.entries()).map(([date, checkIns]) => ({ date, checkIns })),
        },
      });
    }

    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: `Unknown report: ${reportName}` } },
      { status: 404 }
    );
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to generate report" } },
      { status: 500 }
    );
  }
}

