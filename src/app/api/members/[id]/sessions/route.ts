import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Member, PTSession, AuditLog } from "@/models";
import { requireAuth } from "@/lib/rbac";
import { z } from "zod";

const createSessionSchema = z.object({
  date: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner", "manager", "trainer"]);
  if ("response" in authResult) return authResult.response;
  const { gymId, role, userId } = authResult.auth;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 422 }
      );
    }

    await connectDB();
    const member = await Member.findOne({ _id: id, gymId, isDeleted: false });
    if (!member) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Member not found" } },
        { status: 404 }
      );
    }

    if (role === "trainer" && member.trainerId?.toString() !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Trainers can only log sessions for assigned members" } },
        { status: 403 }
      );
    }

    const sessionDate = parsed.data.date ? new Date(parsed.data.date) : new Date();

    const ptSession = await PTSession.create({
      gymId,
      memberId: id,
      trainerId: userId,
      date: sessionDate,
      notes: parsed.data.notes?.trim() || "",
    });

    await AuditLog.create({
      gymId,
      userId,
      action: "PT_SESSION_LOGGED",
      resource: "PTSession",
      resourceId: ptSession._id.toString(),
      details: { memberId: id, date: sessionDate },
    });

    return NextResponse.json(
      {
        data: {
          id: ptSession._id.toString(),
          date: ptSession.date,
          notes: ptSession.notes,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/members/[id]/sessions error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to log PT session" } },
      { status: 500 }
    );
  }
}
