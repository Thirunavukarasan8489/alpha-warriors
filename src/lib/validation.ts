import { z } from "zod";

/**
 * Helper to clean and format phone to 10/12-digit Indian phone
 */
export function sanitizePhone(val: string): string {
  let digits = val.replace(/\D/g, "");
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
}

/**
 * Standard phone validator: converts to digits, validates length (10 to 13 digits)
 */
export const phoneSchema = z
  .string()
  .min(10, "Phone number is too short")
  .max(15, "Phone number is too long")
  .transform((val) => {
    let digits = val.replace(/\D/g, "");
    if (digits.length === 10) {
      digits = `91${digits}`;
    }
    return digits;
  });

export const loginSchema = z.object({
  phoneOrEmail: z.string().min(1, "Phone or email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  gymName: z.string().min(2, "Gym name is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  phone: phoneSchema,
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const planSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  durationDays: z.number().int().positive("Duration must be at least 1 day"),
  price: z.number().int().nonnegative("Price must be 0 or greater (in paise)"),
  taxPercent: z.number().min(0).max(100).default(18),
  sessions: z.number().int().optional(),
  isActive: z.boolean().default(true),
});

export const paymentModeSchema = z.object({
  mode: z.enum(["cash", "upi", "card", "bank", "other"]),
  amount: z.number().int().positive("Payment mode amount must be greater than 0"),
});

export const collectPaymentSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: z.number().int().positive("Payment amount must be greater than 0"),
  modes: z.array(paymentModeSchema).min(1, "At least one payment mode is required"),
  receivedAt: z.string().optional(),
  notes: z.string().optional(),
});

export const createMemberSchema = z.object({
  name: z.string().min(1, "Member name is required"),
  phone: phoneSchema,
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  address: z.string().optional(),
  photo: z.string().optional(),
  trainerId: z.string().optional(),
  notes: z.string().optional(),
  // Plan section (for initial enrollment)
  planId: z.string().min(1, "Please select an initial plan"),
  startDate: z.string().optional(),
  discount: z.number().int().min(0).default(0), // in paise
  // First payment (optional)
  firstPaymentAmount: z.number().int().min(0).default(0), // in paise
  firstPaymentModes: z.array(paymentModeSchema).optional(),
});

export const editMemberSchema = z.object({
  name: z.string().min(1, "Member name is required"),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  address: z.string().optional(),
  photo: z.string().optional(),
  trainerId: z.string().optional(),
  notes: z.string().optional(),
});

export const renewMembershipSchema = z.object({
  planId: z.string().min(1, "Plan is required"),
  startDate: z.string().optional(),
  discount: z.number().int().min(0).default(0),
  firstPaymentAmount: z.number().int().min(0).default(0),
  firstPaymentModes: z.array(paymentModeSchema).optional(),
  notes: z.string().optional(),
});

export const freezeMembershipSchema = z.object({
  startDate: z.string().optional(),
  expectedResumeDate: z.string().optional(),
  reason: z.string().min(1, "Freeze reason is required"),
});

export const resumeMembershipSchema = z.object({
  resumeDate: z.string().optional(),
});

export const extendMembershipSchema = z.object({
  days: z.number().int().positive("Days to extend must be at least 1"),
  reason: z.string().min(1, "Reason for extension is required"),
});

export const upgradeMembershipSchema = z.object({
  newPlanId: z.string().min(1, "New plan is required"),
});

export const endMembershipSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

export const attendanceCheckInSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  source: z.enum(["manual", "qr", "biometric"]).default("manual"),
  date: z.string().optional(),
});

export const voidPaymentSchema = z.object({
  reason: z.string().min(1, "Reason for voiding payment is required"),
});

