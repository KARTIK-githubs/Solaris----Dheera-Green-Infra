import { actor, limitAccountOperation } from '../auth/access';
import { numberInRange, onlyKeys } from '../validation';
import { Router, Request, Response, NextFunction } from 'express';
import { Assessment } from '../models/Assessment';
import { calculateSolarFeasibility, SOLAR_METRICS, ENGINEERING_ASSUMPTIONS } from '../../src/utils/solarCalculations';
import { logAuditEvent } from '../services/auditService';

export const assessmentRouter = Router();

/**
 * POST /api/assessments
 * Run solar feasibility assessment and persist to MongoDB
 */
assessmentRouter.post('/', limitAccountOperation('assessment', 30), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      monthlyBillInr,
      monthlyConsumptionKwh,
      terraceAreaSqFt,
      sanctionedLoadKw,
      isResidential = true,
      costPerKwInr = 50000
    } = req.body ?? {};

    if (!onlyKeys(req.body, ['monthlyBillInr', 'monthlyConsumptionKwh', 'terraceAreaSqFt', 'sanctionedLoadKw', 'isResidential', 'costPerKwInr'])
      || !numberInRange(monthlyBillInr, 100_000_000)
      || !numberInRange(terraceAreaSqFt, 10_000_000)
      || !numberInRange(sanctionedLoadKw, 100_000)
      || (monthlyConsumptionKwh !== undefined && !numberInRange(monthlyConsumptionKwh, 100_000_000))
      || typeof isResidential !== 'boolean'
      || !numberInRange(costPerKwInr, 10_000_000, 1000)) {
      return res.status(400).json({ success: false, error: 'Invalid assessment inputs.' });
    }

    // Reuse canonical deterministic calculation logic (shared single source of truth)
    const calculation = calculateSolarFeasibility({
      monthlyBillInr,
      monthlyConsumptionKwh,
      terraceAreaSqFt,
      sanctionedLoadKw,
      isResidential: Boolean(isResidential),
      costPerKwInr: Number(costPerKwInr) || 50000,
      annualYieldKwhPerKwp: SOLAR_METRICS.NOMINAL_ANNUAL_YIELD_KWH_PER_KWP,
      shadingLossPercentage: ENGINEERING_ASSUMPTIONS.defaultShadingLossPercentage
    });

    // Create persistent document
    const assessment = new Assessment({
      ownerId: actor(res).id,
      monthlyBillInr,
      monthlyConsumptionKwh: calculation.monthlyConsumptionKwh,
      terraceAreaSqFt,
      sanctionedLoadKw,
      isResidential: Boolean(isResidential),
      costPerKwInr: Number(costPerKwInr) || 50000,

      provisionalAssumptions: {
        nominalAnnualYieldKwhPerKwp: SOLAR_METRICS.NOMINAL_ANNUAL_YIELD_KWH_PER_KWP,
        deratingFactor: SOLAR_METRICS.DEFAULT_DERATING_FACTOR,
        effectiveAnnualYieldKwhPerKwp: SOLAR_METRICS.EFFECTIVE_ANNUAL_YIELD_KWH_PER_KWP,
        effectiveMonthlyYieldKwhPerKwp: SOLAR_METRICS.EFFECTIVE_MONTHLY_YIELD_KWH_PER_KWP,
        spaceRatioSqFtPerKwp: ENGINEERING_ASSUMPTIONS.terraceAreaPerKwpSqFt,
        maxSanctionedLoadCapPercentage: ENGINEERING_ASSUMPTIONS.maxSanctionedLoadCapPercentage,
        regulatoryDisclaimer: 'Provisional engineering simulation estimate under Delhi insolation. Subject to on-site shading analysis, RCC structural survey, and DISCOM transformer headroom approval.'
      },

      recommendedCapacityKw: calculation.recommendedCapacityKw,
      estAnnualGenerationKwh: calculation.estAnnualGenerationKwh,
      estMonthlyGenerationKwh: calculation.estMonthlyGenerationKwh,
      grossInstallationCostInr: calculation.grossInstallationCostInr,
      subsidyInr: calculation.subsidyInr,
      netInstallationCostInr: calculation.netInstallationCostInr,
      monthlySavingsInr: calculation.monthlySavingsInr,
      paybackYears: calculation.paybackYears,
      annualRoiPercentage: calculation.annualRoiPercentage,
      roofAreaRequiredSqFt: calculation.roofAreaRequiredSqFt,
      roofSpaceUtilisationPercentage: calculation.roofSpaceUtilisationPercentage,
      co2OffsetTonsPerYear: calculation.co2OffsetTonsPerYear,
      gridOffsetPercentage: calculation.gridOffsetPercentage,
      exportSurplusInr: calculation.exportSurplusInr,
      limitingFactor: calculation.limitingFactor || 'energy_demand',
      feasibilityNotes: calculation.feasibilityNotes || [],
      isViable: calculation.isViable ?? true,
      isSynthetic: false,
      inputSource: 'account_input',
      outputKind: 'estimate'
    });

    const saved = await assessment.save();

    await logAuditEvent({
      action: 'ASSESSMENT_RUN',
      category: 'allocation',
      details: `Generated site assessment: Recommended ${saved.recommendedCapacityKw} kWp (${saved.limitingFactor}). Net Outlay: ₹${saved.netInstallationCostInr.toLocaleString('en-IN')}.`,
      actor: actor(res).id
    });

    return res.status(201).json({
      success: true,
      data: saved,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assessments/latest
 * Retrieve the most recently calculated site assessment
 */
assessmentRouter.get('/latest', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const latest = await Assessment.findOne({ ownerId: actor(res).id }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      data: latest,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assessments
 * List assessments history (last 20)
 */
assessmentRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const assessments = await Assessment.find({ ownerId: actor(res).id }).sort({ createdAt: -1 }).limit(20);
    return res.json({
      success: true,
      data: assessments,
      count: assessments.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});
