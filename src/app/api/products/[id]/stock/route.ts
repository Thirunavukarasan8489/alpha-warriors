import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product, AuditLog } from "@/models";
import { requireAuth } from "@/lib/rbac";
import { z } from "zod";

const adjustStockSchema = z.object({
  adjustment: z.number().int(), // positive or negative
  reason: z.string().min(2, "Reason is required").trim(),
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
    const body = await req.json();
    const parsed = adjustStockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 422 }
      );
    }

    await connectDB();
    const product = await Product.findOne({ _id: id, gymId });
    if (!product) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Product not found" } },
        { status: 404 }
      );
    }

    const newStock = product.stock + parsed.data.adjustment;
    if (newStock < 0) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: `Stock cannot go below 0 (current: ${product.stock})` } },
        { status: 400 }
      );
    }

    const oldStock = product.stock;
    product.stock = newStock;
    await product.save();

    await AuditLog.create({
      gymId,
      userId,
      action: "STOCK_ADJUSTED",
      resource: "Product",
      resourceId: id,
      details: {
        productName: product.name,
        oldStock,
        newStock,
        adjustment: parsed.data.adjustment,
        reason: parsed.data.reason,
      },
    });

    return NextResponse.json({
      data: {
        id: product._id.toString(),
        stock: product.stock,
        isLowStock: product.stock <= product.lowStockLevel,
      },
    });
  } catch (error: any) {
    console.error("POST /api/products/[id]/stock error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to adjust stock" } },
      { status: 500 }
    );
  }
}
