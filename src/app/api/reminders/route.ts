import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Membership, Invoice, Message, Gym } from "@/models";
import { getTodayStartEndUTC } from "@/lib/dates";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get("type") || "expiring";

  try {
    await connectDB();

    const gym = await Gym.findById(auth.gymId);
    const expiringSoonDays = gym?.settings?.expiringSoonDays || 3;

    const now = new Date();
    const { start: todayStart } = getTodayStartEndUTC();

    // 1. Calculate count for Expiring Soon (ending in next 3 days)
    const expiringTarget = new Date();
    expiringTarget.setDate(expiringTarget.getDate() + expiringSoonDays);

    const expiringMemberships = await Membership.find({
      gymId: auth.gymId,
      status: "active",
      endDate: { $gte: now, $lte: expiringTarget },
    })
      .sort({ endDate: 1 })
      .populate("memberId", "name phone photo memberCode");

    // 2. Calculate count for Expired (ended in last 3 days)
    const expiredPastTarget = new Date();
    expiredPastTarget.setDate(expiredPastTarget.getDate() - 3);

    const expiredMemberships = await Membership.find({
      gymId: auth.gymId,
      endDate: { $gte: expiredPastTarget, $lt: now },
      status: { $in: ["active", "expired"] },
    })
      .sort({ endDate: -1 })
      .populate("memberId", "name phone photo memberCode");

    // 3. Calculate count for Pending Dues (invoices with balance > 0)
    const duesInvoices = await Invoice.find({
      gymId: auth.gymId,
      balance: { $gt: 0 },
      status: { $ne: "void" },
    })
      .sort({ issueDate: 1 })
      .populate("memberId", "name phone photo memberCode");

    // Find messages shared today to mark rows as reminded
    const todayMessages = await Message.find({
      gymId: auth.gymId,
      sharedAt: { $gte: todayStart },
    }).populate("sharedBy", "name");

    const messageMap = new Map<string, { sharedAt: Date; sharedByName?: string }>();
    for (const msg of todayMessages) {
      const key = `${msg.memberId.toString()}_${msg.type}`;
      messageMap.set(key, {
        sharedAt: msg.sharedAt,
        sharedByName: (msg.sharedBy as any)?.name || "Staff",
      });
    }

    // Format output based on requested tab
    let items: any[] = [];

    if (type === "expiring") {
      items = expiringMemberships
        .filter((ms) => ms.memberId)
        .map((ms) => {
          const m = ms.memberId as any;
          const reminderInfo = messageMap.get(`${m._id.toString()}_reminder_expiring`);
          const daysLeft = Math.ceil(
            (new Date(ms.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          return {
            id: ms._id,
            type: "expiring",
            member: {
              id: m._id,
              name: m.name,
              phone: m.phone,
              memberCode: m.memberCode,
              photo: m.photo,
            },
            planName: ms.planName,
            endDate: ms.endDate,
            daysLeft: Math.max(0, daysLeft),
            remindedToday: !!reminderInfo,
            remindedAt: reminderInfo?.sharedAt,
            remindedByName: reminderInfo?.sharedByName,
          };
        });
    } else if (type === "expired") {
      items = expiredMemberships
        .filter((ms) => ms.memberId)
        .map((ms) => {
          const m = ms.memberId as any;
          const reminderInfo = messageMap.get(`${m._id.toString()}_reminder_expired`);
          const daysExpired = Math.max(
            1,
            Math.ceil((now.getTime() - new Date(ms.endDate).getTime()) / (1000 * 60 * 60 * 24))
          );

          return {
            id: ms._id,
            type: "expired",
            member: {
              id: m._id,
              name: m.name,
              phone: m.phone,
              memberCode: m.memberCode,
              photo: m.photo,
            },
            planName: ms.planName,
            endDate: ms.endDate,
            daysExpired,
            remindedToday: !!reminderInfo,
            remindedAt: reminderInfo?.sharedAt,
            remindedByName: reminderInfo?.sharedByName,
          };
        });
    } else if (type === "dues") {
      items = duesInvoices
        .filter((inv) => inv.memberId)
        .map((inv) => {
          const m = inv.memberId as any;
          const reminderInfo = messageMap.get(`${m._id.toString()}_reminder_dues`);
          const daysOverdue = Math.max(
            0,
            Math.ceil((now.getTime() - new Date(inv.issueDate).getTime()) / (1000 * 60 * 60 * 24))
          );

          return {
            id: inv._id,
            type: "dues",
            member: {
              id: m._id,
              name: m.name,
              phone: m.phone,
              memberCode: m.memberCode,
              photo: m.photo,
            },
            invoiceNumber: inv.invoiceNumber,
            balance: inv.balance,
            totalAmount: inv.totalAmount,
            issueDate: inv.issueDate,
            daysOverdue,
            remindedToday: !!reminderInfo,
            remindedAt: reminderInfo?.sharedAt,
            remindedByName: reminderInfo?.sharedByName,
          };
        });
    }

    return NextResponse.json({
      data: {
        items,
        counts: {
          expiring: expiringMemberships.length,
          expired: expiredMemberships.length,
          dues: duesInvoices.length,
        },
        gymName: gym?.name || "Alpha Warriors",
      },
    });
  } catch (error) {
    console.error("Fetch reminders error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to load reminders" } },
      { status: 500 }
    );
  }
}
