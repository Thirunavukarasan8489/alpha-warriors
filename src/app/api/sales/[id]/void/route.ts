import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Sale, Product, Payment, AuditLog } from "@/models";
import { requireAuth } from "@/lib/rbac";
import { z } from "zod";

const voidSaleSchema = z.object({
  reason: z.string().min(3, "Void reason must be at least 3 characters").trim(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner", "manager"]);
  if ("response" in authResult) return authResult.response;
  const { gymId, userId } = authResult.auth;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = voidSaleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 422 }
      );
    }

    await connectDB();
    const sale = await Sale.findOne({ _id: id, gymId });
    if (!sale) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Sale record not found" } },
        { status: 404 }
      );
    }

    if (sale.isVoid) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "This sale has already been voided" } },
        { status: 409 }
      );
    }

    // 1. Restore product stock for all items
    for (const item of sale.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
      });
    }

    // 2. Void linked payment
    if (sale.paymentId) {
      await Payment.findByIdAndUpdate(sale.paymentId, {
        isVoid: true,
        voidReason: `Voided with POS Sale #${sale.saleNumber}: ${parsed.data.reason}`,
        voidedAt: new Date(),
        voidedBy: userId,
      });
    }

    // 3. Mark sale as voided
    sale.isVoid = true;
    sale.voidReason = parsed.data.reason;
    sale.voidedAt = new Date();
    (sale as any).voidedBy = userId;
    await sale.save();

    await AuditLog.create({
      gymId,
      userId,
      action: "SALE_VOIDED",
      resource: "Sale",
      resourceId: id,
      details: {
        saleNumber: sale.saleNumber,
        total: sale.total,
        reason: parsed.data.reason,
      },
    });

    return NextResponse.json({
      data: {
        id: sale._id.toString(),
        isVoid: true,
        voidReason: sale.voidReason,
        voidedAt: sale.voidedAt,
      },
    });
  } catch (error: any) {
    console.error("POST /api/sales/[id]/void error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to void sale" } },
      { status: 500 }
    );
  }
}
