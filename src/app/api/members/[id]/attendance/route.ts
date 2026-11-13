import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Attendance } from "@/models";

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

    const attendanceRecords = await Attendance.find({
      gymId: auth.gymId,
      memberId: id,
    })
      .sort({ checkInAt: -1 })
      .limit(60);

    return NextResponse.json({
      data: attendanceRecords.map((a) => ({
        id: a._id,
        checkInAt: a.checkInAt,
        source: a.source,
      })),
    });
  } catch (error) {
    console.error("Fetch member attendance error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch attendance" } },
      { status: 500 }
    );
  }
}

