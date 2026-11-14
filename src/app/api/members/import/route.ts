import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Member, Membership, Plan, Invoice, Payment, Gym } from "@/models";
import { sanitizePhone } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";

interface ImportRow {
  name: string;
  phone: string;
  planName?: string;
  startDate?: string;
  endDate?: string;
  amountPaidRupees?: number | string;
  balanceRupees?: number | string;
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(["owner", "manager"]);
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;
  const isPreview = req.nextUrl.searchParams.get("preview") === "true";

  try {
    const body = await req.json();
    const rows: ImportRow[] = body.rows || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "No data rows provided for import" } },
        { status: 422 }
      );
    }

    await connectDB();

    // Load existing gym, members and plans for fast lookup
    const gym = await Gym.findById(auth.gymId);
    if (!gym) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Gym not found" } },
        { status: 404 }
      );
    }

    const existingMembers = await Member.find({ gymId: auth.gymId }).select("phone");
    const existingPhoneSet = new Set(existingMembers.map((m) => m.phone));

    const plans = await Plan.find({ gymId: auth.gymId, isActive: true });
    const planMap = new Map<string, any>();
    for (const p of plans) {
      planMap.set(p.name.toLowerCase().trim(), p);
    }

    const seenPhonesInFile = new Set<string>();
    const validRows: (ImportRow & { cleanPhone: string; plan?: any; rowIndex: number })[] = [];
    const errors: { row: number; name: string; phone: string; issue: string }[] = [];

    // Validation Pass
    rows.forEach((row, idx) => {
      const rowNum = idx + 1;
      const name = (row.name || "").trim();
      const rawPhone = row.phone || "";
      const cleanPhone = sanitizePhone(String(rawPhone));

      if (!name) {
        errors.push({ row: rowNum, name: name || "—", phone: String(rawPhone), issue: "Name is required" });
        return;
      }

      if (!cleanPhone || cleanPhone.length < 10) {
        errors.push({ row: rowNum, name, phone: String(rawPhone), issue: "Invalid 10-digit phone number" });
        return;
      }

      if (seenPhonesInFile.has(cleanPhone)) {
        errors.push({ row: rowNum, name, phone: cleanPhone, issue: "Duplicate phone number within import file" });
        return;
      }

      if (existingPhoneSet.has(cleanPhone)) {
        errors.push({ row: rowNum, name, phone: cleanPhone, issue: "Member with this phone already exists in gym" });
        return;
      }

      let matchedPlan = null;
      if (row.planName && row.planName.trim()) {
        matchedPlan = planMap.get(row.planName.toLowerCase().trim());
        if (!matchedPlan) {
          errors.push({
            row: rowNum,
            name,
            phone: cleanPhone,
            issue: `Plan "${row.planName}" not found. Create this plan first or leave plan empty.`,
          });
          return;
        }
      }

      seenPhonesInFile.add(cleanPhone);
      validRows.push({
        ...row,
        name,
        cleanPhone,
        plan: matchedPlan,
        rowIndex: rowNum,
      });
    });

    // If PREVIEW mode: Return validation findings immediately
    if (isPreview) {
      return NextResponse.json({
        data: {
          totalRows: rows.length,
          validCount: validRows.length,
          invalidCount: errors.length,
          errors,
          sampleValid: validRows.slice(0, 5).map((r) => ({
            name: r.name,
            phone: r.cleanPhone,
            planName: r.plan?.name || "None",
            paid: r.amountPaidRupees || 0,
          })),
        },
      });
    }

    // COMMIT mode: Import valid rows
    let nextCodeNum = gym.settings.nextMemberCodeNumber || 1;
    let nextInvNum = gym.settings.nextInvoiceNumber || 1;
    const prefix = gym.settings.memberCodePrefix || "AW-";
    const invPrefix = gym.settings.invoicePrefix || "INV-";

    let importedCount = 0;

    for (const item of validRows) {
      const memberCode = `${prefix}${String(nextCodeNum).padStart(4, "0")}`;
      nextCodeNum += 1;

      // Create Member
      const member = await Member.create({
        gymId: auth.gymId,
        branchId: auth.branchId,
        name: item.name,
        phone: item.cleanPhone,
        memberCode,
        joinedAt: item.startDate ? new Date(item.startDate) : new Date(),
      });

      // If a plan was matched, create Membership & Invoice
      if (item.plan) {
        const plan = item.plan;
        const startDate = item.startDate ? new Date(item.startDate) : new Date();
        const durationDays = plan.durationDays || 30;

        let endDate: Date;
        if (item.endDate) {
          endDate = new Date(item.endDate);
        } else {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + durationDays);
        }

        const now = new Date();
        const membershipStatus = endDate < now ? "expired" : "active";

        const membership = await Membership.create({
          gymId: auth.gymId,
          branchId: auth.branchId,
          memberId: member._id,
          planId: plan._id,
          planName: plan.name,
          durationDays,
          startDate,
          endDate,
          price: plan.price,
          taxPercent: plan.taxPercent || 0,
          status: membershipStatus,
        });

        // Create Invoice
        const invoiceNumber = `${invPrefix}${String(nextInvNum).padStart(4, "0")}`;
        nextInvNum += 1;

        const paidPaise = item.amountPaidRupees !== undefined ? rupeesToPaise(item.amountPaidRupees) : plan.price;
        const balancePaise = Math.max(0, plan.price - paidPaise);
        const invStatus = balancePaise === 0 ? "paid" : paidPaise > 0 ? "partial" : "unpaid";

        const invoice = await Invoice.create({
          gymId: auth.gymId,
          branchId: auth.branchId,
          memberId: member._id,
          membershipId: membership._id,
          invoiceNumber,
          totalAmount: plan.price,
          paidAmount: paidPaise,
          balance: balancePaise,
          issueDate: startDate,
          status: invStatus,
          items: [{ description: `${plan.name} Membership`, amount: plan.price }],
        });

        // Record initial payment if paidPaise > 0
        if (paidPaise > 0) {
          await Payment.create({
            gymId: auth.gymId,
            branchId: auth.branchId,
            memberId: member._id,
            invoiceId: invoice._id,
            paymentNumber: `PAY-${invoiceNumber}`,
            amount: paidPaise,
            modes: [{ mode: "cash", amount: paidPaise }],
            receivedAt: startDate,
            notes: "Imported historical payment",
            receivedBy: auth.userId,
          });
        }
      }

      importedCount += 1;
    }

    // Persist updated counters
    gym.settings.nextMemberCodeNumber = nextCodeNum;
    gym.settings.nextInvoiceNumber = nextInvNum;
    gym.markModified("settings");
    await gym.save();

    return NextResponse.json({
      data: {
        totalRows: rows.length,
        importedCount,
        skippedCount: errors.length,
        errors,
      },
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to process member import" } },
      { status: 500 }
    );
  }
}
