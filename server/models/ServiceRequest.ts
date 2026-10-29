import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceRequest extends Document {
  ticketId: string;
  customerName: string;
  consumerNumber: string;
  propertyAddress: string;
  category: 'inverter' | 'inverter_inspection' | 'panel_cleaning' | 'wiring_grid' | 'metering' | 'meter_billing' | 'structural_check' | 'general' | 'general_support';
  description: string;
  urgency: 'low' | 'routine' | 'medium' | 'high' | 'urgent' | 'critical';
  preferredDate?: string;
  status: 'submitted' | 'open' | 'under_review' | 'technician_assigned' | 'in_progress' | 'resolved' | 'closed';
  assignedEngineer?: string;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  isSynthetic: boolean;
}

const ServiceRequestSchema: Schema = new Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    consumerNumber: {
      type: String,
      required: true,
      trim: true
    },
    propertyAddress: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['inverter', 'inverter_inspection', 'panel_cleaning', 'wiring_grid', 'metering', 'meter_billing', 'structural_check', 'general', 'general_support'],
      default: 'panel_cleaning'
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    urgency: {
      type: String,
      enum: ['low', 'routine', 'medium', 'high', 'urgent', 'critical'],
      default: 'routine'
    },
    preferredDate: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['submitted', 'open', 'under_review', 'technician_assigned', 'in_progress', 'resolved', 'closed'],
      default: 'open'
    },
    assignedEngineer: {
      type: String,
      trim: true
    },
    resolutionNotes: {
      type: String,
      trim: true
    },
    isSynthetic: {
      type: Boolean,
      default: true,
      immutable: true,
      required: true
    }
  },
  {
    timestamps: true
  }
);

export const ServiceRequest = mongoose.model<IServiceRequest>('ServiceRequest', ServiceRequestSchema);
