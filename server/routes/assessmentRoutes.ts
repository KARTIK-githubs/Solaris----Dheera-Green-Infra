import { Router, Request, Response } from 'express';
import { Assessment } from '../models/Assessment';
import { calculateSolarFeasibility, SOLAR_METRICS, ENGINEERING_ASSUMPTIONS } from '../../src/utils/solarCalculations';
import { logAuditEvent } from '../services/auditService';
import { isDbConnected, ensureDbConnected } from '../config/db';

export const assessmentRouter = Router();

/**
 * POST /api/assessments
 * Run solar feasibility assessment and persist to MongoDB
 */
assessmentRouter.post('/', async (req: Request, res: Response) => {
  try {
    if (!isDbConnected()) {
      await ensureDbConnected();
    }
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB is disconnected. Assessment cannot be saved to database.',
        database: 'disconnected'
      });
    }

    const {
      monthlyBillInr,
      monthlyConsumptionKwh,
      terraceAreaSqFt,
      sanctionedLoadKw,
      isResidential = true,
      costPerKwInr = 50000
    } = req.body;

    // Strict input validation
    if (typeof monthlyBillInr !== 'number' || monthlyBillInr < 0) {
      return res.status(400).json({
        success: false,
        error: 'monthlyBillInr must be a non-negative number.'
      });
    }

    if (typeof terraceAreaSqFt !== 'number' || terraceAreaSqFt < 0) {
      return res.status(400).json({
        success: false,
        error: 'terraceAreaSqFt must be a non-negative number.'
      });
    }

    if (typeof sanctionedLoadKw !== 'number' || sanctionedLoadKw < 0) {
      return res.status(400).json({
        success: false,
        error: 'sanctionedLoadKw must be a non-negative number.'
      });
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
      isSynthetic: true // Server-controlled flag
    });

    const saved = await assessment.save();

    await logAuditEvent({
      action: 'ASSESSMENT_RUN',
      category: 'allocation',
      details: `Generated site assessment: Recommended ${saved.recommendedCapacityKw} kWp (${saved.limitingFactor}). Net Outlay: ₹${saved.netInstallationCostInr.toLocaleString('en-IN')}.`,
      actor: 'Assessment Engine'
    });

    return res.status(201).json({
      success: true,
      data: saved,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[AssessmentRoute] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to process solar feasibility assessment: ' + error.message
    });
  }
});

/**
 * GET /api/assessments/latest
 * Retrieve the most recently calculated site assessment
 */
assessmentRouter.get('/latest', async (_req: Request, res: Response) => {
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

    const latest = await Assessment.findOne().sort({ createdAt: -1 });
    return res.json({
      success: true,
      data: latest,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/assessments
 * List assessments history (last 20)
 */
assessmentRouter.get('/', async (_req: Request, res: Response) => {
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

    const assessments = await Assessment.find().sort({ createdAt: -1 }).limit(20);
    return res.json({
      success: true,
      data: assessments,
      count: assessments.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
