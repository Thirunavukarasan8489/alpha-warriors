import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Expense } from "@/models";
import { rupeesToPaise } from "@/lib/money";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(["owner", "manager"]);
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  const searchParams = req.nextUrl.searchParams;
  const month = searchParams.get("month"); // e.g. "2026-11"
  const category = searchParams.get("category");
  const branchId = searchParams.get("branchId") || auth.branchId;

  try {
    await connectDB();

    const query: Record<string, unknown> = {
      gymId: auth.gymId,
      isDeleted: false,
    };

    if (branchId) query.branchId = branchId;
    if (category && category !== "all") query.category = category;

    if (month) {
      const [yearStr, monthStr] = month.split("-");
      const year = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      if (!isNaN(year) && !isNaN(m)) {
        const start = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0));
        const end = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));
        query.date = { $gte: start, $lte: end };
      }
    }

    const expenses = await Expense.find(query)
      .sort({ date: -1, createdAt: -1 })
      .populate("createdBy", "name");

    let totalPaise = 0;
    const byCategory: Record<string, number> = {};

    const formattedExpenses = expenses.map((exp) => {
      totalPaise += exp.amount;
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;

      return {
        id: exp._id,
        date: exp.date,
        category: exp.category,
        amount: exp.amount,
        note: exp.note,
        payrollRunId: exp.payrollRunId,
        createdByName: (exp.createdBy as any)?.name || "Staff",
        createdAt: exp.createdAt,
      };
    });

    return NextResponse.json({
      data: {
        expenses: formattedExpenses,
        totalPaise,
        byCategory,
      },
    });
  } catch (error) {
    console.error("Fetch expenses error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch expenses" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(["owner", "manager"]);
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    const body = await req.json();
    const { date, category, amountRupees, note, branchId } = body;

    if (!category || amountRupees === undefined || amountRupees === null) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Category and amount are required" } },
        { status: 422 }
      );
    }

    const amountPaise = rupeesToPaise(amountRupees);
    if (amountPaise <= 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Amount must be greater than zero" } },
        { status: 422 }
      );
    }

    await connectDB();

    const expense = await Expense.create({
      gymId: auth.gymId,
      branchId: branchId || auth.branchId,
      date: date ? new Date(date) : new Date(),
      category: category.toLowerCase().trim(),
      amount: amountPaise,
      note: note?.trim(),
      createdBy: auth.userId,
    });

    return NextResponse.json(
      {
        data: {
          id: expense._id,
          date: expense.date,
          category: expense.category,
          amount: expense.amount,
          note: expense.note,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to create expense" } },
      { status: 500 }
    );
  }
}
