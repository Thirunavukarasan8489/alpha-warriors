import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Invoice, Payment, Gym } from "@/models";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  const { id } = await params;

  try {
    await connectDB();

    const invoice = await Invoice.findOne({
      _id: id,
      gymId: auth.gymId,
    })
      .populate("memberId", "name phone email memberCode address photo")
      .populate("membershipId");

    if (!invoice) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Invoice not found" } },
        { status: 404 }
      );
    }

    // Fetch payments received against this invoice
    const payments = await Payment.find({
      invoiceId: invoice._id,
      gymId: auth.gymId,
    }).sort({ receivedAt: 1 });

    const gym = await Gym.findById(auth.gymId);

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
        shareToken: invoice.shareToken,
        member: invoice.memberId
          ? {
              id: (invoice.memberId as any)._id,
              name: (invoice.memberId as any).name,
              phone: (invoice.memberId as any).phone,
              email: (invoice.memberId as any).email,
              memberCode: (invoice.memberId as any).memberCode,
              address: (invoice.memberId as any).address,
              photo: (invoice.memberId as any).photo,
            }
          : null,
        payments: payments.map((p) => ({
          id: p._id,
          paymentNumber: p.paymentNumber,
          amount: p.amount,
          mode: p.modes && p.modes.length > 0 ? p.modes.map((m: any) => m.mode).join(", ") : "cash",
          receivedAt: p.receivedAt,
          notes: p.notes,
          isVoid: p.isVoid,
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
    console.error("Fetch invoice detail error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch invoice" } },
      { status: 500 }
    );
  }
}
