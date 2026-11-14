import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import {
  Member,
  Gym,
  Membership,
  Invoice,
  Attendance,
  AuditLog,
} from "@/models";
import { editMemberSchema } from "@/lib/validation";
import { calculateMemberDisplayStatus } from "@/lib/status";

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

    const member = await Member.findOne({
      _id: id,
      gymId: auth.gymId,
      isDeleted: false,
    }).populate("trainerId", "name phone");

    if (!member) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Member not found" } },
        { status: 404 }
      );
    }

    // Role check: trainer can only view their own assigned members
    if (auth.role === "trainer" && member.trainerId?._id?.toString() !== auth.userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have access to this member" } },
        { status: 403 }
      );
    }

    const [gym, latestMembership, invoices, lastAttendance] = await Promise.all([
      Gym.findById(auth.gymId),
      Membership.findOne({ gymId: auth.gymId, memberId: id }).sort({ createdAt: -1 }),
      // Trainer role never receives payment data from the API (per docs/screens/05-member-profile.md)
      auth.role === "trainer"
        ? Promise.resolve([])
        : Invoice.find({ gymId: auth.gymId, memberId: id, status: { $ne: "void" } }),
      Attendance.findOne({ gymId: auth.gymId, memberId: id }).sort({ checkInAt: -1 }),
    ]);

    const expiringSoonDays = gym?.settings?.expiringSoonDays || 7;
    const displayStatus = calculateMemberDisplayStatus(latestMembership, expiringSoonDays);

    let dues = 0;
    for (const inv of invoices) {
      if (inv.balance > 0) dues += inv.balance;
    }

    return NextResponse.json({
      data: {
        id: member._id,
        memberCode: member.memberCode,
        name: member.name,
        phone: member.phone,
        whatsapp: member.whatsapp,
        email: member.email,
        dateOfBirth: member.dateOfBirth,
        gender: member.gender,
        address: member.address,
        photo: member.photo,
        trainer: member.trainerId
          ? {
              id: (member.trainerId as unknown as { _id: string; name: string })._id,
              name: (member.trainerId as unknown as { _id: string; name: string }).name,
            }
          : null,
        notes: member.notes,
        joinedAt: member.joinedAt,
        displayStatus,
        dues: auth.role === "trainer" ? 0 : dues,
        lastVisitAt: lastAttendance?.checkInAt || null,
        currentMembership: latestMembership
          ? {
              id: latestMembership._id,
              planName: latestMembership.planName,
              durationDays: latestMembership.durationDays,
              startDate: latestMembership.startDate,
              endDate: latestMembership.endDate,
              status: latestMembership.status,
              price: auth.role === "trainer" ? undefined : latestMembership.price,
              finalAmount: auth.role === "trainer" ? undefined : latestMembership.finalAmount,
              frozenAt: latestMembership.frozenAt,
              expectedResumeDate: latestMembership.expectedResumeDate,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Get member profile error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to load member profile" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner", "manager", "receptionist"]);
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = editMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid member data",
          },
        },
        { status: 422 }
      );
    }

    await connectDB();

    const data = parsed.data;
    const updated = await Member.findOneAndUpdate(
      { _id: id, gymId: auth.gymId, isDeleted: false },
      {
        $set: {
          name: data.name,
          whatsapp: data.whatsapp,
          email: data.email || undefined,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          gender: data.gender,
          address: data.address,
          photo: data.photo,
          trainerId: data.trainerId || undefined,
          notes: data.notes,
        },
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Member not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: updated._id,
        name: updated.name,
        phone: updated.phone,
      },
    });
  } catch (error) {
    console.error("Edit member error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to update member" } },
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

  try {
    const { id } = await params;
    await connectDB();

    const member = await Member.findOneAndUpdate(
      { _id: id, gymId: auth.gymId, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!member) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Member not found" } },
        { status: 404 }
      );
    }

    await AuditLog.create({
      gymId: auth.gymId,
      userId: auth.userId,
      action: "DELETE_MEMBER",
      targetType: "member",
      targetId: id,
      reason: `${auth.role} soft deleted member ${member.name} (${member.memberCode})`,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Delete member error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to delete member" } },
      { status: 500 }
    );
  }
}

