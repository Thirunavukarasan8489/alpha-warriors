import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IDietMeal {
  time: string; // e.g. "08:00 AM - Breakfast"
  items: string; // e.g. "4 egg whites, 2 whole eggs, 1 cup oats with milk"
  notes?: string;
  calories?: number;
  protein?: number;
}

export interface IDietPlan extends Document {
  gymId: Types.ObjectId;
  memberId: Types.ObjectId;
  title: string;
  notes?: string;
  meals: IDietMeal[];
  createdBy: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DietMealSchema = new Schema<IDietMeal>(
  {
    time: { type: String, required: true },
    items: { type: String, required: true },
    notes: { type: String },
    calories: { type: Number },
    protein: { type: Number },
  },
  { _id: false }
);

const DietPlanSchema = new Schema<IDietPlan>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    title: { type: String, required: true, default: "Nutrition & Diet Plan" },
    notes: { type: String },
    meals: [DietMealSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DietPlanSchema.index({ gymId: 1, memberId: 1, isActive: 1 });

export const DietPlan: Model<IDietPlan> =
  mongoose.models.DietPlan || mongoose.model<IDietPlan>("DietPlan", DietPlanSchema);
