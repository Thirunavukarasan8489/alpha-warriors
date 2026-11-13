import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, Gym, Branch } from "@/models";
import { comparePassword, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

// Simple in-memory rate limiter per IP / identifier
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || record.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 }); // 15 mins
    return true;
  }
  if (record.count >= 10) {
    return false;
  }
  record.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Please enter your phone or email and password",
          },
        },
        { status: 422 }
      );
    }

    const { phoneOrEmail, password } = parsed.data;

    if (!checkRateLimit(ip) || !checkRateLimit(phoneOrEmail)) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many login attempts. Please try again after 15 minutes.",
          },
        },
        { status: 429 }
      );
    }

    await connectDB();

    // Check if phone or email
    let cleanPhone = phoneOrEmail.replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const query = cleanPhone.length >= 10
      ? { $or: [{ phone: cleanPhone }, { email: phoneOrEmail.toLowerCase().trim() }] }
      : { email: phoneOrEmail.toLowerCase().trim() };

    const user = await User.findOne(query);

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid phone/email or password",
          },
        },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          error: {
            code: "ACCOUNT_DEACTIVATED",
            message: "This account has been deactivated. Please contact your gym owner.",
          },
        },
        { status: 403 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid phone/email or password",
          },
        },
        { status: 401 }
      );
    }

    // Fetch gym and default branch
    const gym = await Gym.findById(user.gymId);
    let defaultBranch = null;
    if (user.branchIds && user.branchIds.length > 0) {
      defaultBranch = await Branch.findById(user.branchIds[0]);
    } else {
      defaultBranch = await Branch.findOne({ gymId: user.gymId, isDefault: true });
    }

    // Set cookie
    await setSessionCookie({
      userId: user._id.toString(),
      gymId: user.gymId.toString(),
      branchId: defaultBranch ? defaultBranch._id.toString() : undefined,
      role: user.role,
      name: user.name,
      phone: user.phone,
    });

    return NextResponse.json({
      data: {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
        },
        gym: gym ? { id: gym._id, name: gym.name } : null,
        branch: defaultBranch ? { id: defaultBranch._id, name: defaultBranch.name } : null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to sign in" } },
      { status: 500 }
    );
  }
}

