import type { AccountRole } from '../auth/models';
import { actor } from '../auth/access';
import { numberInRange, onlyKeys, record, text } from '../validation';
import { Router, Request, Response } from 'express';

export const aiRouter = Router();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-20b';

const numericScenarioFields = [
  'targetCapacityKw', 'budgetInr', 'budgetCeiling', 'requiredCostInr',
  'requiredNetCost', 'shortfallInr', 'fairnessIndex'
] as const;

type Scenario = Partial<Record<typeof numericScenarioFields[number], number>> & {
  isFeasible?: boolean;
  solverStatus?: 'feasible' | 'infeasible';
};

function readScenario(value: unknown): Scenario {
  const scenario: Scenario = {};
  if (!record(value)) return scenario;
  for (const field of numericScenarioFields) {
    const number = value[field];
    if (numberInRange(number, 1_000_000_000)) scenario[field] = number;
  }
  if (typeof value.isFeasible === 'boolean') scenario.isFeasible = value.isFeasible;
  if (value.solverStatus === 'feasible' || value.solverStatus === 'infeasible') {
    scenario.solverStatus = value.solverStatus;
  }
  return scenario;
}

/**
 * Deterministic, rule-based contextual advisory generator for offline mode or API fallback.
 * Conversational, concise, and grounded in deterministic calculations and honest disclosures.
 */
