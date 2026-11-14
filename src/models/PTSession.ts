import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPTSession extends Document {
  gymId: Types.ObjectId;
  memberId: Types.ObjectId;
  trainerId: Types.ObjectId;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PTSessionSchema = new Schema<IPTSession>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    trainerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true }
);

PTSessionSchema.index({ gymId: 1, memberId: 1, date: -1 });
PTSessionSchema.index({ gymId: 1, trainerId: 1, date: -1 });

export const PTSession: Model<IPTSession> =
  mongoose.models.PTSession || mongoose.model<IPTSession>("PTSession", PTSessionSchema);
