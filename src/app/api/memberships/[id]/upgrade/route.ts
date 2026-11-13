import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, canExecuteMembershipAction } from "@/lib/rbac";
import { Membership, Plan, Invoice, AuditLog } from "@/models";
import { upgradeMembershipSchema } from "@/lib/validation";
import { getStartOfDay, addDays, diffInDays } from "@/lib/dates";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  if (!canExecuteMembershipAction(auth.role, "upgrade")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Only owner and manager can upgrade memberships" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = upgradeMembershipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid upgrade request",
          },
        },
        { status: 422 }
      );
    }

    await connectDB();

    const oldMembership = await Membership.findOne({ _id: id, gymId: auth.gymId });
    if (!oldMembership) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Current membership not found" } },
        { status: 404 }
      );
    }

    const newPlan = await Plan.findOne({ _id: parsed.data.newPlanId, gymId: auth.gymId });
    if (!newPlan) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "New plan not found" } },
        { status: 404 }
      );
    }

    const todayStart = getStartOfDay(new Date());

    // Calculate unused days and credit from old membership
    const totalDays = Math.max(1, oldMembership.durationDays);
    const daysLeft = Math.max(0, diffInDays(oldMembership.endDate, todayStart));
    const pricePaid = oldMembership.finalAmount; // in paise
    const creditAmount = Math.min(pricePaid, Math.round((pricePaid / totalDays) * daysLeft));

    const upgradeInvoiceAmount = Math.max(0, newPlan.price - creditAmount);

    // End old membership today
    oldMembership.status = "ended";
    oldMembership.endDate = todayStart;
    await oldMembership.save();

    // Create new membership starting today
    const newEndDate = addDays(todayStart, newPlan.durationDays);
    const newMembership = await Membership.create({
      gymId: auth.gymId,
      branchId: auth.branchId,
      memberId: oldMembership.memberId,
      planId: newPlan._id,
      planName: newPlan.name,
      durationDays: newPlan.durationDays,
      price: newPlan.price,
      taxPercent: newPlan.taxPercent,
      discount: creditAmount,
      finalAmount: upgradeInvoiceAmount,
      startDate: todayStart,
      endDate: newEndDate,
      status: "active",
      notes: `Upgraded from ${oldMembership.planName} (credit: ₹${creditAmount / 100})`,
    });

    // Create invoice for difference
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const invoice = await Invoice.create({
      gymId: auth.gymId,
      branchId: auth.branchId,
      memberId: oldMembership.memberId,
      membershipId: newMembership._id,
      invoiceNumber,
      totalAmount: upgradeInvoiceAmount,
      paidAmount: 0,
      balance: upgradeInvoiceAmount,
      issueDate: todayStart,
      status: upgradeInvoiceAmount === 0 ? "paid" : "unpaid",
      items: [
        {
          description: `Upgrade to ${newPlan.name} (Credit: ₹${creditAmount / 100})`,
          amount: upgradeInvoiceAmount,
        },
      ],
    });

    await AuditLog.create({
      gymId: auth.gymId,
      userId: auth.userId,
      action: "UPGRADE_MEMBERSHIP",
      targetType: "membership",
      targetId: id,
      reason: `Upgraded to plan: ${newPlan.name}`,
      metadata: {
        oldMembershipId: id,
        newMembershipId: newMembership._id,
        creditAmount,
        invoiceId: invoice._id,
      },
    });

    return NextResponse.json({
      data: {
        oldMembershipId: id,
        newMembershipId: newMembership._id,
        invoiceId: invoice._id,
        creditAmount,
        payableAmount: upgradeInvoiceAmount,
      },
    });
  } catch (error) {
    console.error("Upgrade membership error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to upgrade membership" } },
      { status: 500 }
    );
  }
}

