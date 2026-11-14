import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead, User } from "@/models";
import { requireAuth } from "@/lib/rbac";
import { sanitizePhone } from "@/lib/validation";
import { z } from "zod";

const createLeadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  source: z.enum(["walk-in", "referral", "social", "other"]).default("walk-in"),
  interest: z.string().optional(),
  followUpDate: z.string().optional(),
  assignedTo: z.string().optional(),
  status: z.enum(["new", "contacted", "trial", "won", "lost"]).default("new"),
  notes: z.string().optional(),
  branchId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(["owner", "manager", "receptionist"]);
  if ("response" in authResult) return authResult.response;
  const { gymId } = authResult.auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();
    const branchId = searchParams.get("branchId");

    const query: Record<string, any> = { gymId, isDeleted: false };

    if (status && status !== "all") {
      query.status = status;
    }

    if (branchId) {
      query.branchId = branchId;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ name: regex }, { phone: regex }, { interest: regex }];
    }

    // Sort order: Overdue follow-ups first (followUpDate ascending where set), then by createdAt desc
    const leads = await Lead.find(query)
      .populate("assignedTo", "name")
      .populate("convertedMemberId", "name memberCode")
      .sort({ followUpDate: 1, createdAt: -1 })
      .lean();

    const now = new Date();
    const formatted = leads.map((l: any) => {
      const isOverdue =
        l.followUpDate &&
        new Date(l.followUpDate) < now &&
        l.status !== "won" &&
        l.status !== "lost";

      return {
        id: l._id.toString(),
        name: l.name,
        phone: l.phone,
        source: l.source,
        interest: l.interest || "",
        followUpDate: l.followUpDate ? l.followUpDate.toISOString() : null,
        isOverdue: !!isOverdue,
        assignedTo: l.assignedTo
          ? { id: l.assignedTo._id.toString(), name: l.assignedTo.name }
          : null,
        status: l.status,
        notes: l.notes || "",
        convertedMember: l.convertedMemberId
          ? {
              id: l.convertedMemberId._id.toString(),
              name: l.convertedMemberId.name,
              memberCode: l.convertedMemberId.memberCode,
            }
          : null,
        createdAt: l.createdAt,
      };
    });

    // Partition so overdue leads are strictly at the top
    const overdueLeads = formatted.filter((l) => l.isOverdue);
    const standardLeads = formatted.filter((l) => !l.isOverdue);
    const sortedLeads = [...overdueLeads, ...standardLeads];

    return NextResponse.json({
      data: sortedLeads,
      counts: {
        total: leads.length,
        overdue: overdueLeads.length,
        new: leads.filter((l: any) => l.status === "new").length,
        contacted: leads.filter((l: any) => l.status === "contacted").length,
        trial: leads.filter((l: any) => l.status === "trial").length,
        won: leads.filter((l: any) => l.status === "won").length,
        lost: leads.filter((l: any) => l.status === "lost").length,
      },
    });
  } catch (error: any) {
    console.error("GET /api/leads error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch leads" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(["owner", "manager", "receptionist"]);
  if ("response" in authResult) return authResult.response;
  const { gymId, userId } = authResult.auth;

  try {
    const body = await req.json();
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 422 }
      );
    }

    const cleanPhone = sanitizePhone(parsed.data.phone);

    await connectDB();

    const lead = await Lead.create({
      gymId,
      branchId: parsed.data.branchId || undefined,
      name: parsed.data.name,
      phone: cleanPhone,
      source: parsed.data.source,
      interest: parsed.data.interest || "",
      followUpDate: parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : undefined,
      assignedTo: parsed.data.assignedTo || userId,
      status: parsed.data.status,
      notes: parsed.data.notes || "",
    });

    return NextResponse.json(
      {
        data: {
          id: lead._id.toString(),
          name: lead.name,
          phone: lead.phone,
          status: lead.status,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/leads error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to create lead" } },
      { status: 500 }
    );
  }
}
