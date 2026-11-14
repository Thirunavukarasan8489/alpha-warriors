import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product, AuditLog } from "@/models";
import { requireAuth } from "@/lib/rbac";
import { rupeesToPaise } from "@/lib/money";
import { z } from "zod";

const createProductSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters").trim(),
  category: z.string().optional(),
  priceRupees: z.number().min(0),
  costRupees: z.number().min(0).default(0),
  stock: z.number().int().min(0).default(0),
  lowStockLevel: z.number().int().min(0).default(5),
});

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(["owner", "manager", "receptionist", "trainer"]);
  if ("response" in authResult) return authResult.response;
  const { gymId, role } = authResult.auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const search = searchParams.get("search")?.trim();

    const query: Record<string, any> = { gymId };
    if (activeOnly) query.isActive = true;
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ name: regex }, { category: regex }];
    }

    const products = await Product.find(query).sort({ name: 1 }).lean();

    const canSeeCost = role === "owner" || role === "manager";

    return NextResponse.json({
      data: products.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        category: p.category || "General",
        price: p.price, // paise
        cost: canSeeCost ? p.cost : undefined, // hidden from receptionists & trainers
        stock: p.stock,
        lowStockLevel: p.lowStockLevel,
        isLowStock: p.stock <= p.lowStockLevel,
        isActive: p.isActive,
        createdAt: p.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch products" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(["owner", "manager"]);
  if ("response" in authResult) return authResult.response;
  const { gymId, userId } = authResult.auth;

  try {
    const body = await req.json();
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 422 }
      );
    }

    await connectDB();

    const pricePaise = rupeesToPaise(parsed.data.priceRupees);
    const costPaise = rupeesToPaise(parsed.data.costRupees);

    const product = await Product.create({
      gymId,
      name: parsed.data.name,
      category: parsed.data.category || "Supplements",
      price: pricePaise,
      cost: costPaise,
      stock: parsed.data.stock,
      lowStockLevel: parsed.data.lowStockLevel,
      isActive: true,
    });

    await AuditLog.create({
      gymId,
      userId,
      action: "PRODUCT_CREATED",
      resource: "Product",
      resourceId: product._id.toString(),
      details: { name: product.name, price: product.price, stock: product.stock },
    });

    return NextResponse.json(
      {
        data: {
          id: product._id.toString(),
          name: product.name,
          category: product.category,
          price: product.price,
          cost: product.cost,
          stock: product.stock,
          lowStockLevel: product.lowStockLevel,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/products error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to create product" } },
      { status: 500 }
    );
  }
}
