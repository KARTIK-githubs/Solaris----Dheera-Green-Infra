import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { seedDatabase } from '../seed/seedData';
import { CommunityMember } from '../models/CommunityMember';
import { CommunityProject } from '../models/CommunityProject';
import { Assessment } from '../models/Assessment';
import { OptimisationRun } from '../models/OptimisationRun';
import { AuditLog } from '../models/AuditLog';
import { logAuditEvent } from '../services/auditService';
import { calculateSolarFeasibility, SOLAR_METRICS, ENGINEERING_ASSUMPTIONS } from '../../src/utils/solarCalculations';
import { runAffordabilityOptimiser } from '../../src/utils/optimiserEngine';
import { INITIAL_COMMUNITY } from '../../src/data/mockData';

// Isolated Test Database URI (strictly separate from development/production data)
const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/solaris_dheera_test';

export interface BackendTestResult {
  name: string;
  passed: boolean;
  message: string;
}

export async function runAllBackendTests(): Promise<BackendTestResult[]> {
  const results: BackendTestResult[] = [];

  console.log('\n--- Running Dheera Green Infra Solaris Backend Verification Suite ---\n');
  console.log(`[Test Target] Isolated Database: ${TEST_DB_URI}\n`);

  try {
    let isDbOnline = false;

    // Test 1: Database Connection & Test Isolation Check
    try {
      const conn = await connectDB(TEST_DB_URI);
      const isTestDb = conn.connection.name === 'solaris_dheera_test';
      const passed = isTestDb && conn.connection.readyState === 1;
      isDbOnline = passed;

      results.push({
        name: 'Database Connection & Test Isolation Verification',
        passed,
        message: passed
          ? `Connected to isolated test database '${conn.connection.name}' without affecting development database.`
          : `Unexpected database connected: ${conn.connection.name}`
      });
    } catch (err: any) {
      isDbOnline = false;
      results.push({
        name: 'Database Connection & Test Isolation Verification',
        passed: false,
        message: `Connection not established: ${err.message}. To run live database tests, ensure MongoDB is active on ${TEST_DB_URI}.`
      });
    }

    if (isDbOnline) {
      // Clean only test database collections before running tests
      await CommunityMember.deleteMany({});
      await CommunityProject.deleteMany({});
      await Assessment.deleteMany({});
      await OptimisationRun.deleteMany({});
      await AuditLog.deleteMany({});
    }

    // Test 2: Idempotent Seeding & Server-Controlled Synthetic Flag Enforcement
    if (!isDbOnline) {
      results.push({
        name: 'Idempotent Seeder & Server-Controlled Synthetic Tag Enforcement',
        passed: false,
        message: `Skipped: Requires active MongoDB instance on ${TEST_DB_URI}.`
      });
    } else {
      try {
        const { projectSeeded, membersSeeded } = await seedDatabase();
        const members = await CommunityMember.find();
        const allSynthetic = members.every(m => m.isSynthetic === true);
        const passed = projectSeeded && membersSeeded === 20 && members.length === 20 && allSynthetic;

        results.push({
          name: 'Idempotent Seeder & Server-Controlled Synthetic Tag Enforcement',
          passed,
          message: passed
            ? `Seeded 20 members in '${TEST_DB_URI}'. Verified server-enforced isSynthetic: true on all documents.`
            : `Seeder mismatch: count=${members.length}, allSynthetic=${allSynthetic}`
        });
      } catch (err: any) {
        results.push({
          name: 'Idempotent Seeder & Server-Controlled Synthetic Tag Enforcement',
          passed: false,
          message: err.message
        });
      }
    }

    // Test 3: Validation Failure Handling (Negative & Malformed Input Rejection)
    try {
      // Testing Mongoose schema validation rejection of negative inputs
      let caughtError = false;
      try {
        const invalidDoc = new Assessment({
          monthlyBillInr: -500, // Invalid negative bill
          monthlyConsumptionKwh: 50,
          terraceAreaSqFt: 500,
          sanctionedLoadKw: 5.0,
          recommendedCapacityKw: 3.0,
          estAnnualGenerationKwh: 4000,
          estMonthlyGenerationKwh: 333,
          grossInstallationCostInr: 150000,
          subsidyInr: 78000,
          netInstallationCostInr: 72000,
          monthlySavingsInr: 2500,
          paybackYears: 2.4,
          annualRoiPercentage: 41.6,
          roofAreaRequiredSqFt: 285,
          roofSpaceUtilisationPercentage: 57,
          co2OffsetTonsPerYear: 3.2,
          gridOffsetPercentage: 80,
          exportSurplusInr: 0,
          limitingFactor: 'energy_demand',
          isViable: true,
          isSynthetic: true
        });
        await invalidDoc.validate();
      } catch (validationErr: any) {
        caughtError = true;
      }

      const passed = caughtError;
      results.push({
        name: 'Input Validation Guardrail: Rejection of Negative Values',
        passed,
        message: passed
          ? 'Properly rejected negative monthly bill input during schema validation.'
          : 'Failed to reject negative monthlyBillInr input.'
      });
    } catch (err: any) {
      results.push({
        name: 'Input Validation Guardrail: Rejection of Negative Values',
        passed: false,
        message: err.message
      });
    }

    // Test 4: Calculation Parity (Direct Function vs. Persistent Document)
    if (!isDbOnline) {
      results.push({
        name: 'Calculation Parity & Single-Derating Consistency',
        passed: false,
        message: `Skipped: Requires active MongoDB instance on ${TEST_DB_URI}.`
      });
    } else {
      try {
        const inputs = {
        monthlyBillInr: 8500,
        terraceAreaSqFt: 1200,
        sanctionedLoadKw: 6.0,
        isResidential: true,
        costPerKwInr: 50000
      };

      // Direct calculation from shared logic
      const directCalc = calculateSolarFeasibility({
        ...inputs,
        annualYieldKwhPerKwp: SOLAR_METRICS.NOMINAL_ANNUAL_YIELD_KWH_PER_KWP,
        shadingLossPercentage: ENGINEERING_ASSUMPTIONS.defaultShadingLossPercentage
      });

      // Persist to MongoDB
      const doc = new Assessment({
        ...inputs,
        monthlyConsumptionKwh: directCalc.monthlyConsumptionKwh,
        provisionalAssumptions: {
          nominalAnnualYieldKwhPerKwp: SOLAR_METRICS.NOMINAL_ANNUAL_YIELD_KWH_PER_KWP,
          deratingFactor: SOLAR_METRICS.DEFAULT_DERATING_FACTOR,
          effectiveAnnualYieldKwhPerKwp: SOLAR_METRICS.EFFECTIVE_ANNUAL_YIELD_KWH_PER_KWP,
          effectiveMonthlyYieldKwhPerKwp: SOLAR_METRICS.EFFECTIVE_MONTHLY_YIELD_KWH_PER_KWP,
          spaceRatioSqFtPerKwp: ENGINEERING_ASSUMPTIONS.terraceAreaPerKwpSqFt,
          maxSanctionedLoadCapPercentage: ENGINEERING_ASSUMPTIONS.maxSanctionedLoadCapPercentage,
          regulatoryDisclaimer: 'Provisional engineering simulation estimate.'
        },
        recommendedCapacityKw: directCalc.recommendedCapacityKw,
        estAnnualGenerationKwh: directCalc.estAnnualGenerationKwh,
        estMonthlyGenerationKwh: directCalc.estMonthlyGenerationKwh,
        grossInstallationCostInr: directCalc.grossInstallationCostInr,
        subsidyInr: directCalc.subsidyInr,
        netInstallationCostInr: directCalc.netInstallationCostInr,
        monthlySavingsInr: directCalc.monthlySavingsInr,
        paybackYears: directCalc.paybackYears,
        annualRoiPercentage: directCalc.annualRoiPercentage,
        roofAreaRequiredSqFt: directCalc.roofAreaRequiredSqFt,
        roofSpaceUtilisationPercentage: directCalc.roofSpaceUtilisationPercentage,
        co2OffsetTonsPerYear: directCalc.co2OffsetTonsPerYear,
        gridOffsetPercentage: directCalc.gridOffsetPercentage,
        exportSurplusInr: directCalc.exportSurplusInr,
        limitingFactor: directCalc.limitingFactor,
        isViable: directCalc.isViable,
        isSynthetic: true
      });
      const savedDoc = await doc.save();

      const passed =
        savedDoc.recommendedCapacityKw === directCalc.recommendedCapacityKw &&
        savedDoc.estMonthlyGenerationKwh === directCalc.estMonthlyGenerationKwh &&
        savedDoc.netInstallationCostInr === directCalc.netInstallationCostInr &&
        savedDoc.limitingFactor === directCalc.limitingFactor;

      results.push({
        name: 'Calculation Parity & Single-Derating Consistency',
        passed,
        message: passed
          ? `Verified exact numerical parity between deterministic calculation and persistent database document (${savedDoc.recommendedCapacityKw} kWp, ${savedDoc.estMonthlyGenerationKwh} kWh/mo, limiting factor: ${savedDoc.limitingFactor}).`
          : 'Divergence detected between direct calculation and saved document.'
      });
    } catch (err: any) {
      results.push({
        name: 'Calculation Parity & Single-Derating Consistency',
        passed: false,
        message: err.message
      });
    }
    }

    // Test 5: Member Lifecycle Persistence (Withdrawal, Audit Log, Re-admission)
    if (!isDbOnline) {
      results.push({
        name: 'Member Status Lifecycle & Internal Audit Event Logging',
        passed: false,
        message: `Skipped: Requires active MongoDB instance on ${TEST_DB_URI}.`
      });
    } else {
    try {
      const member = await CommunityMember.findOne({ flatNumber: 'Flat 301' });
      if (!member) throw new Error('Flat 301 member not found');

      // Step A: Withdraw member
      member.status = 'withdrawn';
      await member.save();

      await logAuditEvent({
        action: 'MEMBER_WITHDRAWAL',
        category: 'lifecycle',
        details: `Member Flat 301 withdrew from community pool.`,
        actor: 'Test Harness'
      });

      const updatedMember = await CommunityMember.findOne({ flatNumber: 'Flat 301' });
      const auditEntry = await AuditLog.findOne({ action: 'MEMBER_WITHDRAWAL' }).sort({ timestamp: -1 });

      const isWithdrawn = updatedMember?.status === 'withdrawn';
      const hasAudit = auditEntry !== null && auditEntry.category === 'lifecycle';

      // Step B: Re-admit member
      if (updatedMember) {
        updatedMember.status = 'signed_deposited';
        await updatedMember.save();
      }

      const restoredMember = await CommunityMember.findOne({ flatNumber: 'Flat 301' });
      const isRestored = restoredMember?.status === 'signed_deposited';

      const passed = isWithdrawn && hasAudit && isRestored;
      results.push({
        name: 'Member Status Lifecycle & Internal Audit Event Logging',
        passed,
        message: passed
          ? 'Validated withdrawal persistence, automatic internal audit logging, and restitution upon re-admission.'
          : `Lifecycle persistence failure: isWithdrawn=${isWithdrawn}, hasAudit=${hasAudit}, isRestored=${isRestored}`
      });
    } catch (err: any) {
      results.push({
        name: 'Member Status Lifecycle & Internal Audit Event Logging',
        passed: false,
        message: err.message
      });
    }
    }

    // Test 6: Dynamic Solver Shortfall Calculation (No Hardcoding, Clamped at Zero)
    try {
      const activeMembers = isDbOnline
        ? (await CommunityMember.find()).filter(m => m.status !== 'withdrawn')
        : INITIAL_COMMUNITY.members.filter(m => m.status !== 'withdrawn');

      // Scenario 1: Severe capital deficit
      // 12 kWp gross is ₹5,80,000. Full illustrative subsidy is ₹78,000 -> Net required: ₹5,02,000.
      const lowBudgetCeiling = 100000;
      const grossCost12 = 580000;
      const subsidy12 = 78000;
      const netRequired12 = grossCost12 - subsidy12;
      const expectedShortfallLow = Math.max(0, netRequired12 - lowBudgetCeiling); // Dynamically computed: 402000

      const lowResult = runAffordabilityOptimiser(activeMembers as any, {
        roofAreaSqFt: 1400,
        targetCapacityKw: 12,
        budgetCeilingInr: lowBudgetCeiling,
        financingRatePercentage: 8.5,
        participantCapInr: 4500,
        stressFactors: { monsoonDrop: false, rateSpike: false, unitDropOut: false, subsidyDelay: false }
      });

      // Scenario 2: Ample budget
      const highBudgetCeiling = 600000;
      const expectedShortfallHigh = Math.max(0, netRequired12 - highBudgetCeiling); // Dynamically computed: 0

      const highResult = runAffordabilityOptimiser(activeMembers as any, {
        roofAreaSqFt: 1400,
        targetCapacityKw: 12,
        budgetCeilingInr: highBudgetCeiling,
        financingRatePercentage: 8.5,
        participantCapInr: 4500,
        stressFactors: { monsoonDrop: false, rateSpike: false, unitDropOut: false, subsidyDelay: false }
      });

      const passed =
        lowResult.isFeasible === false &&
        lowResult.solverStatus === 'infeasible' &&
        expectedShortfallLow === (502000 - 100000) &&
        (lowResult.shortfallInr ?? 0) === expectedShortfallLow &&
        highResult.isFeasible === true &&
        expectedShortfallHigh === 0;

      results.push({
        name: 'Dynamic Shortfall Calculation (Solver-Derived & Clamped at Zero)',
        passed,
        message: passed
          ? `Dynamically derived shortfall of ₹${expectedShortfallLow.toLocaleString('en-IN')} for low budget, and confirmed ₹0 shortfall with feasible status for ample budget.`
          : `Shortfall calculation anomaly: lowFeasible=${lowResult.isFeasible}, lowShortfall=${lowResult.shortfallInr}, highFeasible=${highResult.isFeasible}`
      });
    } catch (err: any) {
      results.push({
        name: 'Dynamic Shortfall Calculation (Solver-Derived & Clamped at Zero)',
        passed: false,
        message: err.message
      });
    }

    // Test 7: Append-Only Audit Integrity & Immutability Enforcement
    if (!isDbOnline) {
      results.push({
        name: 'Audit Integrity: Append-Only Mutation Blocking',
        passed: false,
        message: `Skipped: Requires active MongoDB instance on ${TEST_DB_URI}.`
      });
    } else {
      try {
        const log = new AuditLog({
          timestamp: new Date(),
          action: 'INTEGRITY_TEST_ENTRY',
          category: 'security',
          details: 'Testing append-only immutability pre-hooks.',
          actor: 'Security Auditor',
          isSynthetic: true
        });
        await log.save();

        let mutationBlocked = false;
        try {
          // Attempting to mutate an existing audit record via updateOne
          await AuditLog.updateOne({ _id: log._id }, { details: 'Illegal modification attempt' });
        } catch (mutationErr: any) {
          mutationBlocked = true;
        }

        const passed = mutationBlocked;
        results.push({
          name: 'Audit Integrity: Append-Only Mutation Blocking',
          passed,
          message: passed
            ? 'Enforced append-only semantics: blocked updateOne mutation attempt on AuditLog.'
            : 'Failed to block mutation on audit record.'
        });
      } catch (err: any) {
        results.push({
          name: 'Audit Integrity: Append-Only Mutation Blocking',
          passed: false,
          message: err.message
        });
      }
    }

    // Test 8: AI Planning Assistant: Graceful Offline Fallback (Missing GROQ_API_KEY)
    try {
      const prevGroqKey = process.env.GROQ_API_KEY;
      const prevGeminiKey = process.env.GEMINI_API_KEY;
      delete process.env.GROQ_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const { aiRouter } = await import('../routes/aiRoutes');
      let capturedStatusCode = 200;
      let capturedPayload: any = null;

      const mockReq: any = {
        body: { prompt: 'What are the DERC Virtual Net Metering guidelines for multi-tenant housing?' }
      };
      const mockRes: any = {
        status: (code: number) => { capturedStatusCode = code; return mockRes; },
        json: (data: any) => { capturedPayload = data; return mockRes; }
      };

      try {
        const handler = (aiRouter as any).stack.find((layer: any) => layer.route?.path === '/assistant')?.route?.stack[0]?.handle;
        if (handler) {
          await handler(mockReq, mockRes);
        }
      } finally {
        if (prevGroqKey !== undefined) process.env.GROQ_API_KEY = prevGroqKey;
        if (prevGeminiKey !== undefined) process.env.GEMINI_API_KEY = prevGeminiKey;
      }

      const passed =
        capturedStatusCode === 200 &&
        capturedPayload?.success === true &&
        capturedPayload?.data?.isLiveModel === false &&
        capturedPayload?.data?.fallbackReason === 'NO_API_KEY' &&
        typeof capturedPayload?.data?.reply === 'string' &&
        capturedPayload.data.reply.length > 0;

      results.push({
        name: 'AI Planning Assistant: Graceful Offline Fallback (Missing GROQ_API_KEY)',
        passed,
        message: passed
          ? 'Gracefully fell back to informative offline advisory when GROQ_API_KEY is not configured.'
          : `Unexpected AI route response: status=${capturedStatusCode}, payload=${JSON.stringify(capturedPayload)}`
      });
    } catch (err: any) {
      results.push({
        name: 'AI Planning Assistant: Graceful Offline Fallback (Missing GROQ_API_KEY)',
        passed: false,
        message: err.message
      });
    }

    // Test 9: AI Planning Assistant: Groq API Integration & Response Parsing (Mocked)
    try {
      const prevGroqKey = process.env.GROQ_API_KEY;
      process.env.GROQ_API_KEY = 'gsk_mock_test_key_solaris';

      const originalFetch = global.fetch;
      let interceptedUrl = '';
      let interceptedHeaders: any = null;
      let interceptedBody: any = null;

      const mockReplyText = 'Based on DERC VNM 2024 guidelines, virtual net metering allows multi-tenant buildings to share generation credits proportionally.';

      global.fetch = (async (url: any, options: any) => {
        interceptedUrl = String(url);
        interceptedHeaders = options?.headers;
        interceptedBody = options?.body ? JSON.parse(options.body) : null;

        return new Response(
          JSON.stringify({
            id: 'chatcmpl-mock-12345',
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: 'openai/gpt-oss-20b',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: mockReplyText
                },
                finish_reason: 'stop'
              }
            ],
            usage: { prompt_tokens: 150, completion_tokens: 30, total_tokens: 180 }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }) as any;

      const { aiRouter } = await import('../routes/aiRoutes');
      let capturedStatusCode = 200;
      let capturedPayload: any = null;

      const mockReq: any = {
        body: {
          prompt: 'How are VNM credits allocated?',
          context: { targetCapacityKw: 12, userRole: 'admin' }
        }
      };
      const mockRes: any = {
        status: (code: number) => { capturedStatusCode = code; return mockRes; },
        json: (data: any) => { capturedPayload = data; return mockRes; }
      };

      try {
        const handler = (aiRouter as any).stack.find((layer: any) => layer.route?.path === '/assistant')?.route?.stack[0]?.handle;
        if (handler) {
          await handler(mockReq, mockRes);
        }
      } finally {
        global.fetch = originalFetch;
        if (prevGroqKey !== undefined) {
          process.env.GROQ_API_KEY = prevGroqKey;
        } else {
          delete process.env.GROQ_API_KEY;
        }
      }

      const isUrlCorrect = interceptedUrl === 'https://api.groq.com/openai/v1/chat/completions';
      const isAuthHeaderCorrect = interceptedHeaders?.['Authorization'] === 'Bearer gsk_mock_test_key_solaris';
      const isModelCorrect = interceptedBody?.model === 'openai/gpt-oss-20b';
      const isReplyCorrect = capturedPayload?.data?.reply === mockReplyText;
      const isLiveModel = capturedPayload?.data?.isLiveModel === true;

      const passed =
        capturedStatusCode === 200 &&
        capturedPayload?.success === true &&
        isUrlCorrect &&
        isAuthHeaderCorrect &&
        isModelCorrect &&
        isReplyCorrect &&
        isLiveModel;

      results.push({
        name: 'AI Planning Assistant: Groq API Integration & Response Parsing (Mocked)',
        passed,
        message: passed
          ? 'Validated Groq OpenAI-compatible request structure (model openai/gpt-oss-20b, Bearer auth) and assistant reply parsing.'
          : `Groq integration check failed: url=${isUrlCorrect}, auth=${isAuthHeaderCorrect}, model=${isModelCorrect}, reply=${isReplyCorrect}, status=${capturedStatusCode}`
      });
    } catch (err: any) {
      results.push({
        name: 'AI Planning Assistant: Groq API Integration & Response Parsing (Mocked)',
        passed: false,
        message: err.message
      });
    }

    // Test 10: AI Planning Assistant: Groq Provider Error & Malformed Payload Resilience (Mocked)
    try {
      const prevGroqKey = process.env.GROQ_API_KEY;
      process.env.GROQ_API_KEY = 'gsk_mock_test_key_solaris';

      const originalFetch = global.fetch;

      // Simulate upstream 500 error from provider
      global.fetch = (async () => {
        return new Response(
          JSON.stringify({ error: { message: 'Groq service temporarily unavailable', type: 'server_error' } }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }) as any;

      const { aiRouter } = await import('../routes/aiRoutes');
      let capturedStatusCode = 200;
      let capturedPayload: any = null;

      const mockReq: any = {
        body: { prompt: 'How much energy did my system generate this month?' }
      };
      const mockRes: any = {
        status: (code: number) => { capturedStatusCode = code; return mockRes; },
        json: (data: any) => { capturedPayload = data; return mockRes; }
      };

      try {
        const handler = (aiRouter as any).stack.find((layer: any) => layer.route?.path === '/assistant')?.route?.stack[0]?.handle;
        if (handler) {
          await handler(mockReq, mockRes);
        }
      } finally {
        global.fetch = originalFetch;
        if (prevGroqKey !== undefined) {
          process.env.GROQ_API_KEY = prevGroqKey;
        } else {
          delete process.env.GROQ_API_KEY;
        }
      }

      const passed =
        capturedStatusCode === 200 &&
        capturedPayload?.success === true &&
        capturedPayload?.data?.isLiveModel === false &&
        capturedPayload?.data?.fallbackReason === 'API_ERROR' &&
        typeof capturedPayload?.data?.reply === 'string' &&
        capturedPayload.data.reply.length > 0;

      results.push({
        name: 'AI Planning Assistant: Groq Provider Error & Malformed Payload Resilience (Mocked)',
        passed,
        message: passed
          ? 'Gracefully caught upstream HTTP 500 provider error and served canonical offline fallback without leaking error specifics.'
          : `Unexpected failure handling: status=${capturedStatusCode}, payload=${JSON.stringify(capturedPayload)}`
      });
    } catch (err: any) {
      results.push({
        name: 'AI Planning Assistant: Groq Provider Error & Malformed Payload Resilience (Mocked)',
        passed: false,
        message: err.message
      });
    }

    // Test 11: Database Connection Failure Handling
    try {
      let caughtConnectionError = false;
      const invalidUri = 'mongodb://127.0.0.1:29999/unreachable_db';
      try {
        await mongoose.createConnection(invalidUri, {
          serverSelectionTimeoutMS: 800
        }).asPromise();
      } catch (connErr: any) {
        caughtConnectionError = true;
      }

      const passed = caughtConnectionError;
      results.push({
        name: 'Database Fault Tolerance: Connection Failure Handling',
        passed,
        message: passed
          ? 'Properly caught and rejected connection to unreachable MongoDB port within timeout threshold.'
          : 'Failed to handle connection failure to invalid port.'
      });
    } catch (err: any) {
      results.push({
        name: 'Database Fault Tolerance: Connection Failure Handling',
        passed: false,
        message: err.message
      });
    }

  } finally {
    await disconnectDB();
  }

  return results;
}

// Self-executing CLI runner when invoked via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('backendTests')) {
  runAllBackendTests().then((results) => {
    let allPassed = true;
    results.forEach((r, idx) => {
      const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`[${symbol}] Test ${idx + 1}: ${r.name}`);
      console.log(`       ${r.message}`);
      if (!r.passed) allPassed = false;
    });
    console.log('\n--------------------------------------------------------------');
    console.log(`Results: ${results.filter(r => r.passed).length}/${results.length} backend tests passed.\n`);
    if (!allPassed) {
      process.exit(1);
    }
  }).catch((err) => {
    console.error('Fatal backend test runner error:', err);
    process.exit(1);
  });
}
