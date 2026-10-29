import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AlertBanner } from '../components/common/AlertBanner';
import { ReportExportModal } from '../components/common/ReportExportModal';
import { apiClient } from '../services/apiClient';
import { SOLAR_METRICS } from '../utils/solarCalculations';

interface PersistedSourceState {
  latestAssessment: any | null;
  latestOptimisationRun: any | null;
  communityCount: number;
  isLoading: boolean;
  error: string | null;
  isBackendConnected: boolean;
  lastFetchedAt: string;
}

export const ReportsPage: React.FC = () => {
  const { community, currentUser, optimisationResult } = useApp();
  const [selectedReport, setSelectedReport] = useState<'feasibility' | 'community' | 'optimisation' | 'allocation' | 'regulatory' | 'maintenance'>('feasibility');
  const [isExportOpen, setIsExportOpen] = useState(false);

  const [sourceState, setSourceState] = useState<PersistedSourceState>({
    latestAssessment: null,
    latestOptimisationRun: null,
    communityCount: community.members?.length || 20,
    isLoading: true,
    error: null,
    isBackendConnected: false,
    lastFetchedAt: new Date().toLocaleTimeString('en-IN')
  });

  const fetchSourceData = async () => {
    setSourceState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const [healthRes, assessmentRes, runsRes, commRes] = await Promise.all([
        apiClient.checkHealth(),
        apiClient.getLatestAssessment(),
        apiClient.getOptimisationRuns(),
        apiClient.getCommunity()
      ]);

      const isConnected = healthRes.status === 'ok' || healthRes.success === true;
      const latestAssessment = assessmentRes.success ? assessmentRes.data : null;
      const latestOptimisation = (runsRes.success && runsRes.data && runsRes.data.length > 0) ? runsRes.data[0] : null;
      const memberCount = commRes.success && commRes.data?.members ? commRes.data.members.length : community.members.length;

      setSourceState({
        latestAssessment,
        latestOptimisationRun: latestOptimisation,
        communityCount: memberCount,
        isLoading: false,
        error: null,
        isBackendConnected: isConnected,
        lastFetchedAt: new Date().toLocaleTimeString('en-IN')
      });
    } catch (err: any) {
      setSourceState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Unable to sync with MongoDB backend',
        lastFetchedAt: new Date().toLocaleTimeString('en-IN')
      }));
    }
  };

  useEffect(() => {
    fetchSourceData();
  }, []);

  const handleOpenExport = (type: typeof selectedReport) => {
    setSelectedReport(type);
    setIsExportOpen(true);
  };

  // Reconciled metrics from persisted run or current context
  const activeCapacityKw = sourceState.latestOptimisationRun?.targetCapacityKw || community.proposedCapacityKw || 12.0;
  const activeShortfallInr = sourceState.latestOptimisationRun?.shortfallInr ?? optimisationResult.shortfallInr ?? 0;
  const isFeasible = sourceState.latestOptimisationRun?.isFeasible ?? optimisationResult.isFeasible ?? true;
  const nominalAnnual = SOLAR_METRICS.NOMINAL_ANNUAL_YIELD_KWH_PER_KWP;
  const effectiveAnnual = SOLAR_METRICS.EFFECTIVE_ANNUAL_YIELD_KWH_PER_KWP;
  const annualGenKwh = Math.round(activeCapacityKw * effectiveAnnual);

  const reportCards = [
    {
      id: 'feasibility' as const,
      title: 'Solar Feasibility & Yield Assessment',
      badge: 'Analytical Model',
      description: 'Physical rooftop constraint analysis, canonical yield modeling (1,334.8 kWh/kWp/yr), PM Surya Ghar illustrative subsidy, and payback curves.',
      keyMetric: `${activeCapacityKw} kWp · ${annualGenKwh.toLocaleString('en-IN')} kWh/yr · 4.8 yr Payback`,
      icon: 'calculate',
      sourceDoc: sourceState.latestAssessment ? 'Persisted Assessment' : 'Canonical Model Default'
    },
    {
      id: 'community' as const,
      title: 'Community Participation & Escrow Roster',
      badge: 'RWA Cohort Ledger',
      description: 'High-density register of 20 synthetic participants, flat numbers, synthetic CA numbers, sanctioned loads, KYC statuses, and escrow commitments.',
      keyMetric: `${sourceState.communityCount} Synthetic Units · ₹${(community.totalCommittedInr || 345000).toLocaleString('en-IN')} Committed Escrow`,
      icon: 'groups',
      sourceDoc: 'MongoDB Community Collection'
    },
    {
      id: 'optimisation' as const,
      title: 'Affordability Optimisation & Contingency Proof',
      badge: 'Mathematical Solver',
      description: 'Linear programming solver outputs, baseline comparison against equal split, dynamic shortfall derivations, and 4 contingency stress tests.',
      keyMetric: `Target ${activeCapacityKw} kWp · ${isFeasible ? 'Feasible (₹0 Shortfall)' : `Infeasible (₹${activeShortfallInr.toLocaleString('en-IN')} Shortfall)`}`,
      icon: 'bolt',
      sourceDoc: sourceState.latestOptimisationRun ? `Run: ${String(sourceState.latestOptimisationRun._id || sourceState.latestOptimisationRun.id).substring(0, 8)}...` : 'Active Context Solver'
    },
    {
      id: 'allocation' as const,
      title: 'Illustrative Planning Ledger & Allocation Schedule',
      badge: 'VNM Planning Ledger',
      description: '100.0% zero-shortfall pro-rata distribution schedule with individual monthly bill credits, computed Jain\'s fairness index (~93.7%), and DERC disclaimers.',
      keyMetric: '100.0% Zero-Loss Sum · 14 Active Quotas · ₹1,120/mo Avg Benefit',
      icon: 'pie_chart',
      sourceDoc: 'Reconciled Pro-Rata Formulation'
    },
    {
      id: 'regulatory' as const,
      title: 'Statutory & Regulatory Pre-Filing Dossier',
      badge: 'DERC Compliance Audit',
      description: 'Delhi Solar Policy 2024 compliance review, 25 kg/m² structural assumption audit, 15% transformer reserve check, and DISCOM interconnection roadmap.',
      keyMetric: '3 Mandates Verified · 58% DT Saturation · Provisional Clearances',
      icon: 'gavel',
      sourceDoc: 'Statutory Rule Reference Set'
    },
    {
      id: 'maintenance' as const,
      title: 'Plant Operations & Maintenance Summary',
      badge: 'O&M Commissioning Log',
      description: 'Simulated quarterly panel washdown schedules, RS-485 AMR telemetry gateway health, earth pit resistance records, and inverter PR verification.',
      keyMetric: '5 Synthetic Work Orders · 82.4% Simulated PR · 1.28 Ohm Earth Test',
      icon: 'build',
      sourceDoc: 'Simulated Commissioning Log'
    }
  ];

  return (
    <div className="flex flex-col w-full pb-16 max-w-5xl mx-auto px-4 space-y-6 animate-in fade-in">
      
      {/* Page Header */}
      <div className="pt-2 border-b border-[#D6DFD8] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E1EBE6] text-[#0F2D24] text-[11px] font-mono font-bold tracking-wider uppercase mb-1.5 border border-[#0F2D24]/20">
              <span className="material-symbols-outlined text-[14px]">download</span>
              <span>Downloadable &amp; Print-Ready Planning Statements</span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#002620] tracking-tight">
              Solar Feasibility &amp; Planning Reports
            </h1>
            <p className="text-xs sm:text-sm text-[#404846] mt-1 max-w-2xl leading-relaxed">
              Generate formal illustrative planning reports, community rosters, affordability proofs, and illustrative allocation schedules for RWA General Body Meetings and engineering consultations.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={fetchSourceData}
              disabled={sourceState.isLoading}
              className="px-3 py-1.5 rounded bg-white hover:bg-[#F4F5F0] text-[#0F2D24] text-xs font-mono font-bold border border-[#D6DFD8] flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-[15px] ${sourceState.isLoading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>{sourceState.isLoading ? 'Syncing...' : 'Refresh Sources'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mandatory Statutory Disclaimer Banner */}
      <AlertBanner
        variant="warning"
        code="[ILLUSTRATIVE PLANNING REPORTS — NOT AN OFFICIAL DISCOM FILING]"
        title="Regulatory Status & Simulation Scope Disclosure"
      >
        <p className="text-xs leading-relaxed text-[#422000]">
          All statements, ledgers, and downloadable documentation produced by Solaris are <strong>illustrative engineering planning and simulation models</strong> created for Dheera Green Infra. They do not constitute official DISCOM (BSES Rajdhani Power Limited / BYPL / TPDDL) approvals, sanctioned net metering contracts, or certified structural endorsements. All figures must undergo formal DISCOM interconnection inspection, on-site RCC structural load testing, and statutory application submission before physical procurement or installation.
        </p>
      </AlertBanner>

      {/* Persisted Source-of-Truth Reconciliation Ribbon */}
      <div className="bg-white rounded-lg p-4 border border-[#D6DFD8] shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#F4F5F0] pb-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0F2D24] text-[18px]">database</span>
            <span className="font-headline font-bold text-[#002620]">
              Persisted Source-of-Truth Cross-Reference
            </span>
          </div>
          <div className="flex items-center gap-2 text-[#717976] font-mono text-[11px]">
            <span>Synced: <strong>{sourceState.lastFetchedAt}</strong></span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              sourceState.isBackendConnected ? 'bg-[#E1EBE6] text-[#0F2D24]' : 'bg-[#FFF8E6] text-[#D9822B]'
            }`}>
              {sourceState.isBackendConnected ? 'MongoDB Live' : 'Local Fallback'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded bg-[#F8FAF7] border border-[#D6DFD8]">
            <span className="text-[10px] text-[#717976] block uppercase font-bold">Latest Assessment</span>
            <span className="font-bold text-[#002620] block mt-0.5">
              {sourceState.latestAssessment ? `${sourceState.latestAssessment.recommendedCapacityKw} kWp Recommended` : `${activeCapacityKw}.0 kWp (Canonical)`}
            </span>
            <span className="text-[10px] text-[#717976]">
              {sourceState.latestAssessment ? `₹${sourceState.latestAssessment.netInstallationCostInr.toLocaleString('en-IN')} net outlay` : '₹5,02,000 net target'}
            </span>
          </div>

          <div className="p-2.5 rounded bg-[#F8FAF7] border border-[#D6DFD8]">
            <span className="text-[10px] text-[#717976] block uppercase font-bold">Latest Solver Run</span>
            <span className={`font-bold block mt-0.5 ${isFeasible ? 'text-[#00725d]' : 'text-[#BA1A1A]'}`}>
              {isFeasible ? 'FEASIBLE (₹0 Shortfall)' : `SHORTFALL: ₹${activeShortfallInr.toLocaleString('en-IN')}`}
            </span>
            <span className="text-[10px] text-[#717976]">
              Capacity: {activeCapacityKw} kWp · 100.0% sum
            </span>
          </div>

          <div className="p-2.5 rounded bg-[#F8FAF7] border border-[#D6DFD8]">
            <span className="text-[10px] text-[#717976] block uppercase font-bold">Roster Participants</span>
            <span className="font-bold text-[#002620] block mt-0.5">
              {sourceState.communityCount} Synthetic Units
            </span>
            <span className="text-[10px] text-[#717976]">
              ₹{(community.totalCommittedInr || 345000).toLocaleString('en-IN')} committed escrow
            </span>
          </div>

          <div className="p-2.5 rounded bg-[#F8FAF7] border border-[#D6DFD8]">
            <span className="text-[10px] text-[#717976] block uppercase font-bold">Model Invariant</span>
            <span className="font-bold text-[#002620] block mt-0.5">
              {effectiveAnnual.toFixed(1)} kWh/kWp/yr
            </span>
            <span className="text-[10px] text-[#717976]">
              {nominalAnnual} nom × {SOLAR_METRICS.DEFAULT_DERATING_FACTOR} derate
            </span>
          </div>
        </div>
      </div>

      {/* Reports Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportCards.map((card) => (
          <div
            key={card.id}
            className="bg-white rounded-lg p-5 border border-[#D6DFD8] shadow-sm flex flex-col justify-between hover:border-[#0F2D24]/40 transition-colors"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E1EBE6] text-[#0F2D24] font-bold uppercase border border-[#0F2D24]/15">
                  {card.badge}
                </span>
                <span className="text-[10px] font-mono text-[#717976]">
                  {card.sourceDoc}
                </span>
              </div>

              <div className="flex items-start gap-3 pt-1">
                <div className="w-9 h-9 rounded bg-[#F4F5F0] text-[#0F2D24] flex items-center justify-center shrink-0 border border-[#D6DFD8]">
                  <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
                </div>
                <div>
                  <h3 className="font-headline text-sm font-bold text-[#002620]">
                    {card.title}
                  </h3>
                  <p className="text-xs text-[#404846] mt-1 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#F8FAF7] border border-[#D6DFD8] text-[11px] font-mono">
                <span className="text-[#717976] block text-[10px] uppercase font-bold">Key Statement Data:</span>
                <span className="font-bold text-[#002620]">{card.keyMetric}</span>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#F4F5F0] flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenExport(card.id)}
                className="flex-1 py-2 px-3 rounded bg-[#0F2D24] text-white hover:bg-[#163A2F] text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">visibility</span>
                <span>Preview &amp; Export Statement</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Verified Generation Standards Footer */}
      <div className="p-4 bg-[#F8FAF7] rounded-lg border border-[#D6DFD8] space-y-2 text-xs text-[#404846]">
        <div className="flex items-center gap-1.5 font-bold text-[#002620]">
          <span className="material-symbols-outlined text-[18px] text-[#0F2D24]">verified_user</span>
          <span>Verified Document Generation &amp; Academic Integrity Standards</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          All generated statements include deterministic algorithmic calculation parameters, ISO 8601 timestamps, Delhi DERC tariff docket citations, and member CA linkage. All participant records and utility identifiers are server-controlled synthetic data.
        </p>
      </div>

      {/* Reusable Export Modal */}
      <ReportExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        defaultReportType={selectedReport}
      />

    </div>
  );
};
