import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IWorkoutExercise {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
}

export interface IWorkoutDay {
  day: string; // e.g. "Monday - Chest & Triceps"
  exercises: IWorkoutExercise[];
}

export interface IWorkoutPlan extends Document {
  gymId: Types.ObjectId;
  memberId: Types.ObjectId;
  title: string;
  notes?: string;
  days: IWorkoutDay[];
  createdBy: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutExerciseSchema = new Schema<IWorkoutExercise>(
  {
    name: { type: String, required: true },
    sets: { type: Number, default: 3 },
    reps: { type: String, default: "10-12" },
    notes: { type: String },
  },
  { _id: false }
);

const WorkoutDaySchema = new Schema<IWorkoutDay>(
  {
    day: { type: String, required: true },
    exercises: [WorkoutExerciseSchema],
  },
  { _id: false }
);

const WorkoutPlanSchema = new Schema<IWorkoutPlan>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    title: { type: String, required: true, default: "Standard Workout Routine" },
    notes: { type: String },
    days: [WorkoutDaySchema],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

WorkoutPlanSchema.index({ gymId: 1, memberId: 1, isActive: 1 });

export const WorkoutPlan: Model<IWorkoutPlan> =
  mongoose.models.WorkoutPlan || mongoose.model<IWorkoutPlan>("WorkoutPlan", WorkoutPlanSchema);
