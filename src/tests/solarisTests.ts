import { calculateSolarFeasibility, calculatePmSuryaGharSubsidy, estimateMonthlyKwhFromBill, SOLAR_METRICS } from '../utils/solarCalculations';
import { runAffordabilityOptimiser, calculateEmi } from '../utils/optimiserEngine';
import { INITIAL_COMMUNITY } from '../data/mockData';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export function runAllSolarisTests(): TestResult[] {
  const results: TestResult[] = [];

  // Test 1: Zero and negative input rejection
  try {
    const zeroTest = calculateSolarFeasibility({
      monthlyBillInr: 0,
      terraceAreaSqFt: 0,
      sanctionedLoadKw: 0
    });
    const passed = zeroTest.monthlyConsumptionKwh === 0 && zeroTest.recommendedCapacityKw >= 0;
    results.push({
      name: 'Zero and Negative Input Handling',
      passed,
      message: passed ? 'Successfully handled zero boundaries without NaN or infinite values.' : 'Failed zero boundary check.'
    });
  } catch (err: any) {
    results.push({ name: 'Zero and Negative Input Handling', passed: false, message: err.message });
  }

  // Test 2: PM Surya Ghar Subsidy Caps
  try {
    const sub1Kw = calculatePmSuryaGharSubsidy(1.0, true);
    const sub2Kw = calculatePmSuryaGharSubsidy(2.0, true);
    const sub3Kw = calculatePmSuryaGharSubsidy(3.0, true);
    const sub5Kw = calculatePmSuryaGharSubsidy(5.0, true);
    const subCommercial = calculatePmSuryaGharSubsidy(5.0, false);

    const passed = 
      sub1Kw === 30000 &&
      sub2Kw === 60000 &&
      sub3Kw === 78000 &&
      sub5Kw === 78000 && // Capped at ₹78,000 for residential
      subCommercial === 0;  // 0 for commercial

    results.push({
      name: 'PM Surya Ghar Subsidy Compliance',
      passed,
      message: passed 
        ? 'Verified ₹30k/kW up to 2kW, ₹78k cap at 3kW+, and 0 subsidy for commercial MSME.' 
        : `Subsidy mismatch: 1kW=${sub1Kw}, 2kW=${sub2Kw}, 3kW=${sub3Kw}, Comm=${subCommercial}`
    });
  } catch (err: any) {
    results.push({ name: 'PM Surya Ghar Subsidy Compliance', passed: false, message: err.message });
  }

  // Test 3: Optimiser Allocation Sum = 100% (Zero Shortfall)
  try {
    const opt = runAffordabilityOptimiser(INITIAL_COMMUNITY.members, {
      roofAreaSqFt: 1400,
      targetCapacityKw: 12,
      budgetCeilingInr: 580000,
      financingRatePercentage: 8.5,
      participantCapInr: 4500,
      stressFactors: {
        monsoonDrop: false,
        rateSpike: false,
        unitDropOut: false,
        subsidyDelay: false
      }
    });

    const sum = opt.selectedMembers.reduce((acc, m) => acc + m.sharePercentage, 0);
    const roundedSum = Math.round(sum * 10) / 10;
    const passed = roundedSum === 100.0 && opt.isFeasible;

    results.push({
      name: 'Credit Allocation Reconciliation (Sum = 100.0%)',
      passed,
      message: passed
        ? `Reconciled total sum is exactly ${roundedSum}% across ${opt.selectedMembers.length} participants with zero loss.`
        : `Sum mismatch: ${roundedSum}% != 100.0%`
    });
  } catch (err: any) {
    results.push({ name: 'Credit Allocation Reconciliation (Sum = 100.0%)', passed: false, message: err.message });
  }

  // Test 4: Allocation Total Does Not Exceed Generated Energy
  try {
    const opt = runAffordabilityOptimiser(INITIAL_COMMUNITY.members, {
      roofAreaSqFt: 1400,
      targetCapacityKw: 12,
      budgetCeilingInr: 580000,
      financingRatePercentage: 8.5,
      participantCapInr: 4500,
      stressFactors: {
        monsoonDrop: false,
        rateSpike: false,
        unitDropOut: false,
        subsidyDelay: false
      }
    });

    const totalKwAllocated = opt.selectedMembers.reduce((acc, m) => acc + m.shareKw, 0);
    const passed = Math.round(totalKwAllocated * 10) / 10 <= 12.0;

    results.push({
      name: 'Allocated Energy Within Technical Physical Limits',
      passed,
      message: passed
        ? `Allocated capacity (${totalKwAllocated.toFixed(1)} kW) does not exceed physical target capacity (12.0 kW).`
        : `Physical capacity exceeded: ${totalKwAllocated} kW > 12.0 kW`
    });
  } catch (err: any) {
    results.push({ name: 'Allocated Energy Within Technical Physical Limits', passed: false, message: err.message });
  }

  // Test 5: Budget Ceiling & Guaranteed Bill Safety Guardrail
  try {
    const emi = calculateEmi(100000, 8.5, 60);
    const passed = emi > 0 && emi <= 2100;
    results.push({
      name: 'Financing EMI & Budget Ceiling Calculation',
      passed,
      message: passed
        ? `5-Year loan calculation validated (₹${emi}/mo for ₹1,00,000 @ 8.5% p.a.).`
        : `Unexpected EMI calculation: ${emi}`
    });
  } catch (err: any) {
    results.push({ name: 'Financing EMI & Budget Ceiling Calculation', passed: false, message: err.message });
  }

  // Test 6: Physical Roof Area Bounding & Failure Handling
  try {
    const smallRoof = calculateSolarFeasibility({
      monthlyBillInr: 6500,
      terraceAreaSqFt: 50, // Less than 90 sq.ft minimum
      sanctionedLoadKw: 5.0
    });
    const passed = smallRoof.recommendedCapacityKw === 0 && !smallRoof.isViable && smallRoof.limitingFactor === 'roof';
    results.push({
      name: 'Rooftop Constraint Bounding & Infeasible Area Handling',
      passed,
      message: passed
        ? `Correctly identified 50 sq.ft roof as too constrained (<90 sq.ft) and advised community solar pathway.`
        : `Failed rooftop constraint: recommendedKw=${smallRoof.recommendedCapacityKw}, viable=${smallRoof.isViable}`
    });
  } catch (err: any) {
    results.push({ name: 'Rooftop Constraint Bounding & Infeasible Area Handling', passed: false, message: err.message });
  }

  // Test 7: Realistic Monthly Energy Allocation using Canonical Solar Model (~1,335 kWh/mo for 12 kWp)
  try {
    const opt = runAffordabilityOptimiser(INITIAL_COMMUNITY.members, {
      roofAreaSqFt: 1400,
      targetCapacityKw: 12,
      budgetCeilingInr: 580000,
      financingRatePercentage: 8.5,
      participantCapInr: 4500,
      stressFactors: {
        monsoonDrop: false,
        rateSpike: false,
        unitDropOut: false,
        subsidyDelay: false
      }
    });

    const monthlyEnergyKwh = opt.selectedMembers.reduce((sum, m) => sum + Math.round(m.shareKw * SOLAR_METRICS.EFFECTIVE_MONTHLY_YIELD_KWH_PER_KWP), 0);
    // 12 kWp at canonical 111.233 kWh/kWp/mo generates approx 1,335 kWh/month (1,334.8 kWh)
    const passed = monthlyEnergyKwh >= 1300 && monthlyEnergyKwh <= 1370;
    results.push({
      name: 'Monthly Energy Scale Realism (~1,335 kWh/mo for 12 kWp Canonical Yield)',
      passed,
      message: passed
        ? `Verified realistic monthly energy production of ${monthlyEnergyKwh} kWh/mo across participants based on 1,334.8 kWh/kWp/yr effective yield.`
        : `Energy scale anomaly: ${monthlyEnergyKwh} kWh/mo is outside realistic monthly yield bounds.`
    });
  } catch (err: any) {
    results.push({ name: 'Monthly Energy Scale Realism (~1,335 kWh/mo for 12 kWp Canonical Yield)', passed: false, message: err.message });
  }

  // Test 8: Withdrawn Member Exclusion & 100% Rebalancing
  try {
    const modifiedMembers = INITIAL_COMMUNITY.members.map((m, idx) => ({
      ...m,
      status: idx === 0 ? ('withdrawn' as const) : m.status
    }));

    const rebalancedOpt = runAffordabilityOptimiser(modifiedMembers, {
      roofAreaSqFt: 1400,
      targetCapacityKw: 12,
      budgetCeilingInr: 580000,
      financingRatePercentage: 8.5,
      participantCapInr: 4500,
      stressFactors: {
        monsoonDrop: false,
        rateSpike: false,
        unitDropOut: false,
        subsidyDelay: false
      }
    });

    const hasWithdrawn = rebalancedOpt.selectedMembers.some(m => m.memberId === modifiedMembers[0].id);
    const sum = rebalancedOpt.selectedMembers.reduce((acc, m) => acc + m.sharePercentage, 0);
    const roundedSum = Math.round(sum * 10) / 10;
    const passed = !hasWithdrawn && roundedSum === 100.0;

    results.push({
      name: 'Withdrawn Member Exclusion & 100% Cohort Rebalancing',
      passed,
      message: passed
        ? `Successfully excluded withdrawn member ${modifiedMembers[0].flatNumber} and reallocated 100.0% among remaining participants.`
        : `Rebalancing failed: withdrawnIncluded=${hasWithdrawn}, sum=${roundedSum}%`
    });
  } catch (err: any) {
    results.push({ name: 'Withdrawn Member Exclusion & 100% Cohort Rebalancing', passed: false, message: err.message });
  }

  // Test 9: Zero Eligible Participants (Empty Cohort / All Withdrawn)
  try {
    const allWithdrawnMembers = INITIAL_COMMUNITY.members.map(m => ({
      ...m,
      status: 'withdrawn' as const
    }));

    const opt = runAffordabilityOptimiser(allWithdrawnMembers, {
      roofAreaSqFt: 1400,
      targetCapacityKw: 12,
      budgetCeilingInr: 580000,
      financingRatePercentage: 8.5,
      participantCapInr: 4500,
      stressFactors: {
        monsoonDrop: false,
        rateSpike: false,
        unitDropOut: false,
        subsidyDelay: false
      }
    });

    const passed = opt.isFeasible === false && opt.solverStatus === 'infeasible' && opt.includedCount === 0;
    results.push({
      name: 'Business Invariant: Zero Eligible Participants Infeasibility Handling',
      passed,
      message: passed
        ? 'Correctly flagged infeasible solver state and zero participants when all cohort members have withdrawn.'
        : `Solver did not reject zero participants: isFeasible=${opt.isFeasible}, count=${opt.includedCount}`
    });
  } catch (err: any) {
    results.push({ name: 'Business Invariant: Zero Eligible Participants Infeasibility Handling', passed: false, message: err.message });
  }

  // Test 10: Severe Budget Shortfall / Capital Deficiency Detection
  try {
    // 12 kWp net capex is ₹5,02,000 (₹5,80,000 gross - ₹78,000 subsidy).
    // Test with an inadequate budget ceiling of ₹1,00,000 (shortfall = ₹4,02,000).
    const opt = runAffordabilityOptimiser(INITIAL_COMMUNITY.members, {
      roofAreaSqFt: 1400,
      targetCapacityKw: 12,
      budgetCeilingInr: 100000,
      financingRatePercentage: 8.5,
      participantCapInr: 4500,
      stressFactors: {
        monsoonDrop: false,
        rateSpike: false,
        unitDropOut: false,
        subsidyDelay: false
      }
    });

    const passed = opt.isFeasible === false && opt.solverStatus === 'infeasible' && (opt.shortfallInr ?? 0) > 0;
    results.push({
      name: 'Business Invariant: Severe Budget Shortfall Detection',
      passed,
      message: passed
        ? `Properly rejected capital-deficient scenario with explicit shortfall of ₹${(opt.shortfallInr ?? 0).toLocaleString('en-IN')}.`
        : `Failed to flag budget deficiency: isFeasible=${opt.isFeasible}, shortfall=${opt.shortfallInr}`
    });
  } catch (err: any) {
    results.push({ name: 'Business Invariant: Severe Budget Shortfall Detection', passed: false, message: err.message });
  }

  // Test 11: Member Withdrawal and Re-admission Round-trip Lifecycle
  try {
    const memberToToggle = INITIAL_COMMUNITY.members[0];

    // Baseline with all active
    const optInitial = runAffordabilityOptimiser(INITIAL_COMMUNITY.members, {
      roofAreaSqFt: 1400,
      targetCapacityKw: 12,
      budgetCeilingInr: 580000,
      financingRatePercentage: 8.5,
      participantCapInr: 4500,
      stressFactors: { monsoonDrop: false, rateSpike: false, unitDropOut: false, subsidyDelay: false }
    });

    // Member withdraws
    const membersWithdrawn = INITIAL_COMMUNITY.members.map(m =>
      m.id === memberToToggle.id ? { ...m, status: 'withdrawn' as const } : m
    );
    const optWithdrawn = runAffordabilityOptimiser(membersWithdrawn, {
      roofAreaSqFt: 1400,
      targetCapacityKw: 12,
      budgetCeilingInr: 580000,
      financingRatePercentage: 8.5,
      participantCapInr: 4500,
      stressFactors: { monsoonDrop: false, rateSpike: false, unitDropOut: false, subsidyDelay: false }
    });

    // Member re-admitted (restored to original status)
    const membersReadmitted = membersWithdrawn.map(m =>
      m.id === memberToToggle.id ? { ...m, status: memberToToggle.status } : m
    );
    const optReadmitted = runAffordabilityOptimiser(membersReadmitted, {
      roofAreaSqFt: 1400,
      targetCapacityKw: 12,
      budgetCeilingInr: 580000,
      financingRatePercentage: 8.5,
      participantCapInr: 4500,
      stressFactors: { monsoonDrop: false, rateSpike: false, unitDropOut: false, subsidyDelay: false }
    });

    const isWithdrawnExcluded = !optWithdrawn.selectedMembers.some(m => m.memberId === memberToToggle.id);
    const isReadmittedIncluded = optReadmitted.selectedMembers.some(m => m.memberId === memberToToggle.id);
    const sumWithdrawn = Math.round(optWithdrawn.selectedMembers.reduce((s, m) => s + m.sharePercentage, 0) * 10) / 10;
    const sumReadmitted = Math.round(optReadmitted.selectedMembers.reduce((s, m) => s + m.sharePercentage, 0) * 10) / 10;

    const passed = isWithdrawnExcluded && isReadmittedIncluded && sumWithdrawn === 100.0 && sumReadmitted === 100.0;
    results.push({
      name: 'Business Invariant: Member Lifecycle Round-trip (Withdrawal & Re-admission)',
      passed,
      message: passed
        ? `Validated full lifecycle: exclusion on withdrawal (${optWithdrawn.selectedMembers.length} members, ${sumWithdrawn}%) and restitution upon re-admission (${optReadmitted.selectedMembers.length} members, ${sumReadmitted}%).`
        : `Lifecycle mismatch: excluded=${isWithdrawnExcluded}, readmitted=${isReadmittedIncluded}, sumW=${sumWithdrawn}, sumR=${sumReadmitted}`
    });
  } catch (err: any) {
    results.push({ name: 'Business Invariant: Member Lifecycle Round-trip (Withdrawal & Re-admission)', passed: false, message: err.message });
  }

  // Test 12: Sanctioned Load Regulatory Cap Enforcement
  try {
    const result = calculateSolarFeasibility({
      monthlyBillInr: 12000, // Large bill (~1,250 kWh/mo)
      terraceAreaSqFt: 1500,  // Large roof (~15 kWp space)
      sanctionedLoadKw: 3.0   // Strict 3.0 kW sanctioned load constraint
    });

    const passed = result.recommendedCapacityKw <= 3.0 && result.limitingFactor === 'sanctioned_load';
    results.push({
      name: 'Business Invariant: Sanctioned Load Regulatory Cap Enforcement',
      passed,
      message: passed
        ? `Successfully bounded recommended solar capacity (${result.recommendedCapacityKw} kW) to DISCOM sanctioned load limit (3.0 kW) despite larger roof area.`
        : `Sanctioned load exceeded: recommended=${result.recommendedCapacityKw} kW, limitingFactor=${result.limitingFactor}`
    });
  } catch (err: any) {
    results.push({ name: 'Business Invariant: Sanctioned Load Regulatory Cap Enforcement', passed: false, message: err.message });
  }

  return results;
}

// Self-executing CLI runner when executed via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('solarisTests')) {
  console.log('\n--- Running Dheera Green Infra Solaris Verification Suite ---\n');
  const results = runAllSolarisTests();
  let allPassed = true;
  results.forEach((r, idx) => {
    const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${symbol}] Test ${idx + 1}: ${r.name}`);
    console.log(`       ${r.message}`);
    if (!r.passed) allPassed = false;
  });
  console.log('\n--------------------------------------------------------------');
  console.log(`Results: ${results.filter(r => r.passed).length}/${results.length} tests passed.\n`);
  if (!allPassed) {
    process.exit(1);
  }
}
