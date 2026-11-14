import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, PayrollRun, Sale } from "@/models";
import { requireAuth } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(["owner"]);
  if ("response" in authResult) return authResult.response;
  const { gymId } = authResult.auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    // Current month in Asia/Kolkata (YYYY-MM)
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const month = searchParams.get("month") || defaultMonth;

    // Month start and end dates for sales commission calculation
    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const startOfMonth = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

    // Get all active staff (excluding owner)
    const staffMembers = await User.find({
      gymId,
      role: { $in: ["manager", "receptionist", "trainer"] },
      isActive: true,
    }).lean();

    const runs: any[] = [];

    for (const staff of staffMembers) {
      let run = await PayrollRun.findOne({
        gymId,
        staffId: staff._id,
        month,
      });

      const baseSalary = staff.payroll?.baseSalary || 0;
      const commissionPercent = staff.payroll?.commissionPercent || 0;

      // Calculate commissions from sales made by this staff member
      let commissionPaise = 0;
      if (commissionPercent > 0) {
        const staffSales = await Sale.find({
          gymId,
          soldBy: staff._id,
          isVoid: false,
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        }).lean();

        const totalSalesAmount = staffSales.reduce((sum, s) => sum + s.total, 0);
        commissionPaise = Math.round(totalSalesAmount * (commissionPercent / 100));
      }

      if (!run) {
        // Create draft payroll run
        const deductions = 0;
        const leaveDays = 0;
        const netPay = Math.max(0, baseSalary + commissionPaise - deductions);

        run = await PayrollRun.create({
          gymId,
          staffId: staff._id,
          month,
          baseSalary,
          commission: commissionPaise,
          deductions,
          leaveDays,
          netPay,
          status: "draft",
        });
      } else if (run.status === "draft") {
        // Update draft with fresh commission and base salary
        run.baseSalary = baseSalary;
        run.commission = commissionPaise;
        run.netPay = Math.max(0, baseSalary + commissionPaise - run.deductions);
        await run.save();
      }

      runs.push({
        id: run._id.toString(),
        staff: {
          id: staff._id.toString(),
          name: staff.name,
          phone: staff.phone,
          role: staff.role,
        },
        month: run.month,
        baseSalary: run.baseSalary,
        commission: run.commission,
        deductions: run.deductions,
        leaveDays: run.leaveDays,
        netPay: run.netPay,
        status: run.status,
        paidAt: run.paidAt,
        expenseId: run.expenseId?.toString(),
        notes: run.notes,
      });
    }

    const totalBase = runs.reduce((sum, r) => sum + r.baseSalary, 0);
    const totalCommission = runs.reduce((sum, r) => sum + r.commission, 0);
    const totalDeductions = runs.reduce((sum, r) => sum + r.deductions, 0);
    const totalNetPay = runs.reduce((sum, r) => sum + r.netPay, 0);

    return NextResponse.json({
      data: {
        month,
        runs,
        summary: {
          totalStaff: runs.length,
          totalBase,
          totalCommission,
          totalDeductions,
          totalNetPay,
          allPaid: runs.length > 0 && runs.every((r) => r.status === "paid"),
        },
      },
    });
  } catch (error: any) {
    console.error("GET /api/payroll error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch payroll" } },
      { status: 500 }
    );
  }
}
