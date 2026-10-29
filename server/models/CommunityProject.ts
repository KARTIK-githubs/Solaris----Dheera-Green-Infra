import mongoose, { Schema, Document } from 'mongoose';

export interface ICommunityProject extends Document {
  projectId: string;
  name: string;
  location: string;
  coordinatorName: string;
  coordinatorRole: string;
  status: 'planning' | 'member_consent' | 'discom_submitted' | 'discom_approved' | 'commissioned';
  currentStep: number;
  totalSteps: number;
  proposedCapacityKw: number;
  totalRoofAreaSqFt: number;
  shadowFreePercentage: number;
  grossOutlayInr: number;
  subsidyEligibleInr: number;
  netTargetInr: number;
  totalCommittedInr: number;
  committedMembersCount: number;
  totalEligibleFlats: number;
  isSynthetic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommunityProjectSchema = new Schema<ICommunityProject>(
  {
    projectId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    coordinatorName: { type: String, required: true },
    coordinatorRole: { type: String, default: 'Project Coordinator' },
    status: {
      type: String,
      enum: ['planning', 'member_consent', 'discom_submitted', 'discom_approved', 'commissioned'],
      default: 'member_consent'
    },
    currentStep: { type: Number, default: 2 },
    totalSteps: { type: Number, default: 5 },
    proposedCapacityKw: { type: Number, default: 12 },
    totalRoofAreaSqFt: { type: Number, default: 1400 },
    shadowFreePercentage: { type: Number, default: 94 },
    grossOutlayInr: { type: Number, default: 580000 },
    subsidyEligibleInr: { type: Number, default: 78000 },
    netTargetInr: { type: Number, default: 502000 },
    totalCommittedInr: { type: Number, default: 412000 },
    committedMembersCount: { type: Number, default: 14 },
    totalEligibleFlats: { type: Number, default: 20 },
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

export const CommunityProject = mongoose.model<ICommunityProject>('CommunityProject', CommunityProjectSchema);
