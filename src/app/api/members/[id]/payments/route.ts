import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Invoice, Payment } from "@/models";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  // Trainer role cannot see payments per AGENTS.md and screen 05
  if (auth.role === "trainer") {
    return NextResponse.json({
      data: {
        invoices: [],
        payments: [],
      },
    });
  }

  try {
    const { id } = await params;
    await connectDB();

    const [invoices, payments] = await Promise.all([
      Invoice.find({ gymId: auth.gymId, memberId: id }).sort({ issueDate: -1 }),
      Payment.find({ gymId: auth.gymId, memberId: id })
        .populate("receivedBy", "name")
        .sort({ receivedAt: -1 }),
    ]);

    return NextResponse.json({
      data: {
        invoices: invoices.map((inv) => ({
          id: inv._id,
          invoiceNumber: inv.invoiceNumber,
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
          balance: inv.balance,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          status: inv.status,
          items: inv.items,
        })),
        payments: payments.map((p) => ({
          id: p._id,
          paymentNumber: p.paymentNumber,
          invoiceId: p.invoiceId,
          amount: p.amount,
          modes: p.modes,
          receivedAt: p.receivedAt,
          receivedByName: (p.receivedBy as unknown as { name: string })?.name || "Staff",
          isVoid: p.isVoid,
          voidReason: p.voidReason,
          voidAt: p.voidAt,
          notes: p.notes,
        })),
      },
    });
  } catch (error) {
    console.error("Fetch member payments error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch payments" } },
      { status: 500 }
    );
  }
}

