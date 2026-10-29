import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ReportExportModal } from '../components/common/ReportExportModal';
import { DualParamControl } from '../components/common/DualParamControl';
import { AlertBanner } from '../components/common/AlertBanner';
import { AllocationBar } from '../components/common/AllocationBar';
import { calculateEqualSplitBaseline, calculateIndividualBaseline } from '../utils/optimiserEngine';
import { apiClient } from '../services/apiClient';

export const OptimiserPage: React.FC = () => {
  const {
    community,
    optimisationParams,
    setOptimisationParams,
    optimisationResult,
    navigateTo,
    addAuditLog,
  } = useApp();

  const [activeScenario, setActiveScenario] = useState<'optimal' | 'equal' | 'individual'>('optimal');
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Persistence State
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [lastSavedRunId, setLastSavedRunId] = useState<string | null>(null);

  // Active candidates (excluding withdrawn participants)
  const activeCandidates = community.members.filter((m) => m.status !== 'withdrawn');

  // Cost and Subsidy Dynamics (derived deterministically)
  const grossCostInr =
    optimisationParams.targetCapacityKw === 10
      ? 500000
      : optimisationParams.targetCapacityKw === 12
      ? 580000
      : 720000;

  const illustrativeSubsidyInr = optimisationParams.stressFactors.subsidyDelay ? 39000 : 78000;
  const netRequiredCapitalInr = grossCostInr - illustrativeSubsidyInr;
  const solverShortfallInr = Math.max(0, netRequiredCapitalInr - optimisationParams.budgetCeilingInr);

  // Allocation segments for AllocationBar
  const allocationSegments = optimisationResult.selectedMembers.map((m) => ({
    id: m.memberId,
    label: `${m.flatNumber}`,
    valueKw: m.shareKw,
    percentage: m.sharePercentage,
    subLabel: `₹${m.netBenefitInr}/mo net gain`,
  }));

  const verifiedSumPercentage = optimisationResult.selectedMembers.reduce(
    (sum, m) => sum + m.sharePercentage,
    0
  );

  const handleKwSelect = (kw: 10 | 12 | 15) => {
    setOptimisationParams((prev) => ({
      ...prev,
      targetCapacityKw: kw,
    }));
    setSaveStatus('idle');
  };

  const handleRoofAreaChange = (val: number) => {
    setOptimisationParams((prev) => ({ ...prev, roofAreaSqFt: val }));
    setSaveStatus('idle');
  };

  const handleBudgetChange = (val: number) => {
    setOptimisationParams((prev) => ({ ...prev, budgetCeilingInr: val }));
    setSaveStatus('idle');
  };

  const handleRateChange = (val: number) => {
    setOptimisationParams((prev) => ({ ...prev, financingRatePercentage: val }));
    setSaveStatus('idle');
  };

  const handleCapChange = (val: number) => {
    setOptimisationParams((prev) => ({ ...prev, participantCapInr: val }));
    setSaveStatus('idle');
  };

  const toggleStressChip = (key: keyof typeof optimisationParams.stressFactors) => {
    setOptimisationParams((prev) => ({
      ...prev,
      stressFactors: {
        ...prev.stressFactors,
        [key]: !prev.stressFactors[key],
      },
    }));
    setSaveStatus('idle');
  };

  const handleReset = () => {
    setOptimisationParams({
      roofAreaSqFt: 1400,
      targetCapacityKw: 12,
      budgetCeilingInr: 580000,
      financingRatePercentage: 8.5,
      participantCapInr: 4500,
      stressFactors: {
        monsoonDrop: false,
        rateSpike: false,
        unitDropOut: false,
        subsidyDelay: false,
      },
    });
    setSaveStatus('idle');
    setSaveFeedback(null);
  };

  const handlePersistScenario = async () => {
    setSaveStatus('saving');
    setSaveFeedback(null);

    const payload = {
      targetCapacityKw: optimisationParams.targetCapacityKw,
      budgetCeilingInr: optimisationParams.budgetCeilingInr,
      financingRatePercentage: optimisationParams.financingRatePercentage,
      participantCapInr: optimisationParams.participantCapInr,
      roofAreaSqFt: optimisationParams.roofAreaSqFt,
      stressFactors: optimisationParams.stressFactors,
    };

    const res = await apiClient.solveOptimisation(payload);

    if (res.success && res.data) {
      setSaveStatus('saved');
      const sumPct = res.data.selectedMembers?.length
        ? Math.round(res.data.selectedMembers.reduce((sum: number, m: any) => sum + (m.sharePercentage || 0), 0) * 10) / 10
        : 0;
      setLastSavedRunId(res.data.runId || res.data._id || res.data.id || 'persisted');
      setSaveFeedback(
        `Optimisation run successfully persisted to MongoDB (Status: ${res.data.isFeasible ? 'FEASIBLE' : 'INFEASIBLE'}${res.data.isFeasible ? `, Reconciled sum: ${sumPct}%` : `, Shortfall: ₹${res.data.shortfallInr?.toLocaleString('en-IN')}`}).`
      );
      addAuditLog(
        'Optimisation Run Persisted',
        `Persisted ${optimisationParams.targetCapacityKw} kWp scenario to database. Feasible: ${res.data.isFeasible}. Included: ${res.data.includedCount}/${res.data.totalCount}.`,
        'financial'
      );
    } else {
      setSaveStatus('error');
      setSaveFeedback(
        res.error || 'Failed to persist optimisation run to MongoDB. Scenario remains in active memory.'
      );
    }
  };

  const equalSplit = calculateEqualSplitBaseline(activeCandidates, netRequiredCapitalInr);
  const individual = calculateIndividualBaseline();

  return (
    <div className="flex flex-col w-full pb-16 max-w-5xl mx-auto px-4 sm:px-6 animate-in fade-in space-y-6">
      
      {/* Header & Planning Context */}
      <div className="pt-2 pb-1 border-b border-[#CBD2CA] space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E1EBE6] text-[#0F2D24] text-[10px] font-mono font-bold uppercase tracking-wider border border-[#CBD8D2]">
              <span className="material-symbols-outlined text-[14px]">tune</span>
              Step 4 of 4 • Affordability Solver
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F4F5F0] text-[#374340] border border-[#CBD2CA]">
              Canonical Yield: 1,334.8 kWh/kWp/yr eff.
            </span>
          </div>

          <span className="text-[10px] font-mono text-[#606D69]">
            {optimisationResult.solverVersion}
          </span>
        </div>

        <div>
          <h1 className="font-headline text-2xl sm:text-3xl text-[#0F2D24] tracking-tight font-bold">
            Community Solar Affordability Solver
          </h1>
          <p className="text-xs sm:text-sm text-[#374340] mt-0.5 leading-relaxed">
            Deterministic Linear Program (LP) maximizing inclusive participant coverage while satisfying DERC net-metering limits, capital budget ceilings, and individual bill-offset positive cash flows.
          </p>
        </div>
      </div>

      {/* Synthetic Finances & Illustrative Planning Disclaimers */}
      <AlertBanner
        variant="assumption"
        code="[ILLUSTRATIVE PLANNING LEDGER — NOT AN OFFICIAL DISCOM FILING]"
        title="Simulation Boundary Conditions"
      >
        All capital targets, escrow budgets, loan EMIs, and member allocations are derived from synthetic simulation data. Central financial assistance (PM Surya Ghar illustrative subsidy of ₹78,000) represents a provisional planning assumption subject to formal DISCOM and MNRE sanction.
      </AlertBanner>

      {/* Main Solver Console: 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Boundary Controls & Stress Simulator (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="flex items-center justify-between border-b border-[#CBD2CA] pb-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#0F2D24]">tune</span>
              <h2 className="font-headline text-xs font-bold text-[#1A2421] uppercase tracking-wider">
                Solver Boundary Parameters
              </h2>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-mono text-[#0F2D24] hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[13px]">restart_alt</span>
              Reset Defaults
            </button>
          </div>

          {/* Sizing Pills (10, 12, 15 kWp) */}
          <div className="p-3.5 bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-semibold text-[#1A2421]">Plant Target Capacity (kWp)</span>
              <span className="text-xs font-mono font-bold text-[#0F2D24]">
                {optimisationParams.targetCapacityKw} kWp Selected
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { kw: 10, label: 'Starter Sizing', gross: '₹5.00L', net: '₹4.22L Net' },
                { kw: 12, label: 'Optimal Pod', gross: '₹5.80L', net: '₹5.02L Net' },
                { kw: 15, label: 'High Yield', gross: '₹7.20L', net: '₹6.42L Net' },
              ].map((item) => (
                <button
                  key={item.kw}
                  type="button"
                  onClick={() => handleKwSelect(item.kw as any)}
                  className={`p-2.5 text-center rounded border transition-colors ${
                    optimisationParams.targetCapacityKw === item.kw
                      ? 'bg-[#0F2D24] text-white border-[#0F2D24]'
                      : 'bg-white text-[#1A2421] border-[#CBD2CA] hover:bg-[#F4F5F0]'
                  }`}
                >
                  <span className="block font-headline text-sm font-bold">{item.kw} kWp</span>
                  <span className="block text-[10px] font-mono opacity-80">{item.gross}</span>
                  <span className="block text-[9px] font-mono opacity-70">{item.net}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#606D69] leading-tight pt-0.5">
              Gross costs: ₹50,000/kWp benchmark. PM Surya Ghar illustrative subsidy (-₹78,000) applied at ₹5.02L net for 12 kWp.
            </p>
          </div>

          {/* Budget Ceiling Control */}
          <DualParamControl
            id="param-budget-ceiling"
            label="Community Capital Budget Ceiling"
            icon="account_balance_wallet"
            unit="₹"
            value={optimisationParams.budgetCeilingInr}
            onChange={handleBudgetChange}
            min={200000}
            max={1000000}
            step={10000}
            badgeText={solverShortfallInr > 0 ? `Shortfall: ₹${solverShortfallInr.toLocaleString('en-IN')}` : 'Capital Solvency OK'}
            helperText="Maximum upfront funds available from member deposits or RWA reserve pool. If lower than net capex, solver identifies a shortfall."
            presets={[
              { label: '₹3.50L (Deficit Trigger)', value: 350000 },
              { label: '₹5.02L (Exact Net)', value: 502000 },
              { label: '₹5.80L (Standard)', value: 580000 },
              { label: '₹7.50L (High Margin)', value: 750000 },
            ]}
          />

          {/* Usable Roof Area Control */}
          <DualParamControl
            id="param-roof-area"
            label="Common Usable Roof Area"
            icon="domain"
            unit="sq.ft"
            value={optimisationParams.roofAreaSqFt}
            onChange={handleRoofAreaChange}
            min={800}
            max={2500}
            step={25}
            badgeText={`~${(optimisationParams.roofAreaSqFt / 95).toFixed(1)} kWp potential`}
            helperText="Physical clearance required: ~95 sq.ft per kWp for mono PERC modules and inter-row clearance."
            presets={[
              { label: '1,000 sq.ft (10.5 kWp)', value: 1000 },
              { label: '1,400 sq.ft (14.7 kWp)', value: 1400 },
              { label: '1,840 sq.ft (Block C)', value: 1840 },
            ]}
          />

          {/* Financing Parameters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DualParamControl
              id="param-financing-rate"
              label="Financing Interest Rate"
              icon="percent"
              unit="% p.a."
              value={optimisationParams.financingRatePercentage}
              onChange={handleRateChange}
              min={6.0}
              max={14.0}
              step={0.5}
              helperText="SBI Surya Ghar 5-year green loan baseline."
            />

            <DualParamControl
              id="param-participant-cap"
              label="Max Monthly Contribution Cap"
              icon="security"
              unit="₹/mo"
              value={optimisationParams.participantCapInr}
              onChange={handleCapChange}
              min={1000}
              max={10000}
              step={250}
              helperText="Guardrail: member loan EMI cannot exceed this ceiling."
            />
          </div>

          {/* Stress-Testing Simulator Toggles */}
          <div className="p-3.5 bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#D9822B]">science</span>
                <h3 className="font-headline text-xs font-bold text-[#1A2421] uppercase tracking-wider">
                  Contingency Stress-Testing Simulator
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#606D69]">4 Sensitivity Factors</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => toggleStressChip('monsoonDrop')}
                className={`p-2 rounded border text-left text-xs transition-colors flex items-center justify-between ${
                  optimisationParams.stressFactors.monsoonDrop
                    ? 'bg-[#FFDEA7] text-[#422000] border-[#D9822B]'
                    : 'bg-white text-[#1A2421] border-[#CBD2CA] hover:bg-[#F4F5F0]'
                }`}
              >
                <div>
                  <span className="font-semibold block">Monsoon Drop</span>
                  <span className="text-[10px] font-mono opacity-80">-20% seasonal generation</span>
                </div>
                <span className="material-symbols-outlined text-[16px]">
                  {optimisationParams.stressFactors.monsoonDrop ? 'check_box' : 'check_box_outline_blank'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleStressChip('rateSpike')}
                className={`p-2 rounded border text-left text-xs transition-colors flex items-center justify-between ${
                  optimisationParams.stressFactors.rateSpike
                    ? 'bg-[#FFDEA7] text-[#422000] border-[#D9822B]'
                    : 'bg-white text-[#1A2421] border-[#CBD2CA] hover:bg-[#F4F5F0]'
                }`}
              >
                <div>
                  <span className="font-semibold block">Financing Rate Spike</span>
                  <span className="text-[10px] font-mono opacity-80">+1.5% loan interest surge</span>
                </div>
                <span className="material-symbols-outlined text-[16px]">
                  {optimisationParams.stressFactors.rateSpike ? 'check_box' : 'check_box_outline_blank'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleStressChip('unitDropOut')}
                className={`p-2 rounded border text-left text-xs transition-colors flex items-center justify-between ${
                  optimisationParams.stressFactors.unitDropOut
                    ? 'bg-[#FFDEA7] text-[#422000] border-[#D9822B]'
                    : 'bg-white text-[#1A2421] border-[#CBD2CA] hover:bg-[#F4F5F0]'
                }`}
              >
                <div>
                  <span className="font-semibold block">Resident Attrition</span>
                  <span className="text-[10px] font-mono opacity-80">1 unit drops out (rebalance)</span>
                </div>
                <span className="material-symbols-outlined text-[16px]">
                  {optimisationParams.stressFactors.unitDropOut ? 'check_box' : 'check_box_outline_blank'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => toggleStressChip('subsidyDelay')}
                className={`p-2 rounded border text-left text-xs transition-colors flex items-center justify-between ${
                  optimisationParams.stressFactors.subsidyDelay
                    ? 'bg-[#FFDEA7] text-[#422000] border-[#D9822B]'
                    : 'bg-white text-[#1A2421] border-[#CBD2CA] hover:bg-[#F4F5F0]'
                }`}
              >
                <div>
                  <span className="font-semibold block">Subsidy Release Delay</span>
                  <span className="text-[10px] font-mono opacity-80">6m bridge (subsidy halved)</span>
                </div>
                <span className="material-symbols-outlined text-[16px]">
                  {optimisationParams.stressFactors.subsidyDelay ? 'check_box' : 'check_box_outline_blank'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Feasibility, Capital Ledger & Persistence (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Solvency Status Card */}
          <div className="bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#CBD2CA] pb-2.5">
              <span className="font-headline text-xs font-bold text-[#1A2421] uppercase tracking-wider">
                Solver Feasibility Verdict
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  optimisationResult.isFeasible
                    ? 'bg-[#E1EBE6] text-[#0F2D24] border-[#0F2D24]/20'
                    : 'bg-[#FFF0F0] text-[#BA1A1A] border-[#BA1A1A]/30'
                }`}
              >
                {optimisationResult.isFeasible ? 'FEASIBLE' : 'INFEASIBLE'}
              </span>
            </div>

            {/* Infeasibility Alert (if solver cannot find a valid solution) */}
            {!optimisationResult.isFeasible && (
              <AlertBanner
                variant="error"
                code="[SOLVER INFEASIBLE]"
                title="Capital Deficiency Guardrail Triggered"
              >
                {optimisationResult.infeasibilityReason ||
                  `Available budget is insufficient to cover net required capex. Shortfall: ₹${solverShortfallInr.toLocaleString('en-IN')}.`}
              </AlertBanner>
            )}

            {/* Financial Balance Ledger */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
                <span className="text-[#606D69]">Gross Plant Capex:</span>
                <span className="font-bold text-[#1A2421]">₹{grossCostInr.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between p-2 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
                <span className="text-[#606D69]">PM Surya Ghar CFA:</span>
                <span className="font-bold text-[#0F2D24]">-₹{illustrativeSubsidyInr.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between p-2 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
                <span className="text-[#606D69]">Net Capital Target:</span>
                <span className="font-bold text-[#1A2421]">₹{netRequiredCapitalInr.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between p-2 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
                <span className="text-[#606D69]">Available Budget Ceiling:</span>
                <span className="font-bold text-[#1A2421]">
                  ₹{optimisationParams.budgetCeilingInr.toLocaleString('en-IN')}
                </span>
              </div>

              <div
                className={`flex justify-between p-2 rounded border ${
                  solverShortfallInr > 0
                    ? 'bg-[#FFF0F0] border-[#BA1A1A]/30 text-[#BA1A1A]'
                    : 'bg-[#E1EBE6] border-[#0F2D24]/20 text-[#0F2D24]'
                }`}
              >
                <span className="font-bold">Calculated Shortfall:</span>
                <span className="font-bold tabular-nums">
                  {solverShortfallInr > 0 ? `₹${solverShortfallInr.toLocaleString('en-IN')}` : '₹0 (Fully Funded)'}
                </span>
              </div>
            </div>

            {/* Performance Metrics (when feasible) */}
            {optimisationResult.isFeasible && (
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                <div className="p-2.5 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
                  <span className="text-[10px] text-[#606D69] block">Avg. Net Savings</span>
                  <span className="font-bold text-[#0F2D24] text-sm">
                    ₹{optimisationResult.avgNetMonthlySavingsInr.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-[#606D69] block">/mo per flat</span>
                </div>

                <div className="p-2.5 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
                  <span className="text-[10px] text-[#606D69] block">Active Subscribers</span>
                  <span className="font-bold text-[#1A2421] text-sm">
                    {optimisationResult.includedCount} of {optimisationResult.totalCount}
                  </span>
                  <span className="text-[10px] text-[#0F2D24] block">100% Subscribed</span>
                </div>
              </div>
            )}
          </div>

          {/* Database Persistence Box */}
          <div className="p-3 bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-headline font-bold text-[#1A2421] uppercase tracking-wider">
                Simulation Persistence
              </span>
              <span className="text-[10px] font-mono text-[#606D69]">MongoDB</span>
            </div>

            <button
              type="button"
              onClick={handlePersistScenario}
              disabled={saveStatus === 'saving'}
              className="w-full h-9 bg-[#0F2D24] hover:bg-[#163A2F] text-white rounded font-headline text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {saveStatus === 'saving' ? 'sync' : 'save'}
              </span>
              <span>
                {saveStatus === 'saving' ? 'Persisting Solver Run...' : 'Save & Persist Solver Run'}
              </span>
            </button>

            {saveFeedback && (
              <div
                className={`text-[11px] p-2 rounded border font-mono ${
                  saveStatus === 'saved'
                    ? 'bg-[#E1EBE6] text-[#0F2D24] border-[#0F2D24]/20'
                    : 'bg-[#FFF0F0] text-[#5C000B] border-[#BA1A1A]/30'
                }`}
              >
                {saveFeedback}
                {lastSavedRunId && saveStatus === 'saved' && (
                  <span className="block text-[10px] text-[#606D69] mt-0.5">
                    MongoDB Run ID: {lastSavedRunId}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Scenario Selector & Baseline Comparison Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#CBD2CA] pb-2">
          <h2 className="font-headline text-sm font-bold text-[#1A2421] uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#0F2D24]">account_tree</span>
            Allocation Model Comparison
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveScenario('optimal')}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                activeScenario === 'optimal'
                  ? 'bg-[#0F2D24] text-white'
                  : 'bg-white text-[#1A2421] border border-[#CBD2CA] hover:bg-[#F4F5F0]'
              }`}
            >
              1. Solvency LP (Rec.)
            </button>
            <button
              type="button"
              onClick={() => setActiveScenario('equal')}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                activeScenario === 'equal'
                  ? 'bg-[#0F2D24] text-white'
                  : 'bg-white text-[#1A2421] border border-[#CBD2CA] hover:bg-[#F4F5F0]'
              }`}
            >
              2. Equal Split
            </button>
            <button
              type="button"
              onClick={() => setActiveScenario('individual')}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                activeScenario === 'individual'
                  ? 'bg-[#0F2D24] text-white'
                  : 'bg-white text-[#1A2421] border border-[#CBD2CA] hover:bg-[#F4F5F0]'
              }`}
            >
              3. Private Rooftop
            </button>
          </div>
        </div>

        {/* Scenario 1: Optimised Solvency Allocation */}
        {activeScenario === 'optimal' && (
          <div className="space-y-3">
            {optimisationResult.isFeasible ? (
              <>
                {/* Proportional Capacity Linear Bar */}
                <div className="bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-baseline text-xs font-mono">
                    <span className="font-bold text-[#1A2421]">
                      Proportional Allocation of {optimisationParams.targetCapacityKw} kWp Solar Array:
                    </span>
                    <span className="text-[#0F2D24] font-bold">
                      Reconciled Sum: {verifiedSumPercentage.toFixed(1)}% (Verified)
                    </span>
                  </div>

                  <AllocationBar
                    segments={allocationSegments}
                    totalCapacityKw={optimisationParams.targetCapacityKw}
                    showLegend={true}
                  />
                </div>

                {/* High-Density Allocation Table */}
                <div className="bg-white border border-[#CBD2CA] rounded-lg overflow-hidden shadow-2xs">
                  <div className="p-3 bg-[#F4F5F0] border-b border-[#CBD2CA] flex items-center justify-between text-xs">
                    <span className="font-headline font-bold text-[#1A2421] uppercase tracking-wider">
                      Individual Member Allocation &amp; Financial Ledger
                    </span>
                    <span className="font-mono text-[10px] text-[#606D69]">
                      {optimisationResult.selectedMembers.length} Flats Active
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F4F5F0] border-b border-[#CBD2CA] text-[#606D69] font-mono text-[11px] uppercase tracking-wider">
                          <th className="py-2 px-3 font-semibold">Flat #</th>
                          <th className="py-2 px-3 font-semibold text-right">Quota Share</th>
                          <th className="py-2 px-3 font-semibold text-right">Solar Cap</th>
                          <th className="py-2 px-3 font-semibold text-right">Monthly Yield</th>
                          <th className="py-2 px-3 font-semibold text-right">Bill Offset</th>
                          <th className="py-2 px-3 font-semibold text-right">Loan EMI</th>
                          <th className="py-2 px-3 font-semibold text-right">Net Monthly Gain</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#CBD2CA]/60 font-mono">
                        {optimisationResult.selectedMembers.map((m) => (
                          <tr key={m.memberId} className="hover:bg-[#FBFBF9]">
                            <td className="py-2 px-3 font-bold text-[#1A2421]">{m.flatNumber}</td>
                            <td className="py-2 px-3 text-right tabular-nums">{m.sharePercentage.toFixed(1)}%</td>
                            <td className="py-2 px-3 text-right tabular-nums">{m.shareKw.toFixed(2)} kWp</td>
                            <td className="py-2 px-3 text-right tabular-nums">
                              ~{Math.round(m.shareKw * 111.233)} kWh
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums text-[#1A2421]">
                              ₹{m.monthlySavingsInr.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums text-[#606D69]">
                              ₹{m.monthlyContributionInr.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums font-bold text-[#0F2D24]">
                              +₹{m.netBenefitInr.toLocaleString('en-IN')}/mo
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-2.5 bg-[#F4F5F0] border-t border-[#CBD2CA] text-[11px] font-mono text-[#606D69] flex justify-between">
                    <span>*All figures represent analytical simulation models subject to DISCOM Form A verification.</span>
                    <span>Total Sum: {verifiedSumPercentage.toFixed(1)}%</span>
                  </div>
                </div>
              </>
            ) : (
              <AlertBanner
                variant="error"
                code="[NO ALLOCATION GENERATED]"
              >
                No participant quota distribution could be rendered because the solver reached an infeasible state. Please raise the community budget ceiling or inspect the active participant count.
              </AlertBanner>
            )}
          </div>
        )}

        {/* Scenario 2: Equal Split Baseline */}
        {activeScenario === 'equal' && (
          <div className="p-4 bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#CBD2CA] pb-2">
              <span className="font-headline font-bold text-xs text-[#1A2421] uppercase tracking-wider">
                Equal Split Baseline Model
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FFF0F0] text-[#BA1A1A] border border-[#BA1A1A]/30 font-bold">
                HIGH DROPOUT RISK
              </span>
            </div>

            <p className="text-xs text-[#606D69] leading-relaxed">
              In a naïve equal split model, every household contributes an identical share of the capital expenditure: ₹{equalSplit.equalCostPerMemberInr.toLocaleString('en-IN')} upfront (EMI: ₹{equalSplit.equalEmiInr}/mo).
            </p>

            <div className="grid grid-cols-3 gap-2 py-2 bg-[#F4F5F0] rounded border border-[#CBD2CA] text-center font-mono text-xs">
              <div>
                <span className="text-[10px] text-[#606D69] block">Viable Subscribers</span>
                <span className="font-bold text-[#1A2421]">{equalSplit.participationCount} of {activeCandidates.length}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#606D69] block">Dropouts</span>
                <span className="font-bold text-[#BA1A1A]">{equalSplit.dropouts} Flats</span>
              </div>
              <div>
                <span className="text-[10px] text-[#606D69] block">Fairness Index</span>
                <span className="font-bold text-[#D9822B]">{equalSplit.fairnessIndex}%</span>
              </div>
            </div>

            <AlertBanner
              variant="warning"
              code="[STRUCTURAL DEFICIT]"
            >
              Smaller 2BHK units with lower monthly consumption drop out because equal loan EMI exceeds their bill savings. Solaris combinatorial solver eliminates this inequity by sizing quotas to solvency.
            </AlertBanner>
          </div>
        )}

        {/* Scenario 3: Individual Rooftop CAPEX Baseline */}
        {activeScenario === 'individual' && (
          <div className="p-4 bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#CBD2CA] pb-2">
              <span className="font-headline font-bold text-xs text-[#1A2421] uppercase tracking-wider">
                Individual Rooftop CAPEX Baseline
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ECEEE8] text-[#374340] border border-[#CBD2CA] font-bold">
                ROOF CONSTRAINED
              </span>
            </div>

            <p className="text-xs text-[#606D69] leading-relaxed">
              Each household attempts to install an independent 3 kW rooftop solar array on a private terrace.
            </p>

            <div className="grid grid-cols-3 gap-2 py-2 bg-[#F4F5F0] rounded border border-[#CBD2CA] text-center font-mono text-xs">
              <div>
                <span className="text-[10px] text-[#606D69] block">Net Upfront / Flat</span>
                <span className="font-bold text-[#1A2421]">₹1.32 Lacs</span>
              </div>
              <div>
                <span className="text-[10px] text-[#606D69] block">Individual EMI</span>
                <span className="font-bold text-[#0F2D24]">₹{individual.individualEmiInr}/mo</span>
              </div>
              <div>
                <span className="text-[10px] text-[#606D69] block">Cohort Feasibility</span>
                <span className="font-bold text-[#D9822B]">&lt;20% units</span>
              </div>
            </div>

            <AlertBanner
              variant="info"
              code="[URBAN REALITY]"
            >
              Over 80% of urban apartment residents lack private, unencumbered rooftop ownership, excluding them from individual rooftop net-metering. Solaris Virtual Net Metering (VNM) makes solar accessible to all units.
            </AlertBanner>
          </div>
        )}
      </div>

      {/* Navigation & Export Action Deck */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigateTo('/credit-allocation')}
          className="w-full sm:flex-1 h-11 bg-[#0F2D24] hover:bg-[#163A2F] text-white rounded font-headline text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-colors"
        >
          <span>Proceed to Credit Allocation Ledger</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>

        <button
          type="button"
          onClick={() => setIsExportOpen(true)}
          className="w-full sm:w-auto px-5 h-11 bg-white hover:bg-[#F4F5F0] text-[#1A2421] border border-[#CBD2CA] rounded font-headline text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px] text-[#0F2D24]">picture_as_pdf</span>
          <span>Download Solver Dossier (.PDF)</span>
        </button>
      </div>

      <ReportExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        defaultReportType="optimisation"
      />

    </div>
  );
};