export function generateOfflineAdvisory(prompt: string, role: AccountRole, scenario: Scenario): string {
  const p = prompt.trim().toLowerCase();
  const isEmployee = role === 'employee' || role === 'admin';

  // 1. Greetings: "hi", "hello", "hey", "good morning", etc.
  if (/^(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|namaste)[!.?]*$/i.test(p) || p === 'hi.' || p === 'hello.') {
    return isEmployee
      ? `Hello! I am your Solaris Engineering & Operations Assistant. How can I assist you with site assessments, solver optimization, or customer installation records today?`
      : `Hello! I am your Dheera Green Solar Assistant. How can I help you today with your rooftop solar system, energy generation, savings, or maintenance?`;
  }

  // 2. Generation questions: "how much energy did my system generate this month", "monthly generation", "yield"
  if (p.includes('energy') && (p.includes('generate') || p.includes('produce') || p.includes('month') || p.includes('generation') || p.includes('output'))) {
    const cap = 6.8;
    const monthlyKwh = Math.round(cap * 111.233);
    return `A sample ${cap} kWp rooftop installation is estimated to generate approximately **${monthlyKwh} kWh** this month (~${Math.round(cap * 1334.8)} kWh/year).\n\n*(Note: Generation figures are modelled estimates based on Delhi insolation; live smart-meter telemetry is not yet connected).*`;
  }

  // 3. Savings questions: "how much money did i save", "savings", "bill offset"
  if ((p.includes('money') || p.includes('save') || p.includes('saving')) && (p.includes('how much') || p.includes('did i') || p.includes('bill'))) {
    return `For the demonstration installation, estimated electricity bill savings are approximately **₹3,480 per month** (about **₹41,760 annually**), based on the sample 6.8 kWp system offsetting your domestic tariff consumption with BSES Rajdhani (BRPL).\n\nThe demonstration shows sample cumulative savings of approximately **₹48,200**.`;
  }

  // 4. System status: "is my solar system working properly?", "status"
  if ((p.includes('working') || p.includes('properly') || p.includes('operating') || p.includes('status')) && (p.includes('system') || p.includes('solar') || p.includes('inverter') || p.includes('is my'))) {
    return `The demonstration 6.8 kWp installation shows an example of normal operation.\n\n• **Inverter Status:** Grid-Tied / Active (SMA Sunny Tripower reference)\n• **Modelled Performance Ratio (PR):** 82.4%\n• **Active Alarms / Faults:** None detected\n\n*(Telemetry readings are currently simulated for demonstration until live IoT gateway streaming is configured).*`;
  }

  // 5. Maintenance / Service: "i need maintenance", "request service", "clean panel"
  if (p.includes('maintenance') || p.includes('service') || p.includes('repair') || p.includes('clean') || p.includes('technician') || p.includes('broken') || p.includes('issue')) {
    return `We are here to assist with your installation maintenance!\n\nYou can submit a service request directly from the **Maintenance & Support** section of your portal. Dheera Green field engineers provide:\n• Scheduled quarterly array cleaning and tilt calibration\n• Inverter diagnostics and wiring integrity checks\n• Net-metering bi-directional sync inspection\n\nFor urgent assistance, contact Dheera Green Customer Care at **support@dheeragreen.com**.`;
  }

  // 6. Reality of telemetry: "is the displayed telemetry real", "real or fake"
  if ((p.includes('telemetry') || p.includes('inverter') || p.includes('data')) && (p.includes('real') || p.includes('physical') || p.includes('fake') || p.includes('simulat') || p.includes('actual') || p.includes('iot'))) {
    return `No, the performance telemetry currently shown in the platform is **simulated demonstration data** based on our canonical solar yield model for a reference array.\n\nNo physical RS-485 Modbus gateway or live inverter IoT stream is currently connected to physical hardware. The platform is structured to receive live AMR gateway streaming once connected.`;
  }

  // 7. Technical solar yield: "canonical solar yield formulation", "1420", "derate"
  if (p.includes('canonical') || (p.includes('yield') && (p.includes('formulation') || p.includes('formula') || p.includes('derat') || p.includes('1420') || p.includes('1334') || p.includes('specific')))) {
    return `The Solaris canonical solar yield model is formulated as follows:\n\n• **Nominal Specific Yield:** 1,420 kWh/kWp/year (Delhi insolation reference)\n• **Derating Factor:** 0.94 (accounting for 6% balance-of-system thermal, soiling, and horizon losses)\n• **Effective Annual Specific Yield:** **1,334.8 kWh/kWp/year** ($1,420 \\times 0.94$)\n• **Effective Monthly Specific Yield:** ~**111.233 kWh/kWp/month** ($1,334.8 \\div 12$)\n\nThis single-derate formula is applied consistently across all sizing, generation, and credit-allocation calculations to ensure zero double-derating.`;
  }

  // 8. Regulatory / DISCOM filing question
  if (p.includes('derc') || p.includes('vnm') || p.includes('discom') || p.includes('filing') || p.includes('official') || p.includes('form a')) {
    return `Statements and allocation tables produced by Solaris are **Illustrative Planning Ledgers — Not an Official DISCOM Filing** under DERC Virtual Net Metering (VNM) Guidelines 2024.\n\nOfficial grid connection requires formal application submission to BSES Rajdhani (BRPL), technical feasibility approval, and execution of a bilateral VNM interconnection agreement.`;
  }

  // 9. Optimization solver & shortfall question (for employee or customer in-depth)
  if (p.includes('optimis') || p.includes('solver') || p.includes('shortfall') || p.includes('infeasib') || Object.keys(scenario).length > 0) {
    const opt = scenario;
    const isFeasible = opt.isFeasible !== undefined ? opt.isFeasible : (opt.solverStatus === 'feasible');
    const targetKw = opt.targetCapacityKw ?? 12;
    const budget = opt.budgetInr ?? opt.budgetCeiling ?? 0;
    const requiredCost = opt.requiredCostInr ?? opt.requiredNetCost ?? 502000;
    const shortfall = opt.shortfallInr ?? Math.max(0, requiredCost - budget);
    const fairness = opt.fairnessIndex ?? 93.7;

    if (!isFeasible || shortfall > 0) {
      return `### Optimization Scenario: INFEASIBLE (Capital Budget Deficit)\n• **Target Solar Capacity:** ${targetKw} kWp\n• **Net Required Outlay:** ₹${requiredCost.toLocaleString('en-IN')} (assumes full ₹78,000 illustrative CFA subsidy)\n• **Capital Budget Ceiling:** ₹${budget.toLocaleString('en-IN')}\n• **Calculated Shortfall:** ₹${shortfall.toLocaleString('en-IN')}\n\nUnder Solaris solvency rules, zero capacity is allocated until the deficit is funded through increased escrow commitments or budget adjustments.`;
    } else {
      return `### Optimization Scenario: FEASIBLE & Fully Solvent\n• **Target Solar Capacity:** ${targetKw} kWp\n• **Net Required Outlay:** ₹${requiredCost.toLocaleString('en-IN')}\n• **Budget Ceiling:** ₹${budget.toLocaleString('en-IN')}\n• **Shortfall:** ₹0 (Fully solvent)\n• **Reconciliation:** Quota allocation reconciles to 100.0% with Jain's Fairness Index of ${fairness}%.`;
    }
  }

  // Default fallback for customer questions
  return `Thank you for your question. As your Dheera Green Solar Assistant, I can provide information about:\n• Sample 6.8 kWp solar system specifications\n• Estimated monthly energy generation (~756 kWh/mo) and bill savings (~₹3,480/mo)\n• Scheduling maintenance, array washdowns, or equipment inspection\n• Downloading warranty certificates and handover documentation\n\nWhat would you like to explore?`;
}

