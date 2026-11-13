import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Invoice } from "@/models";
import { diffInDays, getStartOfDay } from "@/lib/dates";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  if (auth.role === "trainer") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Trainers cannot view financial dues" } },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const branchId = searchParams.get("branchId") || auth.branchId;

    const query: Record<string, unknown> = {
      gymId: auth.gymId,
      balance: { $gt: 0 },
      status: { $ne: "void" },
    };

    if (branchId) query.branchId = branchId;

    const invoices = await Invoice.find(query)
      .sort({ issueDate: 1 })
      .populate("memberId", "name phone memberCode photo");

    let totalDues = 0;
    const today = getStartOfDay(new Date());

    const duesRows = invoices
      .filter((inv) => inv.memberId)
      .map((inv) => {
        totalDues += inv.balance;
        const daysOverdue = Math.max(0, diffInDays(today, inv.dueDate || inv.issueDate));
        const member = inv.memberId as unknown as {
          _id: string;
          name: string;
          phone: string;
          memberCode: string;
          photo?: string;
        };

        return {
          invoiceId: inv._id,
          invoiceNumber: inv.invoiceNumber,
          balance: inv.balance,
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          daysOverdue,
          member: {
            id: member._id,
            name: member.name,
            phone: member.phone,
            memberCode: member.memberCode,
            photo: member.photo,
          },
        };
      });

    return NextResponse.json({
      data: {
        totalDues,
        count: duesRows.length,
        rows: duesRows,
      },
    });
  } catch (error) {
    console.error("Fetch dues error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch dues" } },
      { status: 500 }
    );
  }
}

