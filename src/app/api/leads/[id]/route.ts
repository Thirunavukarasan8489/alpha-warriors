import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models";
import { requireAuth } from "@/lib/rbac";
import { sanitizePhone } from "@/lib/validation";
import { z } from "zod";

const updateLeadSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  source: z.enum(["walk-in", "referral", "social", "other"]).optional(),
  interest: z.string().optional(),
  followUpDate: z.string().nullable().optional(),
  assignedTo: z.string().optional(),
  status: z.enum(["new", "contacted", "trial", "won", "lost"]).optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner", "manager", "receptionist"]);
  if ("response" in authResult) return authResult.response;
  const { gymId } = authResult.auth;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateLeadSchema.safeParse(body);
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

    if (parsed.data.name) lead.name = parsed.data.name.trim();
    if (parsed.data.phone) lead.phone = sanitizePhone(parsed.data.phone);
    if (parsed.data.source) lead.source = parsed.data.source;
    if (parsed.data.interest !== undefined) lead.interest = parsed.data.interest;
    if (parsed.data.followUpDate !== undefined) {
      lead.followUpDate = parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : undefined;
    }
    if (parsed.data.assignedTo) (lead as any).assignedTo = parsed.data.assignedTo;
    if (parsed.data.status) lead.status = parsed.data.status;
    if (parsed.data.notes !== undefined) lead.notes = parsed.data.notes;

    await lead.save();

    return NextResponse.json({
      data: {
        id: lead._id.toString(),
        name: lead.name,
        phone: lead.phone,
        status: lead.status,
      },
    });
  } catch (error: any) {
    console.error("PATCH /api/leads/[id] error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to update lead" } },
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
  const { gymId } = authResult.auth;
  const { id } = await params;

  try {
    await connectDB();
    const lead = await Lead.findOneAndUpdate(
      { _id: id, gymId },
      { isDeleted: true }
    );

    if (!lead) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Lead not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    console.error("DELETE /api/leads/[id] error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to delete lead" } },
      { status: 500 }
    );
  }
}
