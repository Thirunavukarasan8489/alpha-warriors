import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IInvoiceItem {
  description: string;
  amount: number; // in paise
}

export interface IInvoice extends Document {
  gymId: Types.ObjectId;
  branchId?: Types.ObjectId;
  memberId: Types.ObjectId;
  membershipId?: Types.ObjectId;
  invoiceNumber: string;
  totalAmount: number; // in paise
  paidAmount: number; // in paise
  balance: number; // in paise
  issueDate: Date;
  dueDate?: Date;
  status: "paid" | "partial" | "unpaid" | "void";
  items: IInvoiceItem[];
  shareToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    membershipId: { type: Schema.Types.ObjectId, ref: "Membership" },
    invoiceNumber: { type: String, required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balance: { type: Number, required: true, min: 0 },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ["paid", "partial", "unpaid", "void"],
      default: "unpaid",
    },
    items: [
      {
        description: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
    shareToken: { type: String },
  },
  { timestamps: true }
);

InvoiceSchema.index({ gymId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ gymId: 1, balance: 1 });
InvoiceSchema.index({ memberId: 1, createdAt: -1 });

export const Invoice: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);

