import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IMember extends Document {
  gymId: Types.ObjectId;
  branchId?: Types.ObjectId;
  memberCode: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  address?: string;
  photo?: string;
  trainerId?: Types.ObjectId;
  notes?: string;
  joinedAt: Date;
  isDeleted: boolean;
  portalTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MemberSchema = new Schema<IMember>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    memberCode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
    },
    address: { type: String },
    photo: { type: String },
    trainerId: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
    joinedAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
    portalTokenHash: { type: String },
  },
  { timestamps: true }
);

// Required Day 1 Indexes
MemberSchema.index({ gymId: 1, phone: 1 }, { unique: true });
MemberSchema.index({ gymId: 1, name: 1 });
MemberSchema.index({ gymId: 1, memberCode: 1 });

export const Member: Model<IMember> =
  mongoose.models.Member || mongoose.model<IMember>("Member", MemberSchema);

