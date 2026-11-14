import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPARQAnswer {
  questionIndex: number;
  questionText: string;
  answer: boolean; // true = Yes, false = No
  notes?: string;
}

export interface IPARQForm extends Document {
  gymId: Types.ObjectId;
  memberId: Types.ObjectId;
  token: string;
  tokenExpiresAt?: Date;
  completedAt?: Date;
  signatureName?: string;
  signedDate?: Date;
  answers: IPARQAnswer[];
  hasRisk: boolean;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PARQAnswerSchema = new Schema<IPARQAnswer>(
  {
    questionIndex: { type: Number, required: true },
    questionText: { type: String, required: true },
    answer: { type: Boolean, required: true },
    notes: { type: String },
  },
  { _id: false }
);

const PARQFormSchema = new Schema<IPARQForm>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    tokenExpiresAt: { type: Date },
    completedAt: { type: Date },
    signatureName: { type: String, trim: true },
    signedDate: { type: Date },
    answers: [PARQAnswerSchema],
    hasRisk: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PARQFormSchema.index({ gymId: 1, memberId: 1, createdAt: -1 });

export const PARQForm: Model<IPARQForm> =
  mongoose.models.PARQForm || mongoose.model<IPARQForm>("PARQForm", PARQFormSchema);
