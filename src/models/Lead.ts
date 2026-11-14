import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type LeadSource = "walk-in" | "referral" | "social" | "other";
export type LeadStatus = "new" | "contacted" | "trial" | "won" | "lost";

export interface ILead extends Document {
  gymId: Types.ObjectId;
  branchId?: Types.ObjectId;
  name: string;
  phone: string;
  source: LeadSource;
  interest?: string;
  followUpDate?: Date;
  assignedTo?: Types.ObjectId;
  status: LeadStatus;
  notes?: string;
  convertedMemberId?: Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    source: {
      type: String,
      enum: ["walk-in", "referral", "social", "other"],
      default: "walk-in",
    },
    interest: { type: String, trim: true },
    followUpDate: { type: Date, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["new", "contacted", "trial", "won", "lost"],
      default: "new",
      index: true,
    },
    notes: { type: String },
    convertedMemberId: { type: Schema.Types.ObjectId, ref: "Member" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

LeadSchema.index({ gymId: 1, status: 1 });
LeadSchema.index({ gymId: 1, followUpDate: 1 });
LeadSchema.index({ gymId: 1, phone: 1 });

export const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);
