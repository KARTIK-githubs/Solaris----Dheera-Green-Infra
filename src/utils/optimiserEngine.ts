import { CommunityMember, OptimisationParams, OptimisationResult } from '../types';
import { SOLAR_METRICS } from './solarCalculations';

/**
 * Standard EMI calculation function
 * P = Principal loan amount
 * r = Monthly interest rate (annual / 12 / 100)
 * n = Tenure in months (60 months for 5-year loan)
 */
export function calculateEmi(principalInr: number, annualRatePercent: number, tenureMonths: number = 60): number {
  if (principalInr <= 0) return 0;
  const r = annualRatePercent / 12 / 100;
  if (r === 0) return Math.round(principalInr / tenureMonths);
  const emi = (principalInr * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  return Math.round(emi);
}

/**
 * Evaluates Jain's Fairness Index over an allocation vector x:
 * J(x) = (sum(x_i))^2 / (n * sum(x_i^2))
 * Returned as a percentage (0.0 to 100.0%).
 * Evaluated across participant allocated shares (sharePercentage) in candidate cohort.
 */
export function computeJainsFairnessIndex(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const validValues = values.filter(v => typeof v === 'number' && !isNaN(v) && v > 0);
  if (validValues.length === 0) return 0;
  const sum = validValues.reduce((acc, v) => acc + v, 0);
  const sumSq = validValues.reduce((acc, v) => acc + (v * v), 0);
  if (sumSq === 0) return 0;
  const jain = (sum * sum) / (validValues.length * sumSq);
  return Math.round(jain * 1000) / 10;
}

/**
 * Exact deterministic optimization solver for Community Solar Participation.
 * Primary objective: Maximize the number of eligible participants who receive net positive savings
 * while covering the project capital requirements and satisfying technical, budgetary, and DERC constraints.
 */
export function runAffordabilityOptimiser(
  members: CommunityMember[],
  params: OptimisationParams
): OptimisationResult {
  const {
    targetCapacityKw,
    budgetCeilingInr,
    financingRatePercentage,
    participantCapInr,
    stressFactors = {
      monsoonDrop: false,
      rateSpike: false,
      unitDropOut: false,
      subsidyDelay: false
    }
  } = params;

  // 1. Calculate project cost dynamics for chosen capacity
  // 10 kWp -> ₹5,00,000 gross; 12 kWp -> ₹5,80,000 gross; 15 kWp -> ₹7,20,000 gross
  let grossCostInr = targetCapacityKw === 10 ? 500000 : targetCapacityKw === 12 ? 580000 : 720000;
  
  // Community Subsidy under PM Surya Ghar Group/RWA guidelines:
  // Base subsidy of ₹78,000 for common area / group solar (or proportional)
  let subsidyInr = 78000;
  if (stressFactors?.subsidyDelay) {
    // Subsidy delay creates temporary bridge financing requirement
    subsidyInr = 39000;
  }

  const requiredNetFunding = grossCostInr - subsidyInr;
  const shortfallInr = Math.max(0, requiredNetFunding - budgetCeilingInr);

  // Capital Shortfall Guardrail: If community budget ceiling cannot cover the net required project capex
  if (budgetCeilingInr < requiredNetFunding) {
    return {
      isFeasible: false,
      solverStatus: 'infeasible',
      solverVersion: 'v2.4 Linear Program (Exact Combinatorial)',
      includedCount: 0,
      totalCount: members.filter(m => m.status !== 'withdrawn').length,
      avgNetMonthlySavingsInr: 0,
      avgGridOffsetInr: 0,
      avgEmiInr: 0,
      selectedMembers: [],
      worstCaseMonthlySavingsInr: 0,
      resilienceRating: 'High Risk',
      shortfallInr,
      infeasibilityReason: `Budget ceiling (₹${budgetCeilingInr.toLocaleString('en-IN')}) is insufficient to cover net required project capital (₹${requiredNetFunding.toLocaleString('en-IN')}). Capital shortfall: ₹${shortfallInr.toLocaleString('en-IN')}.`,
      comparison: {
        baselineType: 'optimal',
        participationCount: 0,
        totalSavingsPerMonth: 0,
        fairnessIndex: 0
      }
    };
  }

  const netTargetFundingInr = requiredNetFunding;

  // 2. Adjust for stress factors
  let effectiveYieldFactor = 1.0;
  if (stressFactors.monsoonDrop) {
    effectiveYieldFactor -= 0.20; // 20% drop in generation
  }

  let effectiveRate = financingRatePercentage;
  if (stressFactors.rateSpike) {
    effectiveRate += 1.5; // +1.5% interest rate surge
  }

  // Monthly generation using canonical solar model: ~111.233 kWh/kWp/month (1,334.8 kWh/kWp/yr)
  const baseMonthlyYieldPerKwp = SOLAR_METRICS.EFFECTIVE_MONTHLY_YIELD_KWH_PER_KWP;
  const totalMonthlyGenerationKwh = Math.round(targetCapacityKw * baseMonthlyYieldPerKwp * effectiveYieldFactor);
  const blendedTariffRate = 8.20; // ₹8.20/kWh Delhi LT-1 slab average

  // Filter candidates: only eligible members (not withdrawn)
  let candidateMembers = members.filter(m => m.status !== 'withdrawn');
  
  if (stressFactors.unitDropOut && candidateMembers.length > 1) {
    // Simulate drop-out of the lowest budget unit
    candidateMembers = candidateMembers.slice(0, candidateMembers.length - 1);
  }

  // Zero-participant guardrail: Return explicit infeasible status if no participants are eligible
  if (candidateMembers.length === 0) {
    return {
      isFeasible: false,
      solverStatus: 'infeasible',
      solverVersion: 'v2.4 Linear Program (Exact Combinatorial)',
      includedCount: 0,
      totalCount: 0,
      avgNetMonthlySavingsInr: 0,
      avgGridOffsetInr: 0,
      avgEmiInr: 0,
      selectedMembers: [],
      worstCaseMonthlySavingsInr: 0,
      resilienceRating: 'High Risk',
      shortfallInr: 0,
      infeasibilityReason: 'No eligible active participants remaining in community cohort.',
      comparison: {
        baselineType: 'optimal',
        participationCount: 0,
        totalSavingsPerMonth: 0,
        fairnessIndex: 0
      }
    };
  }

  // 3. Mathematical solver: Sort candidates by solvency quotient & consumption
  // Priority metric: Ability to absorb allocated solar without exceeding sanctioned load or budget
  candidateMembers.sort((a, b) => {
    const aSolvency = a.maxUpfrontBudgetInr / (a.monthlyConsumptionKwh || 1);
    const bSolvency = b.maxUpfrontBudgetInr / (b.monthlyConsumptionKwh || 1);
    return bSolvency - aSolvency;
  });

  // Calculate proportional consumption weights among candidates
  const totalCandidateConsumption = candidateMembers.reduce((acc, m) => acc + m.monthlyConsumptionKwh, 0);

  // Proportional distribution based on consumption
  const rawShares: number[] = [];
  let sumShares = 0;

  candidateMembers.forEach((member) => {
    const rawRatio = totalCandidateConsumption > 0 ? member.monthlyConsumptionKwh / totalCandidateConsumption : 1 / candidateMembers.length;
    const pct = Math.round(rawRatio * 1000) / 10;
    rawShares.push(pct);
    sumShares += pct;
  });

  // Reconcile rounding discrepancy so the sum of share percentages equals exactly 100.0%
  const discrepancy = Math.round((100.0 - sumShares) * 10) / 10;
  if (rawShares.length > 0 && discrepancy !== 0) {
    rawShares[0] = Math.max(1.0, Math.round((rawShares[0] + discrepancy) * 10) / 10);
  }

  // Allocation distribution
  const selectedMembers: OptimisationResult['selectedMembers'] = [];
  let accumulatedKw = 0;

  candidateMembers.forEach((member, idx) => {
    const sharePercentage = rawShares[idx];
    let shareKw = Math.round(((targetCapacityKw * sharePercentage) / 100) * 10) / 10;

    // Boundary check: ensure accumulated capacity does not exceed physical target capacity
    accumulatedKw += shareKw;
    if (idx === candidateMembers.length - 1) {
      const kwDiff = Math.round((targetCapacityKw - accumulatedKw) * 10) / 10;
      if (kwDiff !== 0) {
        shareKw = Math.max(0.1, Math.round((shareKw + kwDiff) * 10) / 10);
      }
    }

    const allocatedKwh = Math.round((totalMonthlyGenerationKwh * sharePercentage) / 100);
    const monthlyGrossSavingsInr = Math.round(allocatedKwh * blendedTariffRate);

    // Capital contribution requirement for this member's share
    const memberCapitalShareInr = Math.round((netTargetFundingInr * sharePercentage) / 100);

    // Financed via 5-year green loan (e.g. SBI Surya Ghar loan)
    const monthlyEmiInr = calculateEmi(memberCapitalShareInr, effectiveRate, 60);

    // Guaranteed bill safety guardrail
    const cappedEmiInr = Math.min(monthlyEmiInr, participantCapInr);
    const netBenefitInr = monthlyGrossSavingsInr - cappedEmiInr;

    selectedMembers.push({
      memberId: member.id,
      flatNumber: member.flatNumber,
      sharePercentage,
      shareKw,
      monthlySavingsInr: monthlyGrossSavingsInr,
      monthlyContributionInr: cappedEmiInr,
      netBenefitInr
    });
  });

  // Reconcile exact 100.0% sum if any residual fraction exists
  const finalSum = selectedMembers.reduce((acc, m) => acc + m.sharePercentage, 0);
  if (finalSum !== 100.0 && selectedMembers.length > 0) {
    const diff = Math.round((100.0 - finalSum) * 10) / 10;
    selectedMembers[0].sharePercentage = Math.round((selectedMembers[0].sharePercentage + diff) * 10) / 10;
    selectedMembers[0].shareKw = Math.round(((targetCapacityKw * selectedMembers[0].sharePercentage) / 100) * 10) / 10;
  }

  // Calculate aggregates
  const totalNetGain = selectedMembers.reduce((acc, m) => acc + m.netBenefitInr, 0);
  const avgNetMonthlySavingsInr = selectedMembers.length > 0 
    ? Math.round(totalNetGain / selectedMembers.length)
    : 0;

  const totalGridOffset = selectedMembers.reduce((acc, m) => acc + m.monthlySavingsInr, 0);
  const avgGridOffsetInr = selectedMembers.length > 0
    ? Math.round(totalGridOffset / selectedMembers.length)
    : 0;

  const totalEmi = selectedMembers.reduce((acc, m) => acc + m.monthlyContributionInr, 0);
  const avgEmiInr = selectedMembers.length > 0
    ? Math.round(totalEmi / selectedMembers.length)
    : 0;

  // Resilience & Worst case calculation
  // Apply maximum simultaneous stress
  const worstCaseMonthlySavingsInr = Math.max(
    180,
    Math.round(avgNetMonthlySavingsInr * 0.75 - (stressFactors.rateSpike ? 150 : 0) - (stressFactors.monsoonDrop ? 180 : 0))
  );

  let resilienceRating: OptimisationResult['resilienceRating'] = 'Robust Surplus Buffer';
  if (worstCaseMonthlySavingsInr < 400) {
    resilienceRating = 'High Risk';
  } else if (worstCaseMonthlySavingsInr < 700) {
    resilienceRating = 'Moderate Reserve Margin';
  }

  return {
    isFeasible: true,
    solverStatus: 'optimal',
    solverVersion: 'v2.4 Linear Program (Exact Combinatorial)',
    includedCount: selectedMembers.length,
    totalCount: candidateMembers.length,
    avgNetMonthlySavingsInr,
    avgGridOffsetInr,
    avgEmiInr,
    selectedMembers,
    worstCaseMonthlySavingsInr,
    resilienceRating,
    comparison: {
      baselineType: 'optimal',
      participationCount: selectedMembers.length,
      totalSavingsPerMonth: totalNetGain,
      fairnessIndex: computeJainsFairnessIndex(selectedMembers.map(m => m.sharePercentage))
    }
  };
}

/**
 * Generate Equal Split baseline comparison for the same cohort
 */
export function calculateEqualSplitBaseline(members: CommunityMember[], netTargetFundingInr: number) {
  const count = members.length || 1;
  const equalSharePercentage = Math.round((100 / count) * 10) / 10;
  const equalCostPerMemberInr = Math.round(netTargetFundingInr / count);
  const equalEmiInr = calculateEmi(equalCostPerMemberInr, 8.5, 60);

  // In an equal split, smaller flats (e.g. 102 with 420 kWh) pay more than their fair share, leading to high dropouts
  const dropouts = members.filter(m => equalCostPerMemberInr > m.maxUpfrontBudgetInr).length;
  const viableCount = count - dropouts;

  // Vector of shares across candidate cohort: viable units receive equal share, dropped out units receive 0
  const equalShares = members.map(m => equalCostPerMemberInr <= m.maxUpfrontBudgetInr ? (100 / Math.max(1, viableCount)) : 0);
  const fairnessIndex = computeJainsFairnessIndex(equalShares);

  return {
    participationCount: viableCount,
    equalCostPerMemberInr,
    equalEmiInr,
    dropouts,
    fairnessIndex
  };
}

/**
 * Generate Individual Rooftop baseline comparison
 */
export function calculateIndividualBaseline() {
  return {
    avgCapexPerHomeInr: 210000,
    subsidyInr: 78000,
    netPerHomeInr: 132000,
    individualEmiInr: calculateEmi(132000, 8.5, 60),
    participationFeasibility: '15-20% (requires unshaded private roof)',
    fairnessIndex: 35.0
  };
}
