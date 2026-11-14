/**
 * WhatsApp sharing helpers.
 * Note: Never sends messages automatically. It builds `wa.me` links so a user presses send.
 */

/**
 * Format phone number to clean country code digits (e.g. 919876543210)
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  // If Indian 10-digit number without country code, add 91
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
}

/**
 * Build a wa.me direct share link.
 */
export function buildShareLink(phone: string, message: string = ""): string {
  const digits = cleanPhoneNumber(phone);
  if (!digits) return "#";
  if (!message) {
    return `https://wa.me/${digits}`;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message.trim())}`;
}

export interface TemplateParams {
  name?: string;
  gym?: string;
  plan?: string;
  endDate?: string;
  amount?: string;
  modes?: string;
  date?: string;
  invoiceNumber?: string;
  balance?: string;
  days?: number | string;
}

/**
 * Generate formatted WhatsApp message templates
 */
export const WhatsAppTemplates = {
  welcome: (p: TemplateParams) =>
    `Hello ${p.name || "Member"}, welcome to *${p.gym || "our Gym"}*! 🎉\nYour membership for *${p.plan || "Plan"}* is active until *${p.endDate || ""}*. Stay consistent, stay strong! 💪`,

  receipt: (p: TemplateParams) =>
    `*Payment Receipt - ${p.gym || "Gym"}*\n\nHi ${p.name || "Member"},\nWe received *${p.amount}* via ${p.modes || "Cash/UPI"} on ${p.date}.\nReceipt / Invoice: ${p.invoiceNumber || "N/A"}\nRemaining Balance: *${p.balance || "₹0"}*\n\nThank you for training with us! 🏋️‍♂️`,

  expiryReminder: (p: TemplateParams) =>
    `Hi ${p.name || "Member"},\nYour membership at *${p.gym || "our Gym"}* (${p.plan || ""}) is ending on *${p.endDate}*.\nRenew today to keep your fitness streak uninterrupted! ⚡`,

  expiredNotice: (p: TemplateParams) =>
    `Hi ${p.name || "Member"},\nYour membership at *${p.gym || "our Gym"}* (${p.plan || ""}) ended on *${p.endDate}*.\nWe miss having you on the floor — renew today to get back into training! 💪`,

  duesReminder: (p: TemplateParams) =>
    `Hi ${p.name || "Member"},\nFriendly reminder from *${p.gym || "our Gym"}*: an amount of *${p.amount}* is pending towards your membership.\nPlease clear it at your earliest convenience. Thank you! 🙏`,

  absentReminder: (p: TemplateParams) =>
    `Hey ${p.name || "Member"}, we noticed you haven't checked in for the last ${p.days || 7} days at *${p.gym || "our Gym"}*! We miss seeing you crush your workouts. Come back soon! 🔥`,
};

