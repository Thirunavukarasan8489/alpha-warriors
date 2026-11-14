import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { User, Branch } from "@/models";
import { sanitizePhone } from "@/lib/validation";

function generateOneTimePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AW#${code}`;
}

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(["owner", "manager"]);
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    await connectDB();

    const users = await User.find({ gymId: auth.gymId })
      .select("-passwordHash")
      .populate("branchIds", "name")
      .sort({ createdAt: 1 });

    return NextResponse.json({
      data: users.map((u) => ({
        id: u._id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        branches: (u.branchIds || []).map((b: any) => ({
          id: b._id,
          name: b.name,
        })),
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error("Fetch staff error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch staff" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(["owner", "manager"]);
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    const body = await req.json();
    const { name, phone, email, role, branchIds } = body;

    if (!name || !phone || !role) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Name, phone, and role are required" } },
        { status: 422 }
      );
    }

    if (role === "owner") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Cannot create additional owner accounts" } },
        { status: 403 }
      );
    }

    if (auth.role === "manager" && role === "manager") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only gym owners can create or assign managers" } },
        { status: 403 }
      );
    }

    if (!["manager", "receptionist", "trainer"].includes(role)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Role must be manager, receptionist, or trainer" } },
        { status: 422 }
      );
    }

    const cleanPhone = sanitizePhone(phone);
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Valid 10-digit phone number is required" } },
        { status: 422 }
      );
    }

    await connectDB();

    // Check if phone already registered in this gym
    const existing = await User.findOne({
      gymId: auth.gymId,
      phone: cleanPhone,
    });

    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "A staff member with this phone number already exists" } },
        { status: 409 }
      );
    }

    const oneTimePassword = generateOneTimePassword();
    const passwordHash = await bcrypt.hash(oneTimePassword, 10);

    const newUser = await User.create({
      gymId: auth.gymId,
      branchIds: branchIds || (auth.branchId ? [auth.branchId] : []),
      name: name.trim(),
      phone: cleanPhone,
      email: email?.trim().toLowerCase() || undefined,
      passwordHash,
      role,
      isActive: true,
    });

    return NextResponse.json(
      {
        data: {
          id: newUser._id,
          name: newUser.name,
          phone: newUser.phone,
          email: newUser.email,
          role: newUser.role,
          isActive: newUser.isActive,
          oneTimePassword, // Given only once in this creation response!
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create staff error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to create staff account" } },
      { status: 500 }
    );
  }
}
