import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, canVoidPayments } from "@/lib/rbac";
import { Payment, Invoice, AuditLog } from "@/models";
import { voidPaymentSchema } from "@/lib/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  if (!canVoidPayments(auth.role)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Only owner and manager can void payments" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = voidPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Reason is required to void payment",
          },
        },
        { status: 422 }
      );
    }

    await connectDB();

    const payment = await Payment.findOne({ _id: id, gymId: auth.gymId });
    if (!payment) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Payment not found" } },
        { status: 404 }
      );
    }

    if (payment.isVoid) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "This payment has already been voided" } },
        { status: 400 }
      );
    }

    // 1. Mark payment as void
    payment.isVoid = true;
    payment.voidReason = parsed.data.reason;
    payment.voidAt = new Date();
    payment.voidBy = auth.userId as unknown as import("mongoose").Types.ObjectId;
    await payment.save();

    // 2. Restore invoice balance
    const invoice = await Invoice.findById(payment.invoiceId);
    if (invoice) {
      invoice.paidAmount = Math.max(0, invoice.paidAmount - payment.amount);
      invoice.balance = invoice.totalAmount - invoice.paidAmount;
      invoice.status = invoice.paidAmount === 0 ? "unpaid" : "partial";
      await invoice.save();
    }

    // 3. Write audit log
    await AuditLog.create({
      gymId: auth.gymId,
      userId: auth.userId,
      action: "VOID_PAYMENT",
      targetType: "payment",
      targetId: id,
      reason: parsed.data.reason,
      metadata: {
        paymentNumber: payment.paymentNumber,
        amount: payment.amount,
        invoiceId: payment.invoiceId,
        newInvoiceBalance: invoice?.balance,
      },
    });

    return NextResponse.json({
      data: {
        id: payment._id,
        isVoid: true,
        restoredInvoiceBalance: invoice?.balance,
      },
    });
  } catch (error) {
    console.error("Void payment error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to void payment" } },
      { status: 500 }
    );
  }
}

