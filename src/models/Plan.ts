import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPlan extends Document {
  gymId: Types.ObjectId;
  name: string;
  durationDays: number;
  price: number; // in paise
  admissionFee?: number; // in paise (optional one-time enrollment fee)
  taxPercent: number;
  sessions?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    name: { type: String, required: true, trim: true },
    durationDays: { type: Number, required: true },
    price: { type: Number, required: true, min: 0 },
    admissionFee: { type: Number, default: 0, min: 0 },
    taxPercent: { type: Number, default: 18 },
    sessions: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PlanSchema.index({ gymId: 1, isActive: 1 });

export const Plan: Model<IPlan> =
  mongoose.models.Plan || mongoose.model<IPlan>("Plan", PlanSchema);

