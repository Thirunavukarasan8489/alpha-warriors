import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Membership } from "@/models";
import { resolveEffectiveMembershipStatus } from "@/lib/status";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    const { id } = await params;
    await connectDB();

    const memberships = await Membership.find({
      gymId: auth.gymId,
      memberId: id,
    }).sort({ createdAt: -1 });

    const data = memberships.map((m) => {
      const effectiveStatus = resolveEffectiveMembershipStatus(m.status, m.endDate);
      return {
        id: m._id,
        planName: m.planName,
        durationDays: m.durationDays,
        price: auth.role === "trainer" ? undefined : m.price,
        discount: auth.role === "trainer" ? undefined : m.discount,
        finalAmount: auth.role === "trainer" ? undefined : m.finalAmount,
        startDate: m.startDate,
        endDate: m.endDate,
        status: effectiveStatus,
        frozenAt: m.frozenAt,
        freezeReason: m.freezeReason,
        expectedResumeDate: m.expectedResumeDate,
        notes: m.notes,
        createdAt: m.createdAt,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Fetch memberships error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch memberships" } },
      { status: 500 }
    );
  }
}

