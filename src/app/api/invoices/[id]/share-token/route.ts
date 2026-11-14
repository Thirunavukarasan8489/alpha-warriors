import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Invoice } from "@/models";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  const { id } = await params;

  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const revoke = body.revoke === true;

    const invoice = await Invoice.findOne({
      _id: id,
      gymId: auth.gymId,
    });

    if (!invoice) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Invoice not found" } },
        { status: 404 }
      );
    }

    if (revoke) {
      invoice.shareToken = undefined;
      await invoice.save();
      return NextResponse.json({ data: { shareToken: null } });
    }

    // Generate random 16-byte hex token if not already exists or requested refresh
    const shareToken = crypto.randomBytes(16).toString("hex");
    invoice.shareToken = shareToken;
    await invoice.save();

    return NextResponse.json({ data: { shareToken } });
  } catch (error) {
    console.error("Share token error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to update share token" } },
      { status: 500 }
    );
  }
}
