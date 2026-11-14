import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Member, PARQForm, Gym } from "@/models";
import { requireAuth } from "@/lib/rbac";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner", "manager", "trainer", "receptionist"]);
  if ("response" in authResult) return authResult.response;
  const { gymId } = authResult.auth;
  const { id } = await params;

  try {
    await connectDB();
    const member = await Member.findOne({ _id: id, gymId, isDeleted: false });
    if (!member) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Member not found" } },
        { status: 404 }
      );
    }

    // Generate random secure token
    const token = crypto.randomBytes(24).toString("hex");

    const parq = await PARQForm.create({
      gymId,
      memberId: id,
      token,
      isCompleted: false,
      answers: [],
    });

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const shareUrl = `${protocol}://${host}/parq/${token}`;

    return NextResponse.json({
      data: {
        token,
        shareUrl,
        member: {
          name: member.name,
          phone: member.phone,
        },
      },
    });
  } catch (error: any) {
    console.error("POST /api/members/[id]/parq-link error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to generate PAR-Q link" } },
      { status: 500 }
    );
  }
}
