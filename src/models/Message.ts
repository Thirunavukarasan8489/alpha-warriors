import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IMessage extends Document {
  gymId: Types.ObjectId;
  memberId: Types.ObjectId;
  type: "welcome" | "receipt" | "reminder_expiry" | "reminder_dues" | "reminder_absent" | "custom";
  channel: string;
  sharedAt: Date;
  sharedBy: Types.ObjectId;
}

const MessageSchema = new Schema<IMessage>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    type: {
      type: String,
      enum: ["welcome", "receipt", "reminder_expiry", "reminder_dues", "reminder_absent", "custom"],
      required: true,
    },
    channel: { type: String, default: "whatsapp" },
    sharedAt: { type: Date, default: Date.now },
    sharedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: false }
);

MessageSchema.index({ gymId: 1, sharedAt: -1 });

export const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);

