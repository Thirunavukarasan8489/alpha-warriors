import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Invoice } from "@/models";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  if (auth.role === "trainer") {
    return NextResponse.json({ data: [] });
  }

  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const memberId = searchParams.get("memberId");
    const unpaidOnly = searchParams.get("unpaidOnly") === "true";
    const branchId = searchParams.get("branchId") || auth.branchId;

    const query: Record<string, unknown> = {
      gymId: auth.gymId,
      status: { $ne: "void" },
    };

    if (memberId) query.memberId = memberId;
    if (branchId) query.branchId = branchId;
    if (unpaidOnly) query.balance = { $gt: 0 };

    const invoices = await Invoice.find(query)
      .sort({ issueDate: 1 })
      .populate("memberId", "name phone memberCode photo");

    return NextResponse.json({
      data: invoices.map((inv) => ({
        id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        member: inv.memberId
          ? {
              id: (inv.memberId as unknown as { _id: string })._id,
              name: (inv.memberId as unknown as { name: string }).name,
              phone: (inv.memberId as unknown as { phone: string }).phone,
              memberCode: (inv.memberId as unknown as { memberCode: string }).memberCode,
              photo: (inv.memberId as unknown as { photo?: string }).photo,
            }
          : null,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        balance: inv.balance,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        status: inv.status,
        items: inv.items,
      })),
    });
  } catch (error) {
    console.error("Fetch invoices error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch invoices" } },
      { status: 500 }
    );
  }
}

