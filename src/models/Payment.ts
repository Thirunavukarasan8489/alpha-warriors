import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPaymentMode {
  mode: "cash" | "upi" | "card" | "bank" | "other";
  amount: number; // in paise
}

export interface IPayment extends Document {
  gymId: Types.ObjectId;
  branchId?: Types.ObjectId;
  memberId: Types.ObjectId;
  invoiceId: Types.ObjectId;
  paymentNumber: string;
  amount: number; // in paise
  modes: IPaymentMode[];
  receivedAt: Date;
  receivedBy: Types.ObjectId;
  isVoid: boolean;
  voidReason?: string;
  voidAt?: Date;
  voidBy?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    paymentNumber: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    modes: [
      {
        mode: {
          type: String,
          enum: ["cash", "upi", "card", "bank", "other"],
          required: true,
        },
        amount: { type: Number, required: true, min: 1 },
      },
    ],
    receivedAt: { type: Date, default: Date.now },
    receivedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isVoid: { type: Boolean, default: false },
    voidReason: { type: String },
    voidAt: { type: Date },
    voidBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
  },
  { timestamps: true }
);

// Required Day 1 Index
PaymentSchema.index({ gymId: 1, receivedAt: -1 });
PaymentSchema.index({ gymId: 1, paymentNumber: 1 });
PaymentSchema.index({ memberId: 1, receivedAt: -1 });

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);

