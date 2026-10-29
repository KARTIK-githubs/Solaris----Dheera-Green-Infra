import mongoose, { Schema, Document } from 'mongoose';

export interface ICommunityMember extends Document {
  memberId: string;
  flatNumber: string;
  tower: string;
  ownerName: string;
  caNumber: string;
  sanctionedLoadKw: number;
  monthlyConsumptionKwh: number;
  monthlyBillInr: number;
  maxUpfrontBudgetInr: number;
  allocatedKw: number;
  allocationPercentage: number;
  allocatedKwhPerMonth: number;
  depositPaidInr: number;
  status: 'signed_deposited' | 'kyc_verified' | 'pending_invite' | 'withdrawn';
  consentSigned: boolean;
  tier: 'Tier A' | 'Tier B' | 'Tier C';
  isSynthetic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommunityMemberSchema = new Schema<ICommunityMember>(
  {
    memberId: { type: String, required: true, unique: true, index: true },
    flatNumber: { type: String, required: true },
    tower: { type: String, default: 'Tower C' },
    ownerName: { type: String, required: true },
    caNumber: { type: String, required: true },
    sanctionedLoadKw: { type: Number, required: true, min: 0 },
    monthlyConsumptionKwh: { type: Number, required: true, min: 0 },
    monthlyBillInr: { type: Number, required: true, min: 0 },
    maxUpfrontBudgetInr: { type: Number, required: true, min: 0 },
    allocatedKw: { type: Number, default: 0, min: 0 },
    allocationPercentage: { type: Number, default: 0, min: 0 },
    allocatedKwhPerMonth: { type: Number, default: 0, min: 0 },
    depositPaidInr: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['signed_deposited', 'kyc_verified', 'pending_invite', 'withdrawn'],
      default: 'kyc_verified',
      required: true
    },
    consentSigned: { type: Boolean, default: false },
    tier: {
      type: String,
      enum: ['Tier A', 'Tier B', 'Tier C'],
      default: 'Tier B'
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

export const CommunityMember = mongoose.model<ICommunityMember>('CommunityMember', CommunityMemberSchema);
