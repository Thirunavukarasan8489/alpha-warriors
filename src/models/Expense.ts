import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IExpense extends Document {
  gymId: Types.ObjectId;
  branchId?: Types.ObjectId;
  date: Date;
  category: string;
  amount: number; // in paise
  note?: string;
  isDeleted: boolean;
  payrollRunId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    date: { type: Date, default: Date.now, required: true },
    category: {
      type: String,
      required: true,
      trim: true,
      default: "other",
    },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
    payrollRunId: { type: Schema.Types.ObjectId },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ExpenseSchema.index({ gymId: 1, date: -1 });
ExpenseSchema.index({ gymId: 1, category: 1 });
ExpenseSchema.index({ gymId: 1, isDeleted: 1 });

export const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
