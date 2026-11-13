import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IMembership extends Document {
  gymId: Types.ObjectId;
  branchId?: Types.ObjectId;
  memberId: Types.ObjectId;
  planId: Types.ObjectId;
  planName: string;
  durationDays: number;
  price: number; // in paise
  taxPercent: number;
  discount: number; // in paise
  finalAmount: number; // in paise
  startDate: Date;
  endDate: Date;
  status: "active" | "expired" | "frozen" | "ended";
  frozenAt?: Date;
  freezeReason?: string;
  expectedResumeDate?: Date;
  renewedFromId?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<IMembership>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    planName: { type: String, required: true },
    durationDays: { type: Number, required: true },
    price: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, default: 18 },
    discount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "expired", "frozen", "ended"],
      default: "active",
    },
    frozenAt: { type: Date },
    freezeReason: { type: String },
    expectedResumeDate: { type: Date },
    renewedFromId: { type: Schema.Types.ObjectId, ref: "Membership" },
    notes: { type: String },
  },
  { timestamps: true }
);

// Required Day 1 Index
MembershipSchema.index({ gymId: 1, status: 1, endDate: 1 });
MembershipSchema.index({ memberId: 1, createdAt: -1 });

export const Membership: Model<IMembership> =
  mongoose.models.Membership || mongoose.model<IMembership>("Membership", MembershipSchema);

