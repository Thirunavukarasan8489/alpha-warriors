import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PayrollRun, AuditLog } from "@/models";
import { requireAuth } from "@/lib/rbac";
import { rupeesToPaise } from "@/lib/money";
import { z } from "zod";

const updatePayrollSchema = z.object({
  deductionsRupees: z.number().min(0).optional(),
  leaveDays: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner"]);
  if ("response" in authResult) return authResult.response;
  const { gymId, userId } = authResult.auth;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updatePayrollSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 422 }
      );
    }

    await connectDB();
    const run = await PayrollRun.findOne({ _id: id, gymId });
    if (!run) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Payroll record not found" } },
        { status: 404 }
      );
    }

    // STRICT RULE: "A paid row is not edited"
    if (run.status === "paid") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Paid payroll records are locked and cannot be edited" } },
        { status: 403 }
      );
    }

    if (parsed.data.deductionsRupees !== undefined) {
      run.deductions = rupeesToPaise(parsed.data.deductionsRupees);
    }
    if (parsed.data.leaveDays !== undefined) {
      run.leaveDays = parsed.data.leaveDays;
    }
    if (parsed.data.notes !== undefined) {
      run.notes = parsed.data.notes;
    }

    // Recalculate net pay
    run.netPay = Math.max(0, run.baseSalary + run.commission - run.deductions);
    await run.save();

    await AuditLog.create({
      gymId,
      userId,
      action: "PAYROLL_DRAFT_UPDATED",
      resource: "PayrollRun",
      resourceId: id,
      details: { deductions: run.deductions, leaveDays: run.leaveDays, netPay: run.netPay },
    });

    return NextResponse.json({
      data: {
        id: run._id.toString(),
        deductions: run.deductions,
        leaveDays: run.leaveDays,
        netPay: run.netPay,
        status: run.status,
      },
    });
  } catch (error: any) {
    console.error("PATCH /api/payroll/[id] error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to update payroll" } },
      { status: 500 }
    );
  }
}
