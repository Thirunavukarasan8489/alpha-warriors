import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invoice, Payment, Gym } from "@/models";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 8) {
    return NextResponse.json(
      { error: { code: "INVALID_TOKEN", message: "Invalid invoice share link" } },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const invoice = await Invoice.findOne({ shareToken: token })
      .populate("memberId", "name phone email memberCode address")
      .populate("gymId");

    if (!invoice) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Invoice not found or link has expired" } },
        { status: 404 }
      );
    }

    const payments = await Payment.find({
      invoiceId: invoice._id,
      isVoid: false,
    }).sort({ receivedAt: 1 });

    const gym = invoice.gymId as any;

    return NextResponse.json({
      data: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        balance: invoice.balance,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        status: invoice.status,
        items: invoice.items,
        member: invoice.memberId
          ? {
              name: (invoice.memberId as any).name,
              phone: (invoice.memberId as any).phone,
              memberCode: (invoice.memberId as any).memberCode,
              address: (invoice.memberId as any).address,
            }
          : null,
        payments: payments.map((p) => ({
          paymentNumber: p.paymentNumber,
          amount: p.amount,
          mode: p.modes && p.modes.length > 0 ? p.modes.map((m: any) => m.mode).join(", ") : "cash",
          receivedAt: p.receivedAt,
        })),
        gym: gym
          ? {
              name: gym.name,
              phone: gym.phone,
              email: gym.email,
              address: gym.address,
              gstin: gym.gstin,
              state: gym.state,
              logo: gym.logo,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Public invoice fetch error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to load public invoice" } },
      { status: 500 }
    );
  }
}
