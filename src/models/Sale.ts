import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ISaleItem {
  productId: Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number; // in paise
  unitCost: number; // in paise
  total: number; // in paise
}

export interface ISale extends Document {
  gymId: Types.ObjectId;
  branchId?: Types.ObjectId;
  saleNumber: string;
  memberId?: Types.ObjectId;
  guestName?: string;
  guestPhone?: string;
  items: ISaleItem[];
  subtotal: number; // in paise
  discount: number; // in paise
  total: number; // in paise
  totalCost: number; // in paise
  paymentId?: Types.ObjectId;
  soldBy: Types.ObjectId;
  isVoid: boolean;
  voidReason?: string;
  voidedAt?: Date;
  voidedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    saleNumber: { type: String, required: true, trim: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member" },
    guestName: { type: String, trim: true },
    guestPhone: { type: String, trim: true },
    items: [SaleItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, default: 0, min: 0 },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    soldBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isVoid: { type: Boolean, default: false },
    voidReason: { type: String },
    voidedAt: { type: Date },
    voidedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

SaleSchema.index({ gymId: 1, createdAt: -1 });
SaleSchema.index({ gymId: 1, saleNumber: 1 });
SaleSchema.index({ gymId: 1, memberId: 1 });

export const Sale: Model<ISale> =
  mongoose.models.Sale || mongoose.model<ISale>("Sale", SaleSchema);
