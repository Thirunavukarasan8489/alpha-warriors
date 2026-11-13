import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Gym, Branch, User, Plan } from "@/models";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid input",
            details: parsed.error.issues,
          },
        },
        { status: 422 }
      );
    }

    await connectDB();

    const { gymName, ownerName, phone, email, password } = parsed.data;

    // Check if phone or email already registered across system or gym
    const existingUser = await User.findOne({
      $or: [{ phone }, ...(email ? [{ email }] : [])],
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: {
            code: "DUPLICATE_USER",
            message: "An account with this phone or email already exists.",
          },
        },
        { status: 409 }
      );
    }

    // 1. Create the Gym
    const gym = await Gym.create({
      name: gymName,
      phone,
      email: email || undefined,
      settings: {
        defaultTaxPercent: 18,
        expiringSoonDays: 7,
        memberCodePrefix: "AW-",
        nextMemberCodeNumber: 1,
      },
    });

    // 2. Create the default Branch
    const defaultBranch = await Branch.create({
      gymId: gym._id,
      name: "Main Branch",
      phone,
      isDefault: true,
    });

    // 3. Hash password and create Owner User
    const passwordHash = await hashPassword(password);
    const owner = await User.create({
      gymId: gym._id,
      branchIds: [defaultBranch._id],
      name: ownerName,
      phone,
      email: email || undefined,
      passwordHash,
      role: "owner",
      isActive: true,
    });

    // Seed default starter plans so the gym can immediately enroll members
    await Plan.insertMany([
      {
        gymId: gym._id,
        name: "Monthly",
        durationDays: 30,
        price: 150000, // ₹1,500
        taxPercent: 18,
        isActive: true,
      },
      {
        gymId: gym._id,
        name: "Quarterly (3 Months)",
        durationDays: 90,
        price: 400000, // ₹4,000
        taxPercent: 18,
        isActive: true,
      },
      {
        gymId: gym._id,
        name: "Yearly (12 Months)",
        durationDays: 365,
        price: 1200000, // ₹12,000
        taxPercent: 18,
        isActive: true,
      },
    ]);

    // 4. Set session cookie
    await setSessionCookie({
      userId: owner._id.toString(),
      gymId: gym._id.toString(),
      branchId: defaultBranch._id.toString(),
      role: "owner",
      name: owner.name,
      phone: owner.phone,
    });

    return NextResponse.json({
      data: {
        user: {
          id: owner._id,
          name: owner.name,
          phone: owner.phone,
          email: owner.email,
          role: owner.role,
        },
        gym: {
          id: gym._id,
          name: gym.name,
        },
        branch: {
          id: defaultBranch._id,
          name: defaultBranch.name,
        },
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to create account" } },
      { status: 500 }
    );
  }
}

