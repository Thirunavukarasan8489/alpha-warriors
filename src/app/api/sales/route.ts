import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Sale, Product, Payment, Member, AuditLog } from "@/models";
import { requireAuth } from "@/lib/rbac";
import { sanitizePhone } from "@/lib/validation";
import { z } from "zod";

const createSaleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1),
      })
    )
    .min(1, "At least one product must be selected"),
  memberId: z.string().optional(),
  guestName: z.string().optional(),
  guestPhone: z.string().optional(),
  discountPaise: z.number().int().min(0).default(0),
  paymentModes: z
    .array(
      z.object({
        mode: z.enum(["cash", "upi", "card", "bank_transfer"]),
        amount: z.number().int().min(0),
      })
    )
    .min(1, "Payment mode is required"),
  branchId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(["owner", "manager", "receptionist"]);
  if ("response" in authResult) return authResult.response;
  const { gymId, role } = authResult.auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const search = searchParams.get("search")?.trim();

    const query: Record<string, any> = { gymId };
    if (branchId) query.branchId = branchId;
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ saleNumber: regex }, { guestName: regex }, { guestPhone: regex }];
    }

    const sales = await Sale.find(query)
      .populate("memberId", "name phone memberCode")
      .populate("soldBy", "name")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const canSeeCost = role === "owner" || role === "manager";

    const formatted = sales.map((s: any) => ({
      id: s._id.toString(),
      saleNumber: s.saleNumber,
      customer: s.memberId
        ? {
            id: s.memberId._id.toString(),
            name: s.memberId.name,
            phone: s.memberId.phone,
            code: s.memberId.memberCode,
            isMember: true,
          }
        : {
            name: s.guestName || "Walk-in Guest",
            phone: s.guestPhone || "",
            isMember: false,
          },
      items: s.items.map((it: any) => ({
        productId: it.productId?.toString(),
        name: it.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        unitCost: canSeeCost ? it.unitCost : undefined,
        total: it.total,
      })),
      subtotal: s.subtotal,
      discount: s.discount,
      total: s.total,
      profit: canSeeCost ? s.total - s.totalCost : undefined,
      isVoid: s.isVoid,
      voidReason: s.voidReason,
      voidedAt: s.voidedAt,
      soldBy: s.soldBy?.name || "Staff",
      createdAt: s.createdAt,
    }));

    return NextResponse.json({ data: formatted });
  } catch (error: any) {
    console.error("GET /api/sales error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch sales" } },
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
    const parsed = createSaleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
        { status: 422 }
      );
    }

    await connectDB();

    // 1. Verify all products and stock
    const itemDetails: {
      productId: any;
      name: string;
      quantity: number;
      unitPrice: number;
      unitCost: number;
      total: number;
    }[] = [];

    let subtotalPaise = 0;
    let totalCostPaise = 0;

    for (const item of parsed.data.items) {
      const product = await Product.findOne({ _id: item.productId, gymId, isActive: true });
      if (!product) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: `Product not found or inactive` } },
          { status: 404 }
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          {
            error: {
              code: "OUT_OF_STOCK",
              message: `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${item.quantity}`,
            },
          },
          { status: 400 }
        );
      }

      const lineTotal = product.price * item.quantity;
      const lineCost = product.cost * item.quantity;
      subtotalPaise += lineTotal;
      totalCostPaise += lineCost;

      itemDetails.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        unitCost: product.cost,
        total: lineTotal,
      });
    }

    const discountPaise = Math.min(parsed.data.discountPaise, subtotalPaise);
    const finalTotalPaise = Math.max(0, subtotalPaise - discountPaise);

    // Validate payment modes sum equals total
    const paymentSum = parsed.data.paymentModes.reduce((sum, m) => sum + m.amount, 0);
    if (paymentSum !== finalTotalPaise) {
      return NextResponse.json(
        {
          error: {
            code: "PAYMENT_MISMATCH",
            message: `Total payment modes amount (₹${paymentSum / 100}) does not match sale total (₹${finalTotalPaise / 100})`,
          },
        },
        { status: 400 }
      );
    }

    // 2. Reduce stock for each product
    for (const item of parsed.data.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity },
      });
    }

    // 3. Generate sequential sale number
    const totalSalesCount = await Sale.countDocuments({ gymId });
    const saleNumber = `SALE-${(totalSalesCount + 1).toString().padStart(4, "0")}`;

    // 4. Create Payment row (counts in daily payments collection!)
    const payment = await Payment.create({
      gymId,
      branchId: parsed.data.branchId || undefined,
      memberId: parsed.data.memberId || undefined,
      amount: finalTotalPaise,
      modes: parsed.data.paymentModes,
      receivedAt: new Date(),
      receivedBy: userId,
      notes: `POS Merchandise/Supplement Sale #${saleNumber}`,
      isVoid: false,
    });

    // 5. Create Sale document
    const cleanGuestPhone = parsed.data.guestPhone
      ? sanitizePhone(parsed.data.guestPhone)
      : undefined;

    const sale = await Sale.create({
      gymId,
      branchId: parsed.data.branchId || undefined,
      saleNumber,
      memberId: parsed.data.memberId || undefined,
      guestName: parsed.data.guestName?.trim() || undefined,
      guestPhone: cleanGuestPhone,
      items: itemDetails,
      subtotal: subtotalPaise,
      discount: discountPaise,
      total: finalTotalPaise,
      totalCost: totalCostPaise,
      paymentId: payment._id,
      soldBy: userId,
      isVoid: false,
    });

    await AuditLog.create({
      gymId,
      userId,
      action: "SALE_COMPLETED",
      resource: "Sale",
      resourceId: sale._id.toString(),
      details: {
        saleNumber,
        total: finalTotalPaise,
        itemsCount: itemDetails.length,
      },
    });

    return NextResponse.json(
      {
        data: {
          id: sale._id.toString(),
          saleNumber: sale.saleNumber,
          total: sale.total,
          items: sale.items,
          customerName: parsed.data.guestName || "Member",
          createdAt: sale.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/sales error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to process sale" } },
      { status: 500 }
    );
  }
}
