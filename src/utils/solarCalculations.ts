import { SolarCalculationResult } from '../types';

/**
 * Delhi DERC Tariff Order FY 2024-25 calculation helper.
 * Approximates monthly units (kWh) from electricity bill amount (INR) for LT-1 Domestic.
 */
export function estimateMonthlyKwhFromBill(billAmountInr: number): number {
  if (billAmountInr <= 0) return 0;
  // Effective blended rate for Delhi LT-1 domestic including fixed charges & surcharges (PPAC + Duty)
  // ~₹8.50 to ₹9.50 per unit effective for higher consumption, lower for minimal
  if (billAmountInr <= 1200) {
    return Math.round(billAmountInr / 5.5);
  } else if (billAmountInr <= 3500) {
    return Math.round(billAmountInr / 7.2);
  } else if (billAmountInr <= 8000) {
    return Math.round(billAmountInr / 8.8);
  } else {
    return Math.round(billAmountInr / 9.6);
  }
}

/**
 * Calculates national PM Surya Ghar: Muft Bijli Yojana subsidy.
 * Under official guidelines:
 * - 1 kW: ₹30,000
 * - 2 kW: ₹60,000
 * - 3 kW or higher: ₹78,000 (capped at ₹78,000)
 * Note: Subsidies only apply to residential category.
 */
export function calculatePmSuryaGharSubsidy(capacityKw: number, isResidential: boolean = true): number {
  if (!isResidential || capacityKw <= 0) return 0;
  if (capacityKw < 1.0) {
    return Math.round(capacityKw * 30000);
  } else if (capacityKw <= 2.0) {
    return Math.round(capacityKw * 30000);
  } else {
    return 78000;
  }
}

export interface SolarCalculatorInputs {
  monthlyBillInr: number;
  monthlyConsumptionKwh?: number;
  terraceAreaSqFt: number;
  sanctionedLoadKw: number;
  isResidential?: boolean;
  costPerKwInr?: number; // default ~₹50,000
  shadingLossPercentage?: number; // default 6% (94% shadow-free, derating factor 0.94)
  annualYieldKwhPerKwp?: number; // Nominal Delhi insolation baseline: 1,420 kWh/kWp/yr
}

/**
 * Canonical Solar Generation Metrics for Solaris & Dheera Green Infra.
 * Based on Delhi insolation factors under DERC VNM / Rooftop guidelines.
 * All figures are analytical simulation estimates requiring site survey verification.
 */
export const SOLAR_METRICS = {
  NOMINAL_ANNUAL_YIELD_KWH_PER_KWP: 1420,    // Nominal specific yield (kWh/kWp/year)
  DEFAULT_DERATING_FACTOR: 0.94,              // 0.94 derating (6% BoS, cabling, thermal & horizon shading)
  EFFECTIVE_ANNUAL_YIELD_KWH_PER_KWP: 1334.8, // 1,420 * 0.94 = 1,334.8 kWh/kWp/year
  EFFECTIVE_MONTHLY_YIELD_KWH_PER_KWP: 111.233 // 1,334.8 / 12 = ~111.233 kWh/kWp/month
};

/**
 * Standard engineering assumptions disclosed for Dheera Green Infra assessments.
 * All figures represent simulation baselines requiring on-site verification.
 */
export const ENGINEERING_ASSUMPTIONS = {
  jurisdiction: 'Delhi (DERC Jurisdiction — BRPL / BYPL / TPDDL)',
  nominalAnnualSpecificYieldKwhPerKwp: SOLAR_METRICS.NOMINAL_ANNUAL_YIELD_KWH_PER_KWP,
  deratingFactor: SOLAR_METRICS.DEFAULT_DERATING_FACTOR,
  effectiveAnnualYieldKwhPerKwp: SOLAR_METRICS.EFFECTIVE_ANNUAL_YIELD_KWH_PER_KWP,
  effectiveMonthlyYieldKwhPerKwp: SOLAR_METRICS.EFFECTIVE_MONTHLY_YIELD_KWH_PER_KWP,
  annualSpecificYieldKwhPerKwp: SOLAR_METRICS.NOMINAL_ANNUAL_YIELD_KWH_PER_KWP, // backwards-compatible alias
  terraceAreaPerKwpSqFt: 95,          // Standard RCC flat roof clearance with inter-row spacing
  minimumFeasibleRooftopAreaSqFt: 90, // Minimum area for a viable 1 kWp array
  maxSanctionedLoadCapPercentage: 100,// DERC Net Metering cap (100% of sanctioned load)
  defaultShadingLossPercentage: 6,    // 94% shadow-free baseline (derating factor 0.94)
  blendedResidentialTariffInr: 8.20,  // Average Delhi LT-1 slab recovery credit
  commercialTariffInr: 10.50,         // Non-domestic LT rate
  omCostAnnualRatePercentage: 1.2,    // Preventive cleaning, insurance, monitoring
  annualDegradationPercentage: 0.7,   // Tier-1 Mono PERC module degradation
  gridCo2EmissionFactorKgPerKwh: 0.82 // Central Electricity Authority (CEA) standard factor
};

