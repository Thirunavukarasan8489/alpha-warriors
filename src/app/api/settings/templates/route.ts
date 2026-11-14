import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";
import { Gym } from "@/models";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(["owner", "manager"]);
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    await connectDB();
    const gym = await Gym.findById(auth.gymId);

    return NextResponse.json({
      data: gym?.settings?.templates || {
        expiringSoon:
          "Hi {name}, your {plan} membership at {gym} is expiring on {endDate}. Renew today to continue your fitness streak!",
        expired:
          "Hi {name}, your {plan} membership at {gym} ended on {endDate}. We miss having you on the floor — renew today!",
        dues:
          "Hi {name}, friendly reminder that a balance of {amount} is pending for your membership at {gym}. Please clear it at the front desk.",
        absent:
          "Hey {name}, we noticed you haven't visited {gym} in {days} days! Don't let your warrior streak break — see you at the gym tomorrow!",
      },
    });
  } catch (error) {
    console.error("Fetch templates error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to load templates" } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const authResult = await requireAuth(["owner", "manager"]);
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    const body = await req.json();
    const { expiringSoon, expired, dues, absent } = body;

    await connectDB();
    const gym = await Gym.findById(auth.gymId);
    if (!gym) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Gym not found" } },
        { status: 404 }
      );
    }

    if (!gym.settings.templates) {
      gym.settings.templates = {};
    }

    if (expiringSoon !== undefined) gym.settings.templates.expiringSoon = expiringSoon;
    if (expired !== undefined) gym.settings.templates.expired = expired;
    if (dues !== undefined) gym.settings.templates.dues = dues;
    if (absent !== undefined) gym.settings.templates.absent = absent;

    gym.markModified("settings");
    await gym.save();

    return NextResponse.json({ data: gym.settings.templates });
  } catch (error) {
    console.error("Update templates error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to save templates" } },
      { status: 500 }
    );
  }
}
