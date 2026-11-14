import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Gym, Branch, User } from "@/models";

export async function GET() {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    await connectDB();

    const [user, gym, branches] = await Promise.all([
      User.findById(auth.userId).select("-passwordHash"),
      Gym.findById(auth.gymId),
      Branch.find({ gymId: auth.gymId }),
    ]);

    if (!user || !gym) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User or gym not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          photo: user.photo,
        },
        gym: {
          id: gym._id,
          name: gym.name,
          logo: gym.logo,
          settings: gym.settings,
        },
        branches: branches.map((b) => ({
          id: b._id,
          name: b.name,
          isDefault: b.isDefault,
        })),
        activeBranchId: auth.branchId || branches[0]?._id,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch user session" } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const authResult = await requireAuth(["owner", "manager", "receptionist", "trainer"]);
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    const body = await req.json();
    const { name, email, photo } = body;

    await connectDB();

    const updateFields: Record<string, unknown> = {};

    if (name && typeof name === "string") {
      const trimmed = name.trim();
      if (trimmed.length < 2) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Name must be at least 2 characters" } },
          { status: 422 }
        );
      }
      updateFields.name = trimmed;
    }

    if (email !== undefined) {
      updateFields.email = email ? email.trim().toLowerCase() : "";
    }

    if (photo !== undefined) {
      updateFields.photo = photo || "";
    }

    const updatedUser = await User.findByIdAndUpdate(
      auth.userId,
      { $set: updateFields },
      { new: true }
    ).select("-passwordHash");

    if (!updatedUser) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        email: updatedUser.email,
        role: updatedUser.role,
        photo: updatedUser.photo,
      },
    });
  } catch (error: unknown) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to update profile" } },
      { status: 500 }
    );
  }
}

