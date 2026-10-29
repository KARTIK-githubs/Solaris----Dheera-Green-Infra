import mongoose, { Schema, Document } from 'mongoose';

export interface IOptimisationRun extends Document {
  targetCapacityKw: number;
  budgetCeilingInr: number;
  financingRatePercentage: number;
  participantCapInr: number;
  stressFactors: {
    monsoonDrop: boolean;
    rateSpike: boolean;
    unitDropOut: boolean;
    subsidyDelay: boolean;
  };
  
  // Cost breakdown & documented assumptions
  costBreakdown: {
    grossCostInr: number;
    illustrativeSubsidyInr: number;
    subsidyAssumptionNote: string;
    requiredNetFundingInr: number;
  };

  // Solver outcomes
  isFeasible: boolean;
  solverStatus: 'optimal' | 'suboptimal' | 'infeasible';
  solverVersion: string;
  shortfallInr: number;
  infeasibilityReason?: string;
  includedCount: number;
  totalCount: number;
  avgNetMonthlySavingsInr: number;
  avgGridOffsetInr: number;
  avgEmiInr: number;
  reconciledSumPercentage: number;

  selectedMembers: Array<{
    memberId: string;
    flatNumber: string;
    sharePercentage: number;
    shareKw: number;
    monthlySavingsInr: number;
    monthlyContributionInr: number;
    netBenefitInr: number;
  }>;

  worstCaseMonthlySavingsInr: number;
  resilienceRating: 'Robust Surplus Buffer' | 'Moderate Reserve Margin' | 'High Risk';

  // Server-controlled metadata
  isSynthetic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OptimisationRunSchema = new Schema<IOptimisationRun>(
  {
    targetCapacityKw: { type: Number, required: true },
    budgetCeilingInr: { type: Number, required: true, min: 0 },
    financingRatePercentage: { type: Number, required: true, min: 0 },
    participantCapInr: { type: Number, required: true, min: 0 },
    stressFactors: {
      monsoonDrop: { type: Boolean, default: false },
      rateSpike: { type: Boolean, default: false },
      unitDropOut: { type: Boolean, default: false },
      subsidyDelay: { type: Boolean, default: false }
    },

    costBreakdown: {
      grossCostInr: { type: Number, required: true },
      illustrativeSubsidyInr: { type: Number, required: true },
      subsidyAssumptionNote: {
        type: String,
        default: 'Illustrative CFA assumption based on PM Surya Ghar GHS/RWA model (subject to DISCOM/MNRE formal release).'
      },
      requiredNetFundingInr: { type: Number, required: true }
    },

    isFeasible: { type: Boolean, required: true },
    solverStatus: {
      type: String,
      enum: ['optimal', 'suboptimal', 'infeasible'],
      required: true
    },
    solverVersion: { type: String, default: 'v2.4 Linear Program (Exact Combinatorial)' },
    shortfallInr: { type: Number, default: 0, min: 0 },
    infeasibilityReason: { type: String },
    includedCount: { type: Number, required: true },
    totalCount: { type: Number, required: true },
    avgNetMonthlySavingsInr: { type: Number, required: true },
    avgGridOffsetInr: { type: Number, required: true },
    avgEmiInr: { type: Number, required: true },
    reconciledSumPercentage: { type: Number, required: true },

    selectedMembers: [
      {
        memberId: { type: String, required: true },
        flatNumber: { type: String, required: true },
        sharePercentage: { type: Number, required: true },
        shareKw: { type: Number, required: true },
        monthlySavingsInr: { type: Number, required: true },
        monthlyContributionInr: { type: Number, required: true },
        netBenefitInr: { type: Number, required: true }
      }
    ],

    worstCaseMonthlySavingsInr: { type: Number, required: true },
    resilienceRating: {
      type: String,
      enum: ['Robust Surplus Buffer', 'Moderate Reserve Margin', 'High Risk'],
      required: true
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

export const OptimisationRun = mongoose.model<IOptimisationRun>('OptimisationRun', OptimisationRunSchema);
