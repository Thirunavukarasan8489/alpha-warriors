import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Expense } from "@/models";
import { rupeesToPaise } from "@/lib/money";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner", "manager"]);
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  const { id } = await params;

  try {
    const body = await req.json();
    const { date, category, amountRupees, note } = body;

    await connectDB();

    const expense = await Expense.findOne({
      _id: id,
      gymId: auth.gymId,
      isDeleted: false,
    });

    if (!expense) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Expense not found" } },
        { status: 404 }
      );
    }

    if (expense.payrollRunId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Payroll expenses are managed automatically and cannot be edited manually." } },
        { status: 403 }
      );
    }

    if (date) expense.date = new Date(date);
    if (category) expense.category = category.toLowerCase().trim();
    if (amountRupees !== undefined) {
      const paise = rupeesToPaise(amountRupees);
      if (paise <= 0) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Amount must be greater than zero" } },
          { status: 422 }
        );
      }
      expense.amount = paise;
    }
    if (note !== undefined) expense.note = note?.trim();

    await expense.save();

    return NextResponse.json({
      data: {
        id: expense._id,
        date: expense.date,
        category: expense.category,
        amount: expense.amount,
        note: expense.note,
      },
    });
  } catch (error) {
    console.error("Update expense error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to update expense" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner", "manager"]);
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  const { id } = await params;

  try {
    await connectDB();

    const expense = await Expense.findOne({
      _id: id,
      gymId: auth.gymId,
      isDeleted: false,
    });

    if (!expense) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Expense not found" } },
        { status: 404 }
      );
    }

    if (expense.payrollRunId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Payroll expenses cannot be deleted here." } },
        { status: 403 }
      );
    }

    // Soft delete as per AGENTS.md
    expense.isDeleted = true;
    await expense.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete expense error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to delete expense" } },
      { status: 500 }
    );
  }
}
