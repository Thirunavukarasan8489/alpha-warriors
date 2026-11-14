import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product, AuditLog } from "@/models";
import { requireAuth } from "@/lib/rbac";
import { rupeesToPaise } from "@/lib/money";
import { z } from "zod";

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().optional(),
  priceRupees: z.number().min(0).optional(),
  costRupees: z.number().min(0).optional(),
  lowStockLevel: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["owner", "manager"]);
  if ("response" in authResult) return authResult.response;
  const { gymId, userId } = authResult.auth;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateProductSchema.safeParse(body);
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

    if (parsed.data.name) product.name = parsed.data.name.trim();
    if (parsed.data.category !== undefined) product.category = parsed.data.category.trim();
    if (parsed.data.priceRupees !== undefined) {
      product.price = rupeesToPaise(parsed.data.priceRupees);
    }
    if (parsed.data.costRupees !== undefined) {
      product.cost = rupeesToPaise(parsed.data.costRupees);
    }
    if (parsed.data.lowStockLevel !== undefined) {
      product.lowStockLevel = parsed.data.lowStockLevel;
    }
    if (parsed.data.isActive !== undefined) {
      product.isActive = parsed.data.isActive;
    }

    await product.save();

    await AuditLog.create({
      gymId,
      userId,
      action: "PRODUCT_UPDATED",
      resource: "Product",
      resourceId: id,
      details: parsed.data,
    });

    return NextResponse.json({
      data: {
        id: product._id.toString(),
        name: product.name,
        category: product.category,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        lowStockLevel: product.lowStockLevel,
        isActive: product.isActive,
      },
    });
  } catch (error: any) {
    console.error("PATCH /api/products/[id] error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to update product" } },
      { status: 500 }
    );
  }
}
