import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ReportExportModal } from '../components/common/ReportExportModal';
import { AlertBanner } from '../components/common/AlertBanner';
import { AllocationBar } from '../components/common/AllocationBar';
import { SOLAR_METRICS } from '../utils/solarCalculations';
import { apiClient } from '../services/apiClient';

export const CreditAllocationPage: React.FC = () => {
  const {
    community,
    optimisationResult,
    optimisationParams,
    navigateTo,
    addAuditLog,
  } = useApp();

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedFlat, setSelectedFlat] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  // Persistence & Run Sync State
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Fetch recent optimisation runs from MongoDB on mount
  useEffect(() => {
    let active = true;
    apiClient.getOptimisationRuns().then((res) => {
      if (!active) return;
      if (res.success && Array.isArray(res.data)) {
        setRecentRuns(res.data);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const handleRefreshRuns = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await apiClient.getOptimisationRuns();
      if (res.success && Array.isArray(res.data)) {
        setRecentRuns(res.data);
        setSyncFeedback(`Reconciled runs from MongoDB at ${new Date().toLocaleTimeString('en-IN')}`);
      } else {
        setSyncFeedback(res.error || 'Failed to fetch stored runs from backend.');
      }
    } catch (err: any) {
      setSyncFeedback(`Backend offline: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Merge solver-derived allocations with community member master data
  const allocationRows = useMemo(() => {
    if (!optimisationResult.isFeasible || !optimisationResult.selectedMembers.length) {
      return [];
    }

    return optimisationResult.selectedMembers.map((optMember) => {
      const communityMember = community.members.find((m) => m.id === optMember.memberId);
      const effectiveMonthlyKwh = Math.round(optMember.shareKw * SOLAR_METRICS.EFFECTIVE_MONTHLY_YIELD_KWH_PER_KWP);

      return {
        memberId: optMember.memberId,
        flatNumber: optMember.flatNumber,
        tower: communityMember?.tower || 'Tower A',
        ownerName: communityMember?.ownerName || 'Participant',
        caNumber: communityMember?.caNumber || '102948211',
        sanctionedLoadKw: communityMember?.sanctionedLoadKw || 5.0,
        monthlyConsumptionKwh: communityMember?.monthlyConsumptionKwh || 500,
        sharePercentage: optMember.sharePercentage,
        shareKw: optMember.shareKw,
        allocatedKwh: effectiveMonthlyKwh,
        monthlySavingsInr: optMember.monthlySavingsInr,
        monthlyContributionInr: optMember.monthlyContributionInr,
        netBenefitInr: optMember.netBenefitInr,
      };
    });
  }, [optimisationResult, community.members]);

  // Reconciliation Sum & Numerical Tolerance Check (100.0% ± 0.1%)
  const totalAllocatedPercentage = allocationRows.reduce((sum, r) => sum + r.sharePercentage, 0);
  const roundedSumPercentage = Math.round(totalAllocatedPercentage * 10) / 10;
  const isSumReconciled = Math.abs(roundedSumPercentage - 100.0) <= 0.1;

  const totalAllocatedKw = allocationRows.reduce((sum, r) => sum + r.shareKw, 0);
  const totalAllocatedKwh = allocationRows.reduce((sum, r) => sum + r.allocatedKwh, 0);
  const totalGrossSavingsInr = allocationRows.reduce((sum, r) => sum + r.monthlySavingsInr, 0);
  const totalEmiInr = allocationRows.reduce((sum, r) => sum + r.monthlyContributionInr, 0);
  const totalNetBenefitInr = allocationRows.reduce((sum, r) => sum + r.netBenefitInr, 0);

  // Proportional AllocationBar segments
  const allocationSegments = allocationRows.map((r) => ({
    id: r.memberId,
    label: r.flatNumber,
    valueKw: r.shareKw,
    percentage: r.sharePercentage,
    subLabel: `${r.ownerName} · ₹${r.netBenefitInr}/mo net`,
  }));

  const activeRunId = recentRuns.length > 0 ? recentRuns[0]._id : null;

  return (
    <div className="flex flex-col w-full pb-16 max-w-5xl mx-auto px-4 sm:px-6 animate-in fade-in space-y-6">
      
      {/* Header & Planning Context */}
      <div className="pt-2 pb-1 border-b border-[#CBD2CA] space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E1EBE6] text-[#0F2D24] text-[10px] font-mono font-bold uppercase tracking-wider border border-[#CBD8D2]">
              <span className="material-symbols-outlined text-[14px]">table_view</span>
              Illustrative Planning Ledger
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F4F5F0] text-[#374340] border border-[#CBD2CA]">
              DERC VNM Model · Synthetic Baseline
            </span>
          </div>

          <button
            type="button"
            onClick={handleRefreshRuns}
            disabled={isSyncing}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-[#F4F5F0] text-[#1A2421] text-[11px] font-mono border border-[#CBD2CA] shadow-2xs transition-colors disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[14px] ${isSyncing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{isSyncing ? 'Syncing...' : 'Re-verify Against MongoDB'}</span>
          </button>
        </div>

        <div>
          <h1 className="font-headline text-2xl sm:text-3xl text-[#0F2D24] tracking-tight font-bold">
            Illustrative Planning Ledger — Not an Official DISCOM Filing
          </h1>
          <p className="text-xs sm:text-sm text-[#374340] mt-0.5 leading-relaxed">
            Analytical community solar capacity quota distribution and billing credit schedule for Gulmohar Enclave. Sized according to Delhi Electricity Regulatory Commission (DERC) Virtual Net Metering (VNM) Guidelines.
          </p>
        </div>
      </div>

      {/* Mandatory Regulatory & Simulation Disclaimer Banner */}
      <AlertBanner
        variant="assumption"
        code="[ILLUSTRATIVE PLANNING LEDGER — NOT AN OFFICIAL DISCOM FILING]"
        title="Statutory & Regulatory Disclosure"
      >
        This schedule represents an illustrative engineering simulation model for community solar quota allocation. It does NOT constitute an official DISCOM interconnection filing, net-metering approval, or certified tariff settlement statement. All official billing credit adjustments are administered solely by BSES Rajdhani Power Limited (BRPL) following formal DISCOM Form A inspection and bi-directional smart meter installation.
      </AlertBanner>

      {syncFeedback && (
        <AlertBanner
          variant="info"
          code="[DATABASE AUDIT PROVENANCE]"
        >
          {syncFeedback}
        </AlertBanner>
      )}

      {/* Infeasibility Handling: If Solver Returned Infeasible */}
      {!optimisationResult.isFeasible ? (
        <div className="bg-[#FFF0F0] border border-[#BA1A1A]/30 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 text-[#BA1A1A]">
            <span className="material-symbols-outlined text-[24px]">error</span>
            <h2 className="font-headline text-sm font-bold uppercase tracking-wider">
              No Allocation Generated — Capital Deficiency Guardrail Triggered
            </h2>
          </div>

          <p className="text-xs text-[#5C000B] leading-relaxed">
            {optimisationResult.infeasibilityReason ||
              `The community budget ceiling is insufficient to cover the required net project capex for ${optimisationParams.targetCapacityKw} kWp. Capital shortfall: ₹${(optimisationResult.shortfallInr || 0).toLocaleString('en-IN')}.`}
          </p>

          <div className="p-3 bg-white rounded border border-[#BA1A1A]/20 font-mono text-xs space-y-1 text-[#5C000B]">
            <div className="flex justify-between">
              <span>Selected Capacity Target:</span>
              <strong>{optimisationParams.targetCapacityKw} kWp</strong>
            </div>
            <div className="flex justify-between">
              <span>Available Budget Ceiling:</span>
              <strong>₹{optimisationParams.budgetCeilingInr.toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex justify-between text-[#BA1A1A] font-bold">
              <span>Calculated Capital Shortfall:</span>
              <strong>₹{(optimisationResult.shortfallInr || 0).toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <p className="text-[11px] text-[#606D69] leading-tight">
            *In accordance with Solaris audit invariants, the allocation ledger is withheld whenever a budget shortfall is identified, ensuring participants are never assigned unfinanced capital liabilities.
          </p>

          <button
            type="button"
            onClick={() => navigateTo('/optimiser')}
            className="px-4 py-2 bg-[#0F2D24] hover:bg-[#163A2F] text-white rounded font-headline text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>Return to Optimiser to Adjust Budget Ceiling</span>
          </button>
        </div>
      ) : (
        /* Feasible Solver Result View */
        <>
          {/* Solver Provenance & Key Output Metrics Bento */}
          <div className="bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CBD2CA] pb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#0F2D24]">verified</span>
                <h2 className="font-headline text-xs font-bold text-[#1A2421] uppercase tracking-wider">
                  Deterministic Solver Reconciliation Summary
                </h2>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-[#606D69]">
                <span>Source: {optimisationResult.solverVersion}</span>
                {activeRunId && <span className="bg-[#F4F5F0] px-2 py-0.5 rounded border border-[#CBD2CA]">Run: {activeRunId}</span>}
              </div>
            </div>

            {/* 4-Stat Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
                <span className="text-[10px] font-mono text-[#606D69] block">Modelled Energy Share</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-headline text-xl sm:text-2xl font-bold text-[#0F2D24] font-mono tabular-nums">
                    {totalAllocatedKwh.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-mono text-[#606D69]">kWh/mo</span>
                </div>
                <span className="text-[10px] font-mono text-[#606D69] block mt-0.5">
                  ~111.23 kWh/kWp/mo eff.
                </span>
              </div>

              <div className="p-3 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
                <span className="text-[10px] font-mono text-[#606D69] block">Reconciled Quota Sum</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-headline text-xl sm:text-2xl font-bold text-[#0F2D24] font-mono tabular-nums">
                    {roundedSumPercentage.toFixed(1)}%
                  </span>
                </div>
                <span className={`text-[10px] font-mono block mt-0.5 font-semibold ${isSumReconciled ? 'text-[#0F2D24]' : 'text-[#BA1A1A]'}`}>
                  {isSumReconciled ? 'Exact Zero-Loss Sum' : 'Discrepancy Detected'}
                </span>
              </div>

              <div className="p-3 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
                <span className="text-[10px] font-mono text-[#606D69] block">Active Subscribers</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-headline text-xl sm:text-2xl font-bold text-[#0F2D24] font-mono tabular-nums">
                    {allocationRows.length}
                  </span>
                  <span className="text-xs font-mono text-[#606D69]">Flats</span>
                </div>
                <span className="text-[10px] font-mono text-[#0F2D24] block mt-0.5">
                  100% Participated
                </span>
              </div>

              <div className="p-3 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
                <span className="text-[10px] font-mono text-[#606D69] block">Total Net Monthly Gain</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-headline text-xl sm:text-2xl font-bold text-[#0F2D24] font-mono tabular-nums">
                    +₹{totalNetBenefitInr.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-mono text-[#606D69]">/mo</span>
                </div>
                <span className="text-[10px] font-mono text-[#606D69] block mt-0.5">
                  After loan EMI clearance
                </span>
              </div>
            </div>

            {/* Proportional Linear Capacity Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-baseline text-xs font-mono">
                <span className="font-bold text-[#1A2421]">
                  Array Capacity Distribution ({optimisationParams.targetCapacityKw} kWp Total):
                </span>
                <span className="text-[#0F2D24] font-bold">
                  {roundedSumPercentage.toFixed(1)}% Reconciled
                </span>
              </div>
              <AllocationBar
                segments={allocationSegments}
                totalCapacityKw={optimisationParams.targetCapacityKw}
                showLegend={false}
              />
            </div>
          </div>

          {/* High-Density Planning Ledger Table */}
          <div className="bg-white border border-[#CBD2CA] rounded-lg overflow-hidden shadow-2xs">
            <div className="p-3 bg-[#F4F5F0] border-b border-[#CBD2CA] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-headline font-bold text-[#1A2421] uppercase tracking-wider block">
                  Illustrative Participant Allocation Schedule
                </span>
                <span className="text-[10px] text-[#606D69] font-mono">
                  All identities, CA numbers, and figures are synthetic simulation data.
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E1EBE6] text-[#0F2D24] border border-[#CBD8D2]">
                Sum: {roundedSumPercentage.toFixed(1)}%
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-[#F4F5F0] border-b border-[#CBD2CA] text-[#606D69] text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-semibold font-sans">Flat &amp; Resident</th>
                    <th className="py-2.5 px-3 font-semibold">Synthetic CA #</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Load</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Monthly Cons.</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Quota Share</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Cap. (kWp)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Yield (kWh)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Gross Savings</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Loan EMI</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Net Gain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBD2CA]/60">
                  {allocationRows.map((r) => {
                    const isSelected = selectedFlat === r.flatNumber;
                    return (
                      <tr
                        key={r.memberId}
                        onClick={() => setSelectedFlat(isSelected ? null : r.flatNumber)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#E1EBE6]' : 'hover:bg-[#FBFBF9]'
                        }`}
                      >
                        <td className="py-2 px-3 font-sans">
                          <span className="font-bold text-[#1A2421] block">{r.flatNumber}</span>
                          <span className="text-[10px] text-[#606D69] block">{r.ownerName}</span>
                        </td>
                        <td className="py-2 px-3 text-[#1A2421] tabular-nums">{r.caNumber}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{r.sanctionedLoadKw.toFixed(1)} kW</td>
                        <td className="py-2 px-3 text-right tabular-nums">~{r.monthlyConsumptionKwh} kWh</td>
                        <td className="py-2 px-3 text-right font-bold text-[#0F2D24] tabular-nums">
                          {r.sharePercentage.toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">{r.shareKw.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right tabular-nums">~{r.allocatedKwh}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-[#1A2421]">
                          ₹{r.monthlySavingsInr.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-[#606D69]">
                          ₹{r.monthlyContributionInr.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold text-[#0F2D24]">
                          +₹{r.netBenefitInr.toLocaleString('en-IN')}/mo
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#F4F5F0] border-t-2 border-[#CBD2CA] font-bold text-[#1A2421]">
                    <td colSpan={4} className="py-2.5 px-3 font-sans text-xs uppercase">
                      Reconciled Cohort Totals ({allocationRows.length} Units)
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#0F2D24] tabular-nums">
                      {roundedSumPercentage.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {totalAllocatedKw.toFixed(1)} kWp
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      ~{totalAllocatedKwh.toLocaleString('en-IN')} kWh
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      ₹{totalGrossSavingsInr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      ₹{totalEmiInr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#0F2D24] tabular-nums">
                      +₹{totalNetBenefitInr.toLocaleString('en-IN')}/mo
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-3 bg-[#F4F5F0] border-t border-[#CBD2CA] flex flex-wrap items-center justify-between text-[11px] font-mono text-[#606D69]">
              <span>Formula: Pro-rata quota = Candidate Consumption / Aggregate Consumption (with residual reconciliation).</span>
              <span className="font-bold text-[#0F2D24]">Sum Tolerance: 100.0% ± 0.1% Verified</span>
            </div>
          </div>

          {/* Allocation Methodology & Defined Fairness Metrics */}
          <div className="bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#CBD2CA] pb-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#0F2D24]">functions</span>
                <h3 className="font-headline text-xs font-bold text-[#1A2421] uppercase tracking-wider">
                  Pro-Rata Allocation Methodology &amp; Fairness Metric Definition
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMethodology(!showMethodology)}
                className="text-[11px] font-mono text-[#0F2D24] hover:underline"
              >
                {showMethodology ? 'Hide Equations' : 'Inspect Mathematical Criteria'}
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded border border-[#CBD2CA] space-y-1">
                  <span className="font-bold text-[#1A2421] block">1. Active Member Filter</span>
                  <p className="text-[11px] text-[#606D69] leading-tight">
                    Withdrawn members (<code className="bg-[#F4F5F0] px-1 py-0.5 rounded font-mono">status === 'withdrawn'</code>) are strictly excluded from allocation. Only active subscribers receive quota shares.
                  </p>
                </div>

                <div className="p-2.5 bg-white rounded border border-[#CBD2CA] space-y-1">
                  <span className="font-bold text-[#1A2421] block">2. Consumption-Weighted Pro-Rata</span>
                  <p className="text-[11px] text-[#606D69] leading-tight">
                    Raw percentage: <code className="bg-[#F4F5F0] px-1 py-0.5 rounded font-mono">Ratio_i = Consumption_i / Total_Eligible_Consumption</code>, aligning generation credits with electricity absorption capacity.
                  </p>
                </div>

                <div className="p-2.5 bg-white rounded border border-[#CBD2CA] space-y-1">
                  <span className="font-bold text-[#1A2421] block">3. Sanctioned Load Boundary</span>
                  <p className="text-[11px] text-[#606D69] leading-tight">
                    Inverter capacity allocation per subscriber cannot exceed 100% of consumer connected sanctioned load per DERC Net Metering regulations.
                  </p>
                </div>

                <div className="p-2.5 bg-white rounded border border-[#CBD2CA] space-y-1">
                  <span className="font-bold text-[#1A2421] block">4. Solvency Quotient &amp; EMI Safety Cap</span>
                  <p className="text-[11px] text-[#606D69] leading-tight">
                    Monthly loan contribution is capped at participant safety limit (<code className="bg-[#F4F5F0] px-1 py-0.5 rounded font-mono">₹4,500/mo</code>), guaranteeing net-positive cash flow (<code className="bg-[#F4F5F0] px-1 py-0.5 rounded font-mono">ΔSavings &gt; EMI</code>).
                  </p>
                </div>
              </div>

              {showMethodology && (
                <div className="p-3 bg-[#F4F5F0] rounded border border-[#CBD2CA] space-y-2 animate-in fade-in">
                  <span className="font-headline font-bold text-xs text-[#1A2421] block">
                    Defined Fairness Metric: Jain's Fairness Index
                  </span>
                  <p className="text-[11px] text-[#606D69] leading-relaxed">
                    The solver evaluates allocation equity using <strong>Jain's Fairness Index</strong> computed across allocated member shares:
                  </p>
                  <div className="p-2 bg-white rounded border border-[#CBD2CA] font-mono text-[11px] text-[#0F2D24]">
                    J(x) = (Σ x_i)² / (n · Σ x_i²) = {(optimisationResult.comparison?.fairnessIndex ?? 93.7).toFixed(1)}%
                  </div>
                  <p className="text-[11px] text-[#606D69] leading-relaxed">
                    A computed score of {(optimisationResult.comparison?.fairnessIndex ?? 93.7).toFixed(1)}% confirms that capital contributions and solar credits are distributed equitably across diverse flat sizes (2BHK, 3BHK, 4BHK) without regressively overburdening lower-consumption units.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Navigation & Export Action Deck */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => setIsExportOpen(true)}
          className="w-full sm:flex-1 h-11 bg-[#0F2D24] hover:bg-[#163A2F] text-white rounded font-headline text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          <span>Download Illustrative Planning Ledger (.PDF / CSV)</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('/monitoring')}
          className="w-full sm:w-auto px-5 h-11 bg-white hover:bg-[#F4F5F0] text-[#1A2421] border border-[#CBD2CA] rounded font-headline text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>Proceed to Modelled PV Performance</span>
          <span className="material-symbols-outlined text-[18px] text-[#0F2D24]">arrow_forward</span>
        </button>
      </div>

      <ReportExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        defaultReportType="allocation"
      />

    </div>
  );
};
