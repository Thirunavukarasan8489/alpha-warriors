import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Branch, User, AuditLog } from "@/models";
import { requireAuth } from "@/lib/rbac";
import { z } from "zod";

const createBranchSchema = z.object({
  name: z.string().min(2, "Branch name must be at least 2 characters").trim(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;
  const { gymId, role, userId } = authResult.auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const query: Record<string, any> = { gymId };
    if (activeOnly) {
      query.isActive = { $ne: false };
    }

    // Role-based branch visibility:
    // Non-owners only see branches explicitly in their user.branchIds
    if (role !== "owner") {
      const user = await User.findOne({ _id: userId, gymId }).lean();
      if (!user || !user.branchIds || user.branchIds.length === 0) {
        // If no branches assigned, return default or empty
        query.isDefault = true;
      } else {
        query._id = { $in: user.branchIds };
      }
    }

    const branches = await Branch.find(query).sort({ isDefault: -1, name: 1 }).lean();

    return NextResponse.json({
      data: branches.map((b) => ({
        id: b._id.toString(),
        name: b.name,
        address: b.address || "",
        phone: b.phone || "",
        isDefault: !!b.isDefault,
        isActive: b.isActive !== false,
        createdAt: b.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("GET /api/branches error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch branches" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Only owners can create branches
  const authResult = await requireAuth(["owner"]);
  if ("response" in authResult) return authResult.response;
  const { gymId, userId } = authResult.auth;

  try {
    const body = await req.json();
    const parsed = createBranchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 422 }
      );
    }

    await connectDB();

    // Check duplicate name in same gym
    const existing = await Branch.findOne({
      gymId,
      name: { $regex: new RegExp(`^${parsed.data.name}$`, "i") },
    });

    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "A branch with this name already exists" } },
        { status: 409 }
      );
    }

    const branch = await Branch.create({
      gymId,
      name: parsed.data.name,
      address: parsed.data.address || "",
      phone: parsed.data.phone || "",
      isDefault: false,
      isActive: true,
    });

    // Add branch to owner's branchIds
    await User.findByIdAndUpdate(userId, {
      $addToSet: { branchIds: branch._id },
    });

    await AuditLog.create({
      gymId,
      userId,
      action: "BRANCH_CREATED",
      resource: "Branch",
      resourceId: branch._id.toString(),
      details: { name: branch.name },
    });

    return NextResponse.json(
      {
        data: {
          id: branch._id.toString(),
          name: branch.name,
          address: branch.address,
          phone: branch.phone,
          isDefault: branch.isDefault,
          isActive: branch.isActive,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/branches error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to create branch" } },
      { status: 500 }
    );
  }
}
