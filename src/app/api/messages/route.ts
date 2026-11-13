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
        { error: { code: "VALIDATION_ERROR", message: "memberId and type are required" } },
        { status: 422 }
      );
    }

    await connectDB();

    await Message.create({
      gymId: auth.gymId,
      memberId,
      type,
      channel: "whatsapp",
      sharedAt: new Date(),
      sharedBy: auth.userId,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Log message error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to log message" } },
      { status: 500 }
    );
  }
}

