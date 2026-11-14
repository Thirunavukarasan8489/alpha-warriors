import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PayrollRun, User, Expense, AuditLog } from "@/models";
import { requireAuth } from "@/lib/rbac";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner"]);
  if ("response" in authResult) return authResult.response;
  const { gymId, userId } = authResult.auth;
  const { id } = await params;

  try {
    await connectDB();
    const run = await PayrollRun.findOne({ _id: id, gymId });
    if (!run) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Payroll record not found" } },
        { status: 404 }
      );
    }

    if (run.status === "paid") {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "This payroll entry has already been paid" } },
        { status: 409 }
      );
    }

    const staff = await User.findOne({ _id: run.staffId, gymId }).lean();
    if (!staff) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Staff user not found" } },
        { status: 404 }
      );
    }

    // 1. Create an Expense row in the "salary" category (feeds 14-expenses)
    const expense = await Expense.create({
      gymId,
      branchId: staff.branchIds?.[0] || undefined,
      category: "salary",
      title: `Staff Salary: ${staff.name} (${run.month})`,
      amount: run.netPay,
      paymentDate: new Date(),
      paymentMode: "bank_transfer",
      vendor: staff.name,
      notes: `Automated payroll disbursement for month ${run.month}. Base: ₹${run.baseSalary / 100}, Commission: ₹${run.commission / 100}, Deductions: ₹${run.deductions / 100}`,
      createdBy: userId,
      isDeleted: false,
    });

    // 2. Lock and update the PayrollRun
    run.status = "paid";
    run.paidAt = new Date();
    (run as any).paidBy = userId;
    (run as any).expenseId = expense._id;
    await run.save();

    await AuditLog.create({
      gymId,
      userId,
      action: "PAYROLL_PAID",
      resource: "PayrollRun",
      resourceId: id,
      details: {
        staffName: staff.name,
        month: run.month,
        netPay: run.netPay,
        expenseId: expense._id.toString(),
      },
    });

    return NextResponse.json({
      data: {
        id: run._id.toString(),
        status: run.status,
        paidAt: run.paidAt,
        netPay: run.netPay,
        expenseId: expense._id.toString(),
      },
    });
  } catch (error: any) {
    console.error("POST /api/payroll/[id]/pay error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to process payroll payment" } },
      { status: 500 }
    );
  }
}