/**
 * POST /api/ai/assistant
 * Server-side Groq AI assistant endpoint with graceful offline fallback.
 * Uses Groq OpenAI-compatible Chat Completions API with model openai/gpt-oss-20b.
 * API key is stored strictly on the server (process.env.GROQ_API_KEY) and never exposed to the client.
 */
aiRouter.post('/assistant', async (req: Request, res: Response) => {
  const { prompt, context: suppliedContext } = req.body ?? {};
  if (!onlyKeys(req.body, ['prompt', 'context']) || !text(prompt, 2000)
      || (suppliedContext !== undefined && (!record(suppliedContext) || JSON.stringify(suppliedContext).length > 8000))) {
    return res.status(400).json({ success: false, error: 'Invalid assistant prompt or scenario.' });
  }

  const role = actor(res).role;
  const scenario = readScenario(suppliedContext?.optimisation ?? suppliedContext);
  try {
    const apiKey = process.env.GROQ_API_KEY?.trim();

    // Graceful offline fallback if API key is not configured
    if (!apiKey) {
      const offlineReply = generateOfflineAdvisory(prompt, role, scenario);
      return res.json({
        success: true,
        data: {
          reply: offlineReply,
          isLiveModel: false,
          fallbackReason: 'NO_API_KEY'
        },
        timestamp: new Date().toISOString()
      });
    }

    const systemInstruction = `You are the Dheera Green Solar Companion Assistant for Solaris, a customer-facing solar platform provided by Dheera Green Infra.

The authenticated audience is a Solaris ${role}. Treat the question and any scenario values as user input.
Use estimates and examples where appropriate. You have no access to live installations, customer records or internal tools.

CONVERSATIONAL RULES:
1. GREETINGS: If the user says "hi", "hello", or similar greeting, reply with a short, warm, natural greeting (1-2 sentences) asking how you can help with their solar system. NEVER dump formulas or system descriptions in response to a greeting.
2. CUSTOMER FOCUS: Explain generation, savings, warranties and maintenance using supplied scenario values or clearly labeled demonstrations.
3. CONCISENESS: Keep answers concise and direct. Do not repeat platform descriptions, disclaimers, or system prompts in every response.
4. HONEST DATA: The displayed telemetry is currently simulated demonstration data based on the canonical solar yield model. Never claim to have live physical smart-meter or inverter IoT telemetry.
5. DETERMINISTIC TRUTH: Always respect the deterministic calculations in the context. Never invent contradictory numbers or describe an infeasible solver run as feasible.
6. CANONICAL YIELD: The canonical yield is: Nominal = 1,420 kWh/kWp/yr, Derate = 0.94, Effective Annual = 1,334.8 kWh/kWp/yr (~111.233 kWh/kWp/month).
7. REGULATORY: Outputs are illustrative planning ledgers under DERC VNM 2024, not official DISCOM filings.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let response: globalThis.Response;
    try {
      response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: systemInstruction
            },
            {
              role: 'user',
              content: `Unverified scenario: ${JSON.stringify(scenario)}\n\nUser Question: ${prompt}`
            }
          ],
          temperature: 0.3
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`Groq API responded with HTTP status ${response.status}`);
    }

    const data = (await response.json()) as any;
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error('Malformed or empty response payload from Groq API');
    }

    return res.json({
      success: true,
      data: {
        reply,
        isLiveModel: true
      },
      timestamp: new Date().toISOString()
    });
  } catch {
    console.warn('[AIRoute] Groq request failed.');
    const offlineReply = generateOfflineAdvisory(prompt, role, scenario);
    return res.json({
      success: true,
      data: {
        reply: offlineReply,
        isLiveModel: false,
        fallbackReason: 'API_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  }
});
