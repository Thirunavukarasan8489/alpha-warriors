import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { User, AuditLog } from "@/models";

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

    // PRIVACY PROTECTION: Non-owners cannot access or view Owner account details
    if (user.role === "owner" && auth.role !== "owner") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access restricted." } },
        { status: 403 }
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
  const authResult = await requireAuth(["owner", "manager"]);
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

    // PRIVACY & SAFETY: Non-owners cannot access, view, or modify Owner account
    if (user.role === "owner" && auth.role !== "owner") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only the gym owner can access or modify the owner account." } },
        { status: 403 }
      );
    }

    // Safety rule: Cannot promote anyone to owner
    if (role === "owner" && auth.role !== "owner") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only owners can assign owner role." } },
        { status: 403 }
      );
    }

    // Safety rule: Cannot deactivate yourself
    if (user._id.toString() === auth.userId) {
      if (isActive === false) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "You cannot deactivate your own account." } },
          { status: 403 }
        );
      }
      if (role && role !== user.role) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "You cannot change your own role." } },
          { status: 403 }
        );
      }
    }

    // Manager cannot edit another manager
    if (auth.role === "manager" && user.role === "manager" && user._id.toString() !== auth.userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Managers cannot modify other managers." } },
        { status: 403 }
      );
    }

    if (name) user.name = name.trim();
    if (role && ["owner", "manager", "receptionist", "trainer"].includes(role)) {
      user.role = role;
    }
    if (branchIds) user.branchIds = branchIds;
    if (typeof isActive === "boolean") user.isActive = isActive;

    await user.save();

    await AuditLog.create({
      gymId: auth.gymId,
      userId: auth.userId,
      action: "UPDATE_STAFF",
      targetType: "user",
      targetId: id,
      reason: `${auth.role} updated staff member ${user.name}`,
    });

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

export async function DELETE(
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

    // PRIVACY PROTECTION: Non-owners cannot access or view Owner account details
    if (user.role === "owner" && auth.role !== "owner") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access restricted." } },
        { status: 403 }
      );
    }

    // Safety rule 1: The gym owner cannot be deleted
    if (user.role === "owner") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "The gym owner account cannot be deleted." } },
        { status: 403 }
      );
    }

    // Safety rule 2: Cannot delete yourself
    if (user._id.toString() === auth.userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You cannot delete your own account." } },
        { status: 403 }
      );
    }

    // Safety rule 3: Manager cannot delete another manager
    if (auth.role === "manager" && user.role === "manager") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Managers cannot delete other managers." } },
        { status: 403 }
      );
    }

    await User.deleteOne({ _id: id, gymId: auth.gymId });

    await AuditLog.create({
      gymId: auth.gymId,
      userId: auth.userId,
      action: "DELETE_STAFF",
      targetType: "user",
      targetId: id,
      reason: `${auth.role} deleted staff account: ${user.name} (${user.role})`,
    });

    return NextResponse.json({
      data: {
        success: true,
        message: `Staff account ${user.name} deleted successfully.`,
      },
    });
  } catch (error) {
    console.error("Delete staff error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to delete staff member" } },
      { status: 500 }
    );
  }
}
