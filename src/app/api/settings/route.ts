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
    if (!gym) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Gym organization not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: gym._id,
        name: gym.name,
        phone: gym.phone,
        email: gym.email,
        address: gym.address,
        gstin: gym.gstin,
        state: gym.state,
        logo: gym.logo,
        settings: gym.settings,
      },
    });
  } catch (error) {
    console.error("Fetch settings error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to load gym settings" } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireAuth(["owner"]);
  if ("response" in authResult) return authResult.response;

  const { auth } = authResult;

  try {
    const body = await req.json();
    const {
      name,
      phone,
      email,
      address,
      gstin,
      state,
      logo,
      defaultTaxPercent,
      expiringSoonDays,
      invoicePrefix,
      memberCodePrefix,
    } = body;

    await connectDB();

    const gym = await Gym.findById(auth.gymId);
    if (!gym) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Gym organization not found" } },
        { status: 404 }
      );
    }

    if (name) gym.name = name.trim();
    if (phone) gym.phone = phone.trim();
    if (email !== undefined) gym.email = email.trim().toLowerCase();
    if (address !== undefined) gym.address = address.trim();
    if (gstin !== undefined) gym.gstin = gstin.trim().toUpperCase();
    if (state !== undefined) gym.state = state.trim();
    if (logo !== undefined) gym.logo = logo;

    if (!gym.settings) {
      gym.settings = {
        defaultTaxPercent: 18,
        expiringSoonDays: 7,
        memberCodePrefix: "AW-",
        nextMemberCodeNumber: 1,
        invoicePrefix: "INV-",
        nextInvoiceNumber: 1,
      };
    }

    if (defaultTaxPercent !== undefined) gym.settings.defaultTaxPercent = Number(defaultTaxPercent);
    if (expiringSoonDays !== undefined) gym.settings.expiringSoonDays = Math.max(1, Number(expiringSoonDays));
    if (invoicePrefix !== undefined) gym.settings.invoicePrefix = invoicePrefix.trim().toUpperCase();
    if (memberCodePrefix !== undefined) gym.settings.memberCodePrefix = memberCodePrefix.trim().toUpperCase();

    await gym.save();

    return NextResponse.json({
      data: {
        id: gym._id,
        name: gym.name,
        phone: gym.phone,
        email: gym.email,
        address: gym.address,
        gstin: gym.gstin,
        state: gym.state,
        logo: gym.logo,
        settings: gym.settings,
      },
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to update settings" } },
      { status: 500 }
    );
  }
}
