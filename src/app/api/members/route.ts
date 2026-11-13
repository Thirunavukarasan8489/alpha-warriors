import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import {
  Member,
  Gym,
  Plan,
  Membership,
  Invoice,
  Payment,
  User,
} from "@/models";
import { createMemberSchema } from "@/lib/validation";
import { addDays, getStartOfDay } from "@/lib/dates";
import { calculateMemberDisplayStatus, resolveEffectiveMembershipStatus } from "@/lib/status";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search")?.trim() || "";
    const statusFilter = searchParams.get("status") || "all";
    const sort = searchParams.get("sort") || "name";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "25", 10)));
    const branchId = searchParams.get("branchId") || auth.branchId;

    // Gym scoping is strict
    const query: Record<string, unknown> = {
      gymId: auth.gymId,
      isDeleted: false,
    };

    if (branchId) {
      query.branchId = branchId;
    }

    // Role check: Trainer sees only members assigned to them
    if (auth.role === "trainer") {
      query.trainerId = auth.userId;
    }

    if (search) {
      const cleanPhoneSearch = search.replace(/\D/g, "");
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { memberCode: { $regex: search, $options: "i" } },
        ...(cleanPhoneSearch ? [{ phone: { $regex: cleanPhoneSearch } }] : []),
      ];
    }

    const gym = await Gym.findById(auth.gymId);
    const expiringSoonDays = gym?.settings?.expiringSoonDays || 7;

    // Fetch members matching query
    const totalMatching = await Member.countDocuments(query);
    const members = await Member.find(query)
      .sort(sort === "join_date" ? { joinedAt: -1 } : { name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("trainerId", "name");

    // Gather member IDs for batch fetching latest memberships and dues
    const memberIds = members.map((m) => m._id);

    const [allMemberships, allInvoices] = await Promise.all([
      Membership.find({
        gymId: auth.gymId,
        memberId: { $in: memberIds },
      }).sort({ createdAt: -1 }),
      Invoice.find({
        gymId: auth.gymId,
        memberId: { $in: memberIds },
        status: { $ne: "void" },
      }),
    ]);

    // Map memberships by memberId (first one is latest)
    const latestMembershipMap = new Map();
    for (const ms of allMemberships) {
      if (!latestMembershipMap.has(ms.memberId.toString())) {
        latestMembershipMap.set(ms.memberId.toString(), ms);
      }
    }

    // Sum dues per member
    const duesMap = new Map<string, number>();
    for (const inv of allInvoices) {
      const mId = inv.memberId.toString();
      const current = duesMap.get(mId) || 0;
      if (inv.balance > 0) {
        duesMap.set(mId, current + inv.balance);
      }
    }

    // Build enriched member records
    let enriched = members.map((m) => {
      const mId = m._id.toString();
      const latestMs = latestMembershipMap.get(mId);
      const dues = duesMap.get(mId) || 0;
      const displayStatus = calculateMemberDisplayStatus(latestMs, expiringSoonDays);

      return {
        id: m._id,
        memberCode: m.memberCode,
        name: m.name,
        phone: m.phone,
        whatsapp: m.whatsapp,
        photo: m.photo,
        trainerName: m.trainerId ? (m.trainerId as unknown as { name: string }).name : undefined,
        currentPlan: latestMs?.planName || null,
        endDate: latestMs?.endDate || null,
        displayStatus,
        dues,
        joinedAt: m.joinedAt,
      };
    });

    // Apply status filter in memory if specified
    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "dues") {
        enriched = enriched.filter((m) => m.dues > 0);
      } else {
        enriched = enriched.filter((m) => m.displayStatus === statusFilter);
      }
    }

    // Apply custom sort if needed
    if (sort === "end_date") {
      enriched.sort((a, b) => {
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      });
    } else if (sort === "dues") {
      enriched.sort((a, b) => b.dues - a.dues);
    }

    return NextResponse.json({
      data: enriched,
      pagination: {
        page,
        limit,
        total: totalMatching,
        totalPages: Math.ceil(totalMatching / limit),
      },
    });
  } catch (error) {
    console.error("Fetch members error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch members" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    const body = await req.json();
    const parsed = createMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid member data",
            details: parsed.error.issues,
          },
        },
        { status: 422 }
      );
    }

    await connectDB();

    const data = parsed.data;

    // Check duplicate phone per gym
    const existingMember = await Member.findOne({
      gymId: auth.gymId,
      phone: data.phone,
      isDeleted: false,
    });

    if (existingMember) {
      return NextResponse.json(
        {
          error: {
            code: "DUPLICATE_PHONE",
            message: `A member named "${existingMember.name}" already has this phone number.`,
            existingMemberId: existingMember._id,
          },
        },
        { status: 409 }
      );
    }

    // Fetch plan details
    const plan = await Plan.findOne({ _id: data.planId, gymId: auth.gymId });
    if (!plan) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Selected plan not found" } },
        { status: 404 }
      );
    }

    // Generate atomic memberCode
    const gym = await Gym.findByIdAndUpdate(
      auth.gymId,
      { $inc: { "settings.nextMemberCodeNumber": 1 } },
      { new: true }
    );

    const prefix = gym?.settings?.memberCodePrefix || "AW-";
    const nextNum = gym?.settings?.nextMemberCodeNumber || 1001;
    const memberCode = `${prefix}${String(nextNum).padStart(4, "0")}`;

    // Calculate dates
    const startDate = data.startDate ? getStartOfDay(data.startDate) : getStartOfDay(new Date());
    const endDate = addDays(startDate, plan.durationDays);

    // Calculate pricing (in paise)
    const discount = Math.min(data.discount || 0, plan.price);
    const finalAmount = Math.max(0, plan.price - discount);

    // 1. Create Member
    const member = await Member.create({
      gymId: auth.gymId,
      branchId: auth.branchId,
      memberCode,
      name: data.name,
      phone: data.phone,
      whatsapp: data.whatsapp || data.phone,
      email: data.email || undefined,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      gender: data.gender,
      address: data.address,
      photo: data.photo,
      trainerId: data.trainerId || undefined,
      notes: data.notes,
      joinedAt: startDate,
    });

    // 2. Create Membership
    const membership = await Membership.create({
      gymId: auth.gymId,
      branchId: auth.branchId,
      memberId: member._id,
      planId: plan._id,
      planName: plan.name,
      durationDays: plan.durationDays,
      price: plan.price,
      taxPercent: plan.taxPercent,
      discount,
      finalAmount,
      startDate,
      endDate,
      status: "active",
      notes: data.notes,
    });

    // 3. Create Invoice
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const invoice = await Invoice.create({
      gymId: auth.gymId,
      branchId: auth.branchId,
      memberId: member._id,
      membershipId: membership._id,
      invoiceNumber,
      totalAmount: finalAmount,
      paidAmount: 0,
      balance: finalAmount,
      issueDate: startDate,
      status: "unpaid",
      items: [
        {
          description: `${plan.name} (${plan.durationDays} Days Membership)`,
          amount: finalAmount,
        },
      ],
    });

    // 4. Record First Payment (if paid upon registration)
    let payment = null;
    const firstPayment = Math.min(data.firstPaymentAmount || 0, finalAmount);

    if (firstPayment > 0) {
      const modes = data.firstPaymentModes && data.firstPaymentModes.length > 0
        ? data.firstPaymentModes
        : [{ mode: "cash" as const, amount: firstPayment }];

      const paymentNumber = `RCPT-${Date.now().toString().slice(-6)}`;
      payment = await Payment.create({
        gymId: auth.gymId,
        branchId: auth.branchId,
        memberId: member._id,
        invoiceId: invoice._id,
        paymentNumber,
        amount: firstPayment,
        modes,
        receivedAt: new Date(),
        receivedBy: auth.userId,
      });

      // Update invoice
      invoice.paidAmount = firstPayment;
      invoice.balance = finalAmount - firstPayment;
      invoice.status = invoice.balance === 0 ? "paid" : "partial";
      await invoice.save();
    }

    return NextResponse.json(
      {
        data: {
          member: {
            id: member._id,
            memberCode: member.memberCode,
            name: member.name,
            phone: member.phone,
          },
          membershipId: membership._id,
          invoiceId: invoice._id,
          paymentId: payment?._id || null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create member error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to create member" } },
      { status: 500 }
    );
  }
}

