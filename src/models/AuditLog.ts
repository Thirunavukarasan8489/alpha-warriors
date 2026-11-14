import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAuditLog extends Document {
  gymId: Types.ObjectId;
  userId: Types.ObjectId;
  action: string;
  targetType: string;
  targetId: string;
  resource?: string;
  resourceId?: string;
  reason?: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    targetType: {
      type: String,
      default: function (this: any) {
        return this.resource || "system";
      },
    },
    targetId: {
      type: String,
      default: function (this: any) {
        return this.resourceId || "none";
      },
    },
    resource: { type: String },
    resourceId: { type: String },
    reason: { type: String },
    details: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Normalize targetType/targetId and resource/resourceId so both conventions succeed
AuditLogSchema.pre("validate", function (next) {
  if (!this.targetType && this.resource) {
    this.targetType = this.resource;
  }
  if (!this.targetId && this.resourceId) {
    this.targetId = this.resourceId;
  }
  if (!this.reason && this.details && typeof this.details === "string") {
    this.reason = this.details;
  }
  next();
});

AuditLogSchema.index({ gymId: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
