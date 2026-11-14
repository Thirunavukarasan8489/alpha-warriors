import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead, Member, AuditLog } from "@/models";
import { requireAuth } from "@/lib/rbac";
import { z } from "zod";

const convertSchema = z.object({
  memberId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner", "manager", "receptionist"]);
  if ("response" in authResult) return authResult.response;
  const { gymId, userId } = authResult.auth;
  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = convertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 422 }
      );
    }

    await connectDB();
    const lead = await Lead.findOne({ _id: id, gymId, isDeleted: false });
    if (!lead) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Lead not found" } },
        { status: 404 }
      );
    }

    let memberId = parsed.data.memberId;

    // If no memberId provided, check if a member already exists with this phone
    if (!memberId) {
      const existingMember = await Member.findOne({ gymId, phone: lead.phone, isDeleted: false });
      if (existingMember) {
        memberId = existingMember._id.toString();
      }
    }

    lead.status = "won";
    if (memberId) {
      (lead as any).convertedMemberId = memberId;
    }
    await lead.save();

    await AuditLog.create({
      gymId,
      userId,
      action: "LEAD_CONVERTED",
      resource: "Lead",
      resourceId: id,
      details: { leadName: lead.name, memberId },
    });

    return NextResponse.json({
      data: {
        id: lead._id.toString(),
        status: lead.status,
        convertedMemberId: lead.convertedMemberId?.toString() || memberId,
      },
    });
  } catch (error: any) {
    console.error("POST /api/leads/[id]/convert error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to convert lead" } },
      { status: 500 }
    );
  }
}
