import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  timestamp: Date;
  action: string;
  category: 'statutory' | 'allocation' | 'lifecycle' | 'security' | 'system';
  details: string;
  actor: string;
  isSynthetic: boolean;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    timestamp: { type: Date, default: Date.now, required: true },
    action: { type: String, required: true },
    category: {
      type: String,
      enum: ['statutory', 'allocation', 'lifecycle', 'security', 'system'],
      required: true
    },
    details: { type: String, required: true },
    actor: { type: String, default: 'System Operator (Internal)' },
    isSynthetic: {
      type: Boolean,
      default: true,
      immutable: true,
      required: true
    }
  },
  {
    // Append-only collection: no updates permitted via model methods
    timestamps: false,
    versionKey: false
  }
);

// Prevent updating existing audit logs to enforce append-only semantics
AuditLogSchema.pre('updateOne', function () {
  throw new Error('AuditLog records are append-only and cannot be updated.');
});
AuditLogSchema.pre('updateMany', function () {
  throw new Error('AuditLog records are append-only and cannot be updated.');
});
AuditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('AuditLog records are append-only and cannot be updated.');
});

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
