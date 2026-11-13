import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAttendance extends Document {
  gymId: Types.ObjectId;
  branchId?: Types.ObjectId;
  memberId: Types.ObjectId;
  checkInAt: Date;
  source: "manual" | "qr" | "biometric";
  checkedInBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    checkInAt: { type: Date, default: Date.now },
    source: {
      type: String,
      enum: ["manual", "qr", "biometric"],
      default: "manual",
    },
    checkedInBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Required Day 1 Indexes
AttendanceSchema.index({ gymId: 1, checkInAt: -1 });
AttendanceSchema.index({ memberId: 1, checkInAt: -1 });

export const Attendance: Model<IAttendance> =
  mongoose.models.Attendance || mongoose.model<IAttendance>("Attendance", AttendanceSchema);

