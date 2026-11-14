import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { User } from "@/models";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner", "manager"]);
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  const { id } = await params;

  try {
    await connectDB();

    const user = await User.findOne({ _id: id, gymId: auth.gymId })
      .select("-passwordHash")
      .populate("branchIds", "name");

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Staff member not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        branchIds: user.branchIds,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Fetch staff member error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch staff member" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner"]);
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  const { id } = await params;

  try {
    const body = await req.json();
    const { name, role, branchIds, isActive } = body;

    await connectDB();

    const user = await User.findOne({ _id: id, gymId: auth.gymId });

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Staff member not found" } },
        { status: 404 }
      );
    }

    // Safety rule: Owner cannot change their own role or deactivate themselves
    if (user._id.toString() === auth.userId) {
      if (isActive === false) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "You cannot deactivate your own owner account." } },
          { status: 403 }
        );
      }
      if (role && role !== "owner") {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "The gym owner role cannot be changed." } },
          { status: 403 }
        );
      }
    }

    if (name) user.name = name.trim();
    if (role && ["owner", "manager", "receptionist", "trainer"].includes(role)) {
      user.role = role;
    }
    if (branchIds) user.branchIds = branchIds;
    if (typeof isActive === "boolean") user.isActive = isActive;

    await user.save();

    return NextResponse.json({
      data: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Update staff error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to update staff member" } },
      { status: 500 }
    );
  }
}
