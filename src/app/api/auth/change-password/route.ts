import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { User } from "@/models";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Current and new passwords are required" } },
        { status: 422 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "New password must be at least 6 characters" } },
        { status: 422 }
      );
    }

    await connectDB();
    const user = await User.findById(auth.userId);

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User account not found" } },
        { status: 404 }
      );
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Current password does not match" } },
        { status: 401 }
      );
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to change password" } },
      { status: 500 }
    );
  }
}
