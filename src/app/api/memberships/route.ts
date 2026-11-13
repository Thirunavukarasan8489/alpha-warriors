import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Membership, Plan, Invoice, Payment, Member } from "@/models";
import { renewMembershipSchema } from "@/lib/validation";
import { addDays, getStartOfDay } from "@/lib/dates";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    const body = await req.json();
    const memberId = body.memberId;
    if (!memberId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "memberId is required" } },
        { status: 422 }
      );
    }

    const parsed = renewMembershipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid renewal data",
          },
        },
        { status: 422 }
      );
    }

    await connectDB();

    const member = await Member.findOne({
      _id: memberId,
      gymId: auth.gymId,
      isDeleted: false,
    });
    if (!member) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Member not found" } },
        { status: 404 }
      );
    }

    const plan = await Plan.findOne({ _id: parsed.data.planId, gymId: auth.gymId });
    if (!plan) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Selected plan not found" } },
        { status: 404 }
      );
    }

    // Find latest membership to determine continuity
    const latestMs = await Membership.findOne({
      gymId: auth.gymId,
      memberId,
    }).sort({ endDate: -1 });

    const todayStart = getStartOfDay(new Date());
    let startDate = todayStart;

    if (parsed.data.startDate) {
      startDate = getStartOfDay(parsed.data.startDate);
    } else if (latestMs && new Date(latestMs.endDate) >= todayStart) {
      // If previous membership is still active/future, start the day after old end date
      startDate = addDays(new Date(latestMs.endDate), 1);
    }

    const endDate = addDays(startDate, plan.durationDays);
    const discount = Math.min(parsed.data.discount || 0, plan.price);
    const finalAmount = Math.max(0, plan.price - discount);

    // Create renewed membership
    const membership = await Membership.create({
      gymId: auth.gymId,
      branchId: auth.branchId,
      memberId,
      planId: plan._id,
      planName: plan.name,
      durationDays: plan.durationDays,
      price: plan.price,
      taxPercent: plan.taxPercent,
      discount,
      finalAmount,
      startDate,
      endDate,
      status: "active",
      renewedFromId: latestMs ? latestMs._id : undefined,
      notes: parsed.data.notes,
    });

    // Create invoice
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const invoice = await Invoice.create({
      gymId: auth.gymId,
      branchId: auth.branchId,
      memberId,
      membershipId: membership._id,
      invoiceNumber,
      totalAmount: finalAmount,
      paidAmount: 0,
      balance: finalAmount,
      issueDate: todayStart,
      status: "unpaid",
      items: [
        {
          description: `Renewal: ${plan.name} (${plan.durationDays} Days)`,
          amount: finalAmount,
        },
      ],
    });

    // Record optional payment
    let payment = null;
    const firstPayment = Math.min(parsed.data.firstPaymentAmount || 0, finalAmount);
    if (firstPayment > 0) {
      const modes = parsed.data.firstPaymentModes && parsed.data.firstPaymentModes.length > 0
        ? parsed.data.firstPaymentModes
        : [{ mode: "cash" as const, amount: firstPayment }];

      const paymentNumber = `RCPT-${Date.now().toString().slice(-6)}`;
      payment = await Payment.create({
        gymId: auth.gymId,
        branchId: auth.branchId,
        memberId,
        invoiceId: invoice._id,
        paymentNumber,
        amount: firstPayment,
        modes,
        receivedAt: new Date(),
        receivedBy: auth.userId,
      });

      invoice.paidAmount = firstPayment;
      invoice.balance = finalAmount - firstPayment;
      invoice.status = invoice.balance === 0 ? "paid" : "partial";
      await invoice.save();
    }

    return NextResponse.json(
      {
        data: {
          membershipId: membership._id,
          invoiceId: invoice._id,
          paymentId: payment?._id || null,
          startDate,
          endDate,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Renew membership error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to renew membership" } },
      { status: 500 }
    );
  }
}

