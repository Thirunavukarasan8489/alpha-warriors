import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IProduct extends Document {
  gymId: Types.ObjectId;
  name: string;
  category?: string;
  price: number; // in paise
  cost: number; // in paise (hidden from receptionist)
  stock: number;
  lowStockLevel: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "Supplements", trim: true },
    price: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0, default: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    lowStockLevel: { type: Number, default: 5, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSchema.index({ gymId: 1, name: 1 });
ProductSchema.index({ gymId: 1, isActive: 1 });

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
