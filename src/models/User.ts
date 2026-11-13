import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IUser extends Document {
  gymId: Types.ObjectId;
  branchIds: Types.ObjectId[];
  name: string;
  phone: string;
  email?: string;
  passwordHash: string;
  role: "owner" | "manager" | "receptionist" | "trainer" | "member";
  isActive: boolean;
  payroll?: {
    baseSalary: number; // in paise
    commissionPercent: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    branchIds: [{ type: Schema.Types.ObjectId, ref: "Branch" }],
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["owner", "manager", "receptionist", "trainer", "member"],
      default: "receptionist",
    },
    isActive: { type: Boolean, default: true },
    payroll: {
      baseSalary: { type: Number, default: 0 },
      commissionPercent: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

UserSchema.index({ gymId: 1, phone: 1 });
UserSchema.index({ gymId: 1, email: 1 });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

