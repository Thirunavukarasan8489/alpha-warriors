import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Member, AuditLog } from "@/models";
import { requireAuth } from "@/lib/rbac";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner", "manager", "receptionist", "trainer"]);
  if ("response" in authResult) return authResult.response;
  const { gymId, userId } = authResult.auth;
  const { id } = await params;

  try {
    await connectDB();
    const member = await Member.findOne({ _id: id, gymId, isDeleted: false });
    if (!member) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Member not found" } },
        { status: 404 }
      );
    }

    // Generate random raw token
    const rawToken = crypto.randomBytes(32).toString("hex");
    // Hash token with SHA-256 for database storage
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    member.portalTokenHash = tokenHash;
    await member.save();

    await AuditLog.create({
      gymId,
      userId,
      action: "PORTAL_TOKEN_GENERATED",
      targetType: "member",
      targetId: id,
      resource: "Member",
      resourceId: id,
      reason: `Portal link generated for ${member.name}`,
      details: { memberName: member.name },
    });

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const portalUrl = `${protocol}://${host}/portal/${rawToken}`;

    return NextResponse.json({
      data: {
        rawToken,
        portalUrl,
        memberName: member.name,
        phone: member.whatsapp || member.phone,
      },
    });
  } catch (error: any) {
    console.error("POST /api/members/[id]/portal-token error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error?.message || "Failed to generate portal link" } },
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
  const { gymId, userId } = authResult.auth;
  const { id } = await params;

  try {
    await connectDB();
    const member = await Member.findOne({ _id: id, gymId });
    if (!member) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Member not found" } },
        { status: 404 }
      );
    }

    member.portalTokenHash = undefined;
    await member.save();

    await AuditLog.create({
      gymId,
      userId,
      action: "PORTAL_TOKEN_REVOKED",
      targetType: "member",
      targetId: id,
      resource: "Member",
      resourceId: id,
      reason: `Portal link revoked for ${member.name}`,
      details: { memberName: member.name },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    console.error("DELETE /api/members/[id]/portal-token error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error?.message || "Failed to revoke portal link" } },
      { status: 500 }
    );
  }
}
