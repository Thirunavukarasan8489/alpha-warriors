import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPayrollRun extends Document {
  gymId: Types.ObjectId;
  staffId: Types.ObjectId;
  month: string; // YYYY-MM
  baseSalary: number; // in paise
  commission: number; // in paise
  deductions: number; // in paise
  leaveDays: number;
  netPay: number; // in paise
  status: "draft" | "paid";
  paidAt?: Date;
  paidBy?: Types.ObjectId;
  expenseId?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollRunSchema = new Schema<IPayrollRun>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    staffId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    month: { type: String, required: true, index: true },
    baseSalary: { type: Number, required: true, default: 0 },
    commission: { type: Number, required: true, default: 0 },
    deductions: { type: Number, required: true, default: 0 },
    leaveDays: { type: Number, required: true, default: 0 },
    netPay: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ["draft", "paid"],
      default: "draft",
      index: true,
    },
    paidAt: { type: Date },
    paidBy: { type: Schema.Types.ObjectId, ref: "User" },
    expenseId: { type: Schema.Types.ObjectId, ref: "Expense" },
    notes: { type: String },
  },
  { timestamps: true }
);

PayrollRunSchema.index({ gymId: 1, month: 1, staffId: 1 }, { unique: true });

export const PayrollRun: Model<IPayrollRun> =
  mongoose.models.PayrollRun || mongoose.model<IPayrollRun>("PayrollRun", PayrollRunSchema);
