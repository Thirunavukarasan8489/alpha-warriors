import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { User, AuditLog } from "@/models";

function generateOneTimePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AW#${code}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner", "manager"]);
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  const { id } = await params;

  try {
    await connectDB();

    const user = await User.findOne({ _id: id, gymId: auth.gymId });

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Staff member not found" } },
        { status: 404 }
      );
    }

    if (user.role === "owner" && auth.role !== "owner") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the gym owner can reset the owner password." } },
        { status: 403 }
      );
    }

    if (auth.role === "manager" && user.role === "manager" && user._id.toString() !== auth.userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Managers cannot reset other managers' passwords." } },
        { status: 403 }
      );
    }

    const oneTimePassword = generateOneTimePassword();
    user.passwordHash = await bcrypt.hash(oneTimePassword, 10);
    await user.save();

    await AuditLog.create({
      gymId: auth.gymId,
      userId: auth.userId,
      action: "RESET_STAFF_PASSWORD",
      targetType: "user",
      targetId: id,
      reason: `${auth.role} reset temporary password for ${user.name} (${user.role})`,
    });

    return NextResponse.json({
      data: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        oneTimePassword, // Shown only once in modal / for WhatsApp sharing
      },
    });
  } catch (error) {
    console.error("Reset staff password error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to reset password" } },
      { status: 500 }
    );
  }
}