/**
 * Comprehensive deterministic solar feasibility assessment
 */
export function calculateSolarFeasibility(inputs: SolarCalculatorInputs): SolarCalculationResult {
  const {
    monthlyBillInr,
    terraceAreaSqFt,
    sanctionedLoadKw,
    isResidential = true,
    costPerKwInr = 50000,
    shadingLossPercentage = 6,
    annualYieldKwhPerKwp = SOLAR_METRICS.NOMINAL_ANNUAL_YIELD_KWH_PER_KWP
  } = inputs;

  const monthlyConsumptionKwh = inputs.monthlyConsumptionKwh && inputs.monthlyConsumptionKwh > 0
    ? inputs.monthlyConsumptionKwh
    : estimateMonthlyKwhFromBill(monthlyBillInr);

  // Physical roof limit: 1 kWp needs ~90-100 sq.ft of RCC flat terrace
  const safeTerraceArea = Math.max(0, terraceAreaSqFt);
  const isRoofConstrained = safeTerraceArea < ENGINEERING_ASSUMPTIONS.minimumFeasibleRooftopAreaSqFt;
  const roofConstrainedKw = isRoofConstrained
    ? 0
    : Math.max(0.5, Math.floor((safeTerraceArea / ENGINEERING_ASSUMPTIONS.terraceAreaPerKwpSqFt) * 10) / 10);

  // Electrical load limit: DERC allows max 100% of sanctioned load for residential net metering
  const safeSanctionedLoad = Math.max(0, sanctionedLoadKw);
  const loadConstrainedKw = safeSanctionedLoad > 0 ? safeSanctionedLoad : 5.0;

  // Effective yield rate: Nominal yield * (1 - shadingLossPercentage / 100) -> 1,420 * 0.94 = 1,334.8 kWh/kWp/yr
  // Applied exactly once across both system sizing and generation estimation
  const effectiveYieldRate = annualYieldKwhPerKwp * (1 - shadingLossPercentage / 100);

  // Energy offset target: capacity needed to produce ~90-100% of annual consumption
  const annualTargetKwh = monthlyConsumptionKwh * 12;
  const energyTargetKw = monthlyConsumptionKwh > 0
    ? Math.max(0.5, Math.round((annualTargetKwh / effectiveYieldRate) * 10) / 10)
    : 0;

  // Feasibility notes and limiting factor determination
  const feasibilityNotes: string[] = [];
  let limitingFactor: 'roof' | 'sanctioned_load' | 'energy_demand' = 'energy_demand';
  let recommendedCapacityKw = 0;
  let isViable = true;

  if (safeTerraceArea < ENGINEERING_ASSUMPTIONS.minimumFeasibleRooftopAreaSqFt) {
    recommendedCapacityKw = 0;
    limitingFactor = 'roof';
    isViable = false;
    feasibilityNotes.push(`Terrace area (${safeTerraceArea} sq.ft) is below the 90 sq.ft minimum for an individual 1 kWp system. Consider Community Solar (Virtual Net Metering).`);
  } else if (monthlyConsumptionKwh <= 0) {
    recommendedCapacityKw = 0;
    isViable = false;
    feasibilityNotes.push('Monthly electricity consumption is zero. No solar capacity required.');
  } else {
    // Recommended capacity is the safe minimum of all three constraints
    recommendedCapacityKw = Math.min(roofConstrainedKw, loadConstrainedKw, energyTargetKw);

    if (recommendedCapacityKw === roofConstrainedKw && roofConstrainedKw < energyTargetKw) {
      limitingFactor = 'roof';
      feasibilityNotes.push(`Capped by available rooftop area (${safeTerraceArea} sq.ft permits ~${roofConstrainedKw} kWp).`);
    } else if (recommendedCapacityKw === loadConstrainedKw && loadConstrainedKw < energyTargetKw) {
      limitingFactor = 'sanctioned_load';
      feasibilityNotes.push(`Capped by sanctioned load (${safeSanctionedLoad} kW). An expansion request to the DISCOM may unlock higher capacity.`);
    } else {
      limitingFactor = 'energy_demand';
      feasibilityNotes.push(`Sized to offset ~100% of annual consumption (${annualTargetKwh.toLocaleString('en-IN')} kWh/yr).`);
    }
  }

  // Generation modeling (derating applied once via effectiveYieldRate)
  const estAnnualGenerationKwh = Math.round(recommendedCapacityKw * effectiveYieldRate);
  const estMonthlyGenerationKwh = Math.round(estAnnualGenerationKwh / 12);

  // Financial modeling
  const grossInstallationCostInr = Math.round(recommendedCapacityKw * costPerKwInr);
  const subsidyInr = calculatePmSuryaGharSubsidy(recommendedCapacityKw, isResidential);
  const netInstallationCostInr = Math.max(0, grossInstallationCostInr - subsidyInr);

  // Savings modeling (Delhi average LT-1 tariff slab credit is ~₹8.20/kWh)
  const tariffPerKwh = isResidential ? ENGINEERING_ASSUMPTIONS.blendedResidentialTariffInr : ENGINEERING_ASSUMPTIONS.commercialTariffInr;
  const monthlySavingsInr = monthlyBillInr > 0
    ? Math.min(monthlyBillInr, Math.round(estMonthlyGenerationKwh * tariffPerKwh))
    : 0;

  // Annual O&M cost assumption: 1.2% of gross capex
  const annualOmCostInr = Math.round(grossInstallationCostInr * (ENGINEERING_ASSUMPTIONS.omCostAnnualRatePercentage / 100));
  const annualNetSavingsInr = (monthlySavingsInr * 12) - annualOmCostInr;

  const paybackYears = (netInstallationCostInr > 0 && annualNetSavingsInr > 0)
    ? Math.max(1.5, Math.round((netInstallationCostInr / annualNetSavingsInr) * 10) / 10)
    : (netInstallationCostInr === 0 ? 0 : 10);

  const annualRoiPercentage = netInstallationCostInr > 0
    ? Math.round((annualNetSavingsInr / netInstallationCostInr) * 1000) / 10
    : 0;

  // Roof space utilization
  const roofAreaRequiredSqFt = Math.round(recommendedCapacityKw * ENGINEERING_ASSUMPTIONS.terraceAreaPerKwpSqFt);
  const roofSpaceUtilisationPercentage = safeTerraceArea > 0
    ? Math.min(100, Math.round((roofAreaRequiredSqFt / safeTerraceArea) * 100))
    : 0;

  // Ecological impact (CEA standard grid emission factor for India is ~0.82 kg CO2 / kWh)
  const co2OffsetTonsPerYear = Math.round((estAnnualGenerationKwh * ENGINEERING_ASSUMPTIONS.gridCo2EmissionFactorKgPerKwh) / 1000 * 10) / 10;

  const gridOffsetPercentage = monthlyConsumptionKwh > 0
    ? Math.min(100, Math.round((estMonthlyGenerationKwh / monthlyConsumptionKwh) * 100))
    : 0;

  const exportSurplusInr = Math.max(0, Math.round((estMonthlyGenerationKwh - monthlyConsumptionKwh) * 3.50));

  return {
    monthlyConsumptionKwh,
    recommendedCapacityKw,
    estAnnualGenerationKwh,
    estMonthlyGenerationKwh,
    grossInstallationCostInr,
    subsidyInr,
    netInstallationCostInr,
    monthlySavingsInr,
    paybackYears,
    annualRoiPercentage,
    roofAreaRequiredSqFt,
    roofSpaceUtilisationPercentage,
    co2OffsetTonsPerYear,
    gridOffsetPercentage,
    exportSurplusInr,
    limitingFactor,
    feasibilityNotes,
    isViable
  };
}
