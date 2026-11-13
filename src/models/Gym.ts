import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGym extends Document {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  settings: {
    defaultTaxPercent: number;
    expiringSoonDays: number;
    memberCodePrefix: string;
    nextMemberCodeNumber: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const GymSchema = new Schema<IGym>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String },
    settings: {
      defaultTaxPercent: { type: Number, default: 18 },
      expiringSoonDays: { type: Number, default: 7 },
      memberCodePrefix: { type: String, default: "AW-" },
      nextMemberCodeNumber: { type: Number, default: 1 },
    },
  },
  { timestamps: true }
);

export const Gym: Model<IGym> =
  mongoose.models.Gym || mongoose.model<IGym>("Gym", GymSchema);

