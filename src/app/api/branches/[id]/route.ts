import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Branch, AuditLog } from "@/models";
import { requireAuth } from "@/lib/rbac";
import { z } from "zod";

const updateBranchSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner"]);
  if ("response" in authResult) return authResult.response;
  const { gymId, userId } = authResult.auth;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateBranchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 422 }
      );
    }

    await connectDB();
    const branch = await Branch.findOne({ _id: id, gymId });
    if (!branch) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Branch not found" } },
        { status: 404 }
      );
    }

    // Protection: Cannot deactivate default branch
    if (parsed.data.isActive === false && branch.isDefault) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Cannot deactivate the primary default branch" } },
        { status: 403 }
      );
    }

    if (parsed.data.name && parsed.data.name !== branch.name) {
      const conflict = await Branch.findOne({
        gymId,
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${parsed.data.name}$`, "i") },
      });
      if (conflict) {
        return NextResponse.json(
          { error: { code: "CONFLICT", message: "Another branch with this name already exists" } },
          { status: 409 }
        );
      }
      branch.name = parsed.data.name;
    }

    if (parsed.data.address !== undefined) branch.address = parsed.data.address;
    if (parsed.data.phone !== undefined) branch.phone = parsed.data.phone;
    if (parsed.data.isActive !== undefined) branch.isActive = parsed.data.isActive;

    await branch.save();

    await AuditLog.create({
      gymId,
      userId,
      action: "BRANCH_UPDATED",
      resource: "Branch",
      resourceId: id,
      details: parsed.data,
    });

    return NextResponse.json({
      data: {
        id: branch._id.toString(),
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        isDefault: branch.isDefault,
        isActive: branch.isActive,
      },
    });
  } catch (error: any) {
    console.error("PATCH /api/branches/[id] error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to update branch" } },
      { status: 500 }
    );
  }
}
