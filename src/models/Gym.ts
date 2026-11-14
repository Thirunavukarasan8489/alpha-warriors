import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGymSettings {
  defaultTaxPercent: number;
  expiringSoonDays: number;
  memberCodePrefix: string;
  nextMemberCodeNumber: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  templates?: {
    expiringSoon?: string;
    expired?: string;
    dues?: string;
    absent?: string;
  };
}

export interface IGym extends Document {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  state?: string;
  logo?: string;
  settings: IGymSettings;
  createdAt: Date;
  updatedAt: Date;
}

const GymSchema = new Schema<IGym>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String },
    gstin: { type: String, trim: true },
    state: { type: String, trim: true, default: "Delhi" },
    logo: { type: String },
    settings: {
      defaultTaxPercent: { type: Number, default: 18 },
      expiringSoonDays: { type: Number, default: 7 },
      memberCodePrefix: { type: String, default: "AW-" },
      nextMemberCodeNumber: { type: Number, default: 1 },
      invoicePrefix: { type: String, default: "INV-" },
      nextInvoiceNumber: { type: Number, default: 1 },
      templates: {
        expiringSoon: {
          type: String,
          default:
            "Hi {name}, your {plan} membership at {gym} is expiring on {endDate}. Renew today to continue your fitness streak!",
        },
        expired: {
          type: String,
          default:
            "Hi {name}, your {plan} membership at {gym} ended on {endDate}. We miss having you on the floor — renew today!",
        },
        dues: {
          type: String,
          default:
            "Hi {name}, friendly reminder that a balance of {amount} is pending for your membership at {gym}. Please clear it at the front desk.",
        },
        absent: {
          type: String,
          default:
            "Hey {name}, we noticed you haven't visited {gym} in {days} days! Don't let your warrior streak break — see you at the gym tomorrow!",
        },
      },
    },
  },
  { timestamps: true }
);

export const Gym: Model<IGym> =
  mongoose.models.Gym || mongoose.model<IGym>("Gym", GymSchema);
