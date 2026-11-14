import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Invoice, Member } from "@/models";

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
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
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

    if (status && status !== "all") {
      query.status = status;
    }

    if (from || to) {
      const dateQuery: Record<string, Date> = {};
      if (from) dateQuery.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateQuery.$lte = toDate;
      }
      query.issueDate = dateQuery;
    }

    if (search) {
      // Find matching members
      const matchingMembers = await Member.find({
        gymId: auth.gymId,
        $or: [
          { name: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { memberCode: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      const memberIds = matchingMembers.map((m) => m._id);

      query.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { memberId: { $in: memberIds } },
      ];
    }

    const invoices = await Invoice.find(query)
      .sort({ issueDate: -1 })
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
        shareToken: inv.shareToken,
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
