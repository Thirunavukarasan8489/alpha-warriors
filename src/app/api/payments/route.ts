import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Payment, Invoice, Member } from "@/models";
import { collectPaymentSchema } from "@/lib/validation";
import { getStartOfDay, getEndOfDay } from "@/lib/dates";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  // Trainer cannot see payments
  if (auth.role === "trainer") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Trainers cannot view payments" } },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const mode = searchParams.get("mode");
    const branchId = searchParams.get("branchId") || auth.branchId;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "50", 10)));

    const query: Record<string, unknown> = {
      gymId: auth.gymId,
    };

    if (branchId) {
      query.branchId = branchId;
    }

    if (from || to) {
      const dateFilter: Record<string, unknown> = {};
      if (from) dateFilter.$gte = getStartOfDay(from);
      if (to) dateFilter.$lte = getEndOfDay(to);
      query.receivedAt = dateFilter;
    }

    if (mode && mode !== "all") {
      query["modes.mode"] = mode;
    }

    const totalCount = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .sort({ receivedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("memberId", "name phone memberCode photo")
      .populate("invoiceId", "invoiceNumber")
      .populate("receivedBy", "name");

    // Calculate totals across the filtered range for non-void payments
    const nonVoidQuery = { ...query, isVoid: false };
    const allFiltered = await Payment.find(nonVoidQuery).select("amount modes");

    let totalReceived = 0;
    const modeTotals: Record<string, number> = {
      cash: 0,
      upi: 0,
      card: 0,
      bank: 0,
      other: 0,
    };

    for (const p of allFiltered) {
      totalReceived += p.amount;
      for (const m of p.modes) {
        if (modeTotals[m.mode] !== undefined) {
          modeTotals[m.mode] += m.amount;
        } else {
          modeTotals.other += m.amount;
        }
      }
    }

    return NextResponse.json({
      data: payments.map((p) => ({
        id: p._id,
        paymentNumber: p.paymentNumber,
        amount: p.amount,
        modes: p.modes,
        receivedAt: p.receivedAt,
        receivedByName: (p.receivedBy as unknown as { name: string })?.name || "Staff",
        isVoid: p.isVoid,
        voidReason: p.voidReason,
        voidAt: p.voidAt,
        notes: p.notes,
        member: p.memberId
          ? {
              id: (p.memberId as unknown as { _id: string })._id,
              name: (p.memberId as unknown as { name: string }).name,
              phone: (p.memberId as unknown as { phone: string }).phone,
              memberCode: (p.memberId as unknown as { memberCode: string }).memberCode,
              photo: (p.memberId as unknown as { photo?: string }).photo,
            }
          : null,
        invoiceNumber: (p.invoiceId as unknown as { invoiceNumber?: string })?.invoiceNumber || "—",
      })),
      totals: {
        totalReceived,
        byMode: modeTotals,
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Fetch payments error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch payments" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(["owner", "manager", "receptionist"]);
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    const body = await req.json();
    const parsed = collectPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid payment details",
          },
        },
        { status: 422 }
      );
    }

    await connectDB();

    const { memberId, invoiceId, amount, modes, notes, receivedAt } = parsed.data;

    // Validate mode sum equals amount exactly
    const modeSum = modes.reduce((acc, m) => acc + m.amount, 0);
    if (modeSum !== amount) {
      return NextResponse.json(
        {
          error: {
            code: "MODE_SUM_MISMATCH",
            message: `Mode amounts sum to ₹${modeSum / 100}, but payment total is ₹${amount / 100}`,
          },
        },
        { status: 422 }
      );
    }

    // Verify invoice
    const invoice = await Invoice.findOne({ _id: invoiceId, gymId: auth.gymId });
    if (!invoice) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Invoice not found" } },
        { status: 404 }
      );
    }

    if (invoice.status === "void") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Cannot collect payment on a void invoice" } },
        { status: 400 }
      );
    }

    // Amount cannot exceed invoice balance (no advance payments in Phase 1 per screen 06)
    if (amount > invoice.balance) {
      return NextResponse.json(
        {
          error: {
            code: "AMOUNT_EXCEEDS_BALANCE",
            message: `Amount (₹${amount / 100}) cannot exceed unpaid invoice balance (₹${invoice.balance / 100})`,
          },
        },
        { status: 422 }
      );
    }

    // Date: only owner and manager can backdate
    let finalReceivedDate = new Date();
    if (receivedAt && (auth.role === "owner" || auth.role === "manager")) {
      finalReceivedDate = new Date(receivedAt);
    }

    const paymentNumber = `RCPT-${Date.now().toString().slice(-6)}`;
    const payment = await Payment.create({
      gymId: auth.gymId,
      branchId: invoice.branchId || auth.branchId,
      memberId,
      invoiceId,
      paymentNumber,
      amount,
      modes,
      receivedAt: finalReceivedDate,
      receivedBy: auth.userId,
      notes,
    });

    // Update invoice
    invoice.paidAmount += amount;
    invoice.balance = Math.max(0, invoice.totalAmount - invoice.paidAmount);
    invoice.status = invoice.balance === 0 ? "paid" : "partial";
    await invoice.save();

    return NextResponse.json(
      {
        data: {
          id: payment._id,
          paymentNumber: payment.paymentNumber,
          amount: payment.amount,
          balanceRemaining: invoice.balance,
          invoiceNumber: invoice.invoiceNumber,
          receivedAt: payment.receivedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Collect payment error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to record payment" } },
      { status: 500 }
    );
  }
}

