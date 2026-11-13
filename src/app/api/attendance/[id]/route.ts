import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Attendance } from "@/models";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    const { id } = await params;
    await connectDB();

    const attendance = await Attendance.findOne({ _id: id, gymId: auth.gymId });
    if (!attendance) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Attendance record not found" } },
        { status: 404 }
      );
    }

    // Role check: Receptionist can only undo within 10 minutes
    if (auth.role === "receptionist") {
      const minutesAgo = (Date.now() - new Date(attendance.createdAt).getTime()) / (1000 * 60);
      if (minutesAgo > 10) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Receptionist can only undo check-in within 10 minutes. Please contact owner/manager.",
            },
          },
          { status: 403 }
        );
      }
    }

    await Attendance.deleteOne({ _id: id });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Undo attendance error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to undo check-in" } },
      { status: 500 }
    );
  }
}

