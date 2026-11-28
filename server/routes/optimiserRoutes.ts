import { actor, limitAccountOperation } from '../auth/access';
import { numberInRange, onlyKeys } from '../validation';
import { Router, Request, Response, NextFunction } from 'express';
import { OptimisationRun } from '../models/OptimisationRun';
import { CommunityMember } from '../models/CommunityMember';
import { runAffordabilityOptimiser } from '../../src/utils/optimiserEngine';
import { logAuditEvent } from '../services/auditService';
import { OptimisationParams, CommunityMember as MemberType } from '../../src/types';
import { isDbConnected, ensureDbConnected } from '../config/db';

export const optimiserRouter = Router();

/**
 * POST /api/optimiser/solve
 * Run the deterministic LP combinatorial affordability solver and persist scenario
 */
optimiserRouter.post('/solve', limitAccountOperation('optimiser', 8), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isDbConnected()) {
      await ensureDbConnected();
    }
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB is disconnected. Live cohort cannot be fetched from database.',
        database: 'disconnected'
      });
    }

    const {
      targetCapacityKw = 12,
      budgetCeilingInr = 580000,
      financingRatePercentage = 8.5,
      participantCapInr = 4500,
      roofAreaSqFt = 1400,
      stressFactors = {
        monsoonDrop: false,
        rateSpike: false,
        unitDropOut: false,
        subsidyDelay: false
      }
    } = req.body ?? {};

    const stressKeys = ['monsoonDrop', 'rateSpike', 'unitDropOut', 'subsidyDelay'] as const;
    if (!onlyKeys(req.body, ['targetCapacityKw', 'budgetCeilingInr', 'financingRatePercentage', 'participantCapInr', 'roofAreaSqFt', 'stressFactors'])
      || ![10, 12, 15].includes(targetCapacityKw)
      || !numberInRange(budgetCeilingInr, 100_000_000)
      || !numberInRange(financingRatePercentage, 100)
      || !numberInRange(participantCapInr, 1_000_000)
      || !numberInRange(roofAreaSqFt, 10_000_000)
      || !onlyKeys(stressFactors, stressKeys)
      || stressKeys.some(key => typeof stressFactors[key] !== 'boolean')) {
      return res.status(400).json({ success: false, error: 'Invalid optimisation inputs.' });
    }

    // Fetch live member cohort from MongoDB
    const dbMembers = await CommunityMember.find().sort({ memberId: 1 });
    
    // Map to engine's expected CommunityMember interface
    const members: MemberType[] = dbMembers.map((m) => ({
      id: m.memberId,
      flatNumber: m.flatNumber,
      tower: m.tower,
      ownerName: m.ownerName,
      caNumber: m.caNumber,
      sanctionedLoadKw: m.sanctionedLoadKw,
      monthlyConsumptionKwh: m.monthlyConsumptionKwh,
      monthlyBillInr: m.monthlyBillInr,
      maxUpfrontBudgetInr: m.maxUpfrontBudgetInr,
      allocatedKw: m.allocatedKw,
      allocationPercentage: m.allocationPercentage,
      allocatedKwhPerMonth: m.allocatedKwhPerMonth,
      depositPaidInr: m.depositPaidInr,
      status: m.status,
      consentSigned: m.consentSigned,
      tier: m.tier
    }));

    const solverParams: OptimisationParams = {
      targetCapacityKw: Number(targetCapacityKw) as 10 | 12 | 15,
      budgetCeilingInr: Number(budgetCeilingInr),
      financingRatePercentage: Number(financingRatePercentage),
      participantCapInr: Number(participantCapInr),
      roofAreaSqFt: Number(roofAreaSqFt),
      stressFactors: {
        monsoonDrop: Boolean(stressFactors.monsoonDrop),
        rateSpike: Boolean(stressFactors.rateSpike),
        unitDropOut: Boolean(stressFactors.unitDropOut),
        subsidyDelay: Boolean(stressFactors.subsidyDelay)
      }
    };

    // Calculate dynamic cost & illustrative subsidy dynamics
    const grossCostInr = solverParams.targetCapacityKw === 10 ? 500000 : solverParams.targetCapacityKw === 12 ? 580000 : 720000;
    const illustrativeSubsidyInr = solverParams.stressFactors.subsidyDelay ? 39000 : 78000;
    const requiredNetFundingInr = grossCostInr - illustrativeSubsidyInr;

    // Execute canonical deterministic solver (shared with frontend engine)
    const result = runAffordabilityOptimiser(members, solverParams);

    // Dynamic shortfall calculation clamped at zero
    const calculatedShortfallInr = Math.max(0, requiredNetFundingInr - solverParams.budgetCeilingInr);

    // Sum verification
    const reconciledSumPercentage = result.selectedMembers.length > 0
      ? Math.round(result.selectedMembers.reduce((sum, m) => sum + m.sharePercentage, 0) * 10) / 10
      : 0;

    // Persist solver run to MongoDB
    const runDoc = new OptimisationRun({
      targetCapacityKw: solverParams.targetCapacityKw,
      budgetCeilingInr: solverParams.budgetCeilingInr,
      financingRatePercentage: solverParams.financingRatePercentage,
      participantCapInr: solverParams.participantCapInr,
      stressFactors: solverParams.stressFactors,

      costBreakdown: {
        grossCostInr,
        illustrativeSubsidyInr,
        subsidyAssumptionNote: 'Illustrative CFA assumption based on PM Surya Ghar GHS/RWA model (subject to DISCOM/MNRE formal release).',
        requiredNetFundingInr
      },

      isFeasible: result.isFeasible,
      solverStatus: result.solverStatus,
      solverVersion: result.solverVersion,
      shortfallInr: result.isFeasible ? 0 : calculatedShortfallInr,
      infeasibilityReason: result.infeasibilityReason || (result.isFeasible ? undefined : `Budget shortfall of ₹${calculatedShortfallInr.toLocaleString('en-IN')}`),
      includedCount: result.includedCount,
      totalCount: result.totalCount,
      avgNetMonthlySavingsInr: result.avgNetMonthlySavingsInr,
      avgGridOffsetInr: result.avgGridOffsetInr,
      avgEmiInr: result.avgEmiInr,
      reconciledSumPercentage,

      selectedMembers: result.selectedMembers,
      worstCaseMonthlySavingsInr: result.worstCaseMonthlySavingsInr,
      resilienceRating: result.resilienceRating,
      isSynthetic: true // Server-enforced synthetic demo flag
    });

    const saved = await runDoc.save();

    await logAuditEvent({
      action: 'OPTIMISATION_RUN',
      category: 'allocation',
      details: `Solved ${solverParams.targetCapacityKw} kWp allocation. Feasible: ${result.isFeasible}. Active Units: ${result.includedCount}/${result.totalCount}. Shortfall: ₹${(result.isFeasible ? 0 : calculatedShortfallInr).toLocaleString('en-IN')}.`,
      actor: actor(res).id
    });

    return res.status(200).json({
      success: true,
      data: {
        ...result,
        id: saved._id,
        shortfallInr: result.isFeasible ? 0 : calculatedShortfallInr,
        costBreakdown: runDoc.costBreakdown
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/optimiser/runs
 * Retrieve recent optimization runs
 */
optimiserRouter.get('/runs', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isDbConnected()) {
      await ensureDbConnected();
    }
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB is disconnected.',
        database: 'disconnected'
      });
    }

    const runs = await OptimisationRun.find().sort({ createdAt: -1 }).limit(10);
    return res.json({
      success: true,
      data: runs,
      count: runs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});
