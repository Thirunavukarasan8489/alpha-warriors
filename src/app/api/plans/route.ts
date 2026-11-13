import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth, canManagePlans } from "@/lib/rbac";
import { Plan } from "@/models";
import { planSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const includeInactive = searchParams.get("includeInactive") === "true";

    const filter: Record<string, unknown> = { gymId: auth.gymId };
    if (!includeInactive) {
      filter.isActive = true;
    }

    const plans = await Plan.find(filter).sort({ durationDays: 1, price: 1 });

    return NextResponse.json({
      data: plans.map((p) => ({
        id: p._id,
        name: p.name,
        durationDays: p.durationDays,
        price: p.price,
        taxPercent: p.taxPercent,
        sessions: p.sessions,
        isActive: p.isActive,
      })),
    });
  } catch (error) {
    console.error("Fetch plans error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch plans" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  if (!canManagePlans(auth.role)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Only owner and manager can create plans" } },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = planSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid plan details",
            details: parsed.error.issues,
          },
        },
        { status: 422 }
      );
    }

    await connectDB();

    const plan = await Plan.create({
      gymId: auth.gymId,
      ...parsed.data,
    });

    return NextResponse.json(
      {
        data: {
          id: plan._id,
          name: plan.name,
          durationDays: plan.durationDays,
          price: plan.price,
          taxPercent: plan.taxPercent,
          sessions: plan.sessions,
          isActive: plan.isActive,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create plan error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to create plan" } },
      { status: 500 }
    );
  }
}

