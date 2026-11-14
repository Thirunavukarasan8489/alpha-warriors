import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Message } from "@/models";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    const body = await req.json();
    const { memberId, type } = body;

    if (!memberId || !type) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "memberId and type are required" } },
        { status: 422 }
      );
    }

    await connectDB();

    await Message.create({
      gymId: auth.gymId,
      branchId: auth.branchId,
      memberId,
      type,
      sharedAt: new Date(),
      sharedBy: auth.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Log reminder share error:", error);
    // As per AGENTS.md, logging failures must never break the user experience
    return NextResponse.json({ success: false });
  }
}
