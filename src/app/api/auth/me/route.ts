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
        },
        gym: {
          id: gym._id,
          name: gym.name,
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

