import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IBranch extends Document {
  gymId: Types.ObjectId;
  name: string;
  address?: string;
  phone?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String },
    phone: { type: String },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BranchSchema.index({ gymId: 1, name: 1 });

export const Branch: Model<IBranch> =
  mongoose.models.Branch || mongoose.model<IBranch>("Branch", BranchSchema);

