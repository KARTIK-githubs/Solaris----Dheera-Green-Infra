import mongoose, { Schema, Document } from 'mongoose';

export interface IAssessment extends Document {
  monthlyBillInr: number;
  monthlyConsumptionKwh: number;
  terraceAreaSqFt: number;
  sanctionedLoadKw: number;
  isResidential: boolean;
  costPerKwInr: number;
  
  // Provisional Engineering Assumptions
  provisionalAssumptions: {
    nominalAnnualYieldKwhPerKwp: number;
    deratingFactor: number;
    effectiveAnnualYieldKwhPerKwp: number;
    effectiveMonthlyYieldKwhPerKwp: number;
    spaceRatioSqFtPerKwp: number;
    maxSanctionedLoadCapPercentage: number;
    regulatoryDisclaimer: string;
  };

  // Calculated Outputs
  recommendedCapacityKw: number;
  estAnnualGenerationKwh: number;
  estMonthlyGenerationKwh: number;
  grossInstallationCostInr: number;
  subsidyInr: number;
  netInstallationCostInr: number;
  monthlySavingsInr: number;
  paybackYears: number;
  annualRoiPercentage: number;
  roofAreaRequiredSqFt: number;
  roofSpaceUtilisationPercentage: number;
  co2OffsetTonsPerYear: number;
  gridOffsetPercentage: number;
  exportSurplusInr: number;
  limitingFactor: 'roof' | 'sanctioned_load' | 'energy_demand';
  feasibilityNotes: string[];
  isViable: boolean;

  // Server-controlled metadata
  isSynthetic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentSchema = new Schema<IAssessment>(
  {
    monthlyBillInr: { type: Number, required: true, min: 0 },
    monthlyConsumptionKwh: { type: Number, required: true, min: 0 },
    terraceAreaSqFt: { type: Number, required: true, min: 0 },
    sanctionedLoadKw: { type: Number, required: true, min: 0 },
    isResidential: { type: Boolean, default: true },
    costPerKwInr: { type: Number, default: 50000, min: 1000 },

    provisionalAssumptions: {
      nominalAnnualYieldKwhPerKwp: { type: Number, default: 1420 },
      deratingFactor: { type: Number, default: 0.94 },
      effectiveAnnualYieldKwhPerKwp: { type: Number, default: 1334.8 },
      effectiveMonthlyYieldKwhPerKwp: { type: Number, default: 111.233 },
      spaceRatioSqFtPerKwp: { type: Number, default: 95 },
      maxSanctionedLoadCapPercentage: { type: Number, default: 100 },
      regulatoryDisclaimer: {
        type: String,
        default: 'Provisional engineering simulation estimate under Delhi insolation. Subject to on-site shading analysis, RCC structural survey, and DISCOM transformer headroom approval.'
      }
    },

    recommendedCapacityKw: { type: Number, required: true, min: 0 },
    estAnnualGenerationKwh: { type: Number, required: true, min: 0 },
    estMonthlyGenerationKwh: { type: Number, required: true, min: 0 },
    grossInstallationCostInr: { type: Number, required: true, min: 0 },
    subsidyInr: { type: Number, required: true, min: 0 },
    netInstallationCostInr: { type: Number, required: true, min: 0 },
    monthlySavingsInr: { type: Number, required: true, min: 0 },
    paybackYears: { type: Number, required: true, min: 0 },
    annualRoiPercentage: { type: Number, required: true },
    roofAreaRequiredSqFt: { type: Number, required: true, min: 0 },
    roofSpaceUtilisationPercentage: { type: Number, required: true, min: 0 },
    co2OffsetTonsPerYear: { type: Number, required: true, min: 0 },
    gridOffsetPercentage: { type: Number, required: true, min: 0 },
    exportSurplusInr: { type: Number, required: true, min: 0 },
    limitingFactor: {
      type: String,
      enum: ['roof', 'sanctioned_load', 'energy_demand'],
      required: true
    },
    feasibilityNotes: [{ type: String }],
    isViable: { type: Boolean, required: true },

    // Enforce server-controlled synthetic flag (immutable)
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

export const Assessment = mongoose.model<IAssessment>('Assessment', AssessmentSchema);
