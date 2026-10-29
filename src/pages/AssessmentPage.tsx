import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateSolarFeasibility, ENGINEERING_ASSUMPTIONS, SOLAR_METRICS } from '../utils/solarCalculations';
import { DualParamControl } from '../components/common/DualParamControl';
import { ConstraintDiagram } from '../components/common/ConstraintDiagram';
import { AlertBanner } from '../components/common/AlertBanner';
import { ReportExportModal } from '../components/common/ReportExportModal';
import { apiClient } from '../services/apiClient';

export const AssessmentPage: React.FC = () => {
  const { currentUser, updateCurrentUser, navigateTo } = useApp();

  const [billAmount, setBillAmount] = useState<number>(currentUser.monthlyBillInr || 6850);
  const [terraceArea, setTerraceArea] = useState<number>(currentUser.terraceAreaSqFt || 650);
  const [sanctionedLoad, setSanctionedLoad] = useState<number>(currentUser.sanctionedLoadKw || 5.0);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Persistence State
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  // Deterministic calculation result based on real-time inputs
  const calculation = calculateSolarFeasibility({
    monthlyBillInr: billAmount,
    terraceAreaSqFt: terraceArea,
    sanctionedLoadKw: sanctionedLoad,
    isResidential: currentUser.tariffCategory === 'Domestic',
  });

  // Derived constraint limits for visual diagram
  const rooftopCapacityKw = terraceArea < ENGINEERING_ASSUMPTIONS.minimumFeasibleRooftopAreaSqFt
    ? 0
    : Math.max(0.5, Math.floor((terraceArea / ENGINEERING_ASSUMPTIONS.terraceAreaPerKwpSqFt) * 10) / 10);
  const sanctionedLoadCapKw = sanctionedLoad;
  const demandOffsetCapKw = Math.round(((calculation.monthlyConsumptionKwh * 12) / ENGINEERING_ASSUMPTIONS.effectiveAnnualYieldKwhPerKwp) * 10) / 10;

  const handleBillChange = (newVal: number) => {
    setBillAmount(newVal);
    updateCurrentUser({ monthlyBillInr: newVal });
    setSaveStatus('idle');
  };

  const handleTerraceChange = (newVal: number) => {
    setTerraceArea(newVal);
    updateCurrentUser({ terraceAreaSqFt: newVal });
    setSaveStatus('idle');
  };

  const handleLoadChange = (newVal: number) => {
    setSanctionedLoad(newVal);
    updateCurrentUser({ sanctionedLoadKw: newVal });
    setSaveStatus('idle');
  };

  const handleSaveToDatabase = async () => {
    setSaveStatus('saving');
    setSaveFeedback(null);

    const payload = {
      monthlyBillInr: billAmount,
      monthlyConsumptionKwh: calculation.monthlyConsumptionKwh,
      terraceAreaSqFt: terraceArea,
      sanctionedLoadKw: sanctionedLoad,
      isResidential: currentUser.tariffCategory === 'Domestic',
      costPerKwInr: 50000,
    };

    const res = await apiClient.saveAssessment(payload);

    if (res.success && res.data) {
      setSaveStatus('saved');
      setLastSavedId(res.data._id || 'persisted');
      setSaveFeedback(`Assessment successfully persisted to MongoDB at ${new Date().toLocaleTimeString('en-IN')}`);
    } else {
      setSaveStatus('error');
      setSaveFeedback(res.error || 'Failed to connect to backend server. Scenario preserved in active browser session.');
    }
  };

  return (
    <div className="flex flex-col w-full pb-16 max-w-4xl mx-auto px-4 sm:px-6 animate-in fade-in space-y-6">
      
      {/* Top Header & Breadcrumb */}
      <div className="pt-2 pb-1 border-b border-[#CBD2CA]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E1EBE6] text-[#0F2D24] text-[10px] font-mono font-bold uppercase tracking-wider border border-[#CBD8D2]">
            <span className="material-symbols-outlined text-[14px]">tune</span>
            Step 2 of 4 • Feasibility Sizing
          </span>
          <div className="flex items-center gap-2 text-xs font-mono text-[#606D69]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#0F2D24]"></span>
            <span>Canonical Yield: 1,334.8 kWh/kWp/yr eff.</span>
          </div>
        </div>

        <h1 className="font-headline text-2xl sm:text-3xl text-[#0F2D24] tracking-tight font-bold">
          Rooftop Solar Feasibility Assessment
        </h1>
        <p className="text-xs sm:text-sm text-[#374340] mt-1 leading-relaxed">
          Deterministic solar generation and capital expenditure model for Delhi NCR DISCOMs (BRPL, BYPL, TPDDL). Single canonical solar yield model: 1,420 kWh/kWp/year nominal with 0.94 derating (1,334.8 kWh/kWp/year effective).
        </p>
      </div>

      {/* Grid: Interactive Controls & Constraint Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Interactive Inputs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-sm font-bold text-[#1A2421] uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#0F2D24]">sliders</span>
              Site &amp; Demand Parameters
            </h2>
            <span className="text-[11px] font-mono text-[#606D69]">
              DISCOM: <strong className="text-[#1A2421]">{currentUser.discom}</strong>
            </span>
          </div>

          {/* Monthly Bill Control */}
          <DualParamControl
            id="param-monthly-bill"
            label="Monthly Electricity Bill"
            icon="receipt_long"
            unit="₹"
            value={billAmount}
            onChange={handleBillChange}
            min={1500}
            max={35000}
            step={250}
            badgeText={`~${calculation.monthlyConsumptionKwh} kWh / mo`}
            helperText="Estimated based on blended DERC LT-1 slab recovery credit (₹8.20/kWh blended)."
            presets={[
              { label: '₹3,500 (~427 kWh)', value: 3500 },
              { label: '₹6,850 (~835 kWh)', value: 6850 },
              { label: '₹12,000 (~1,463 kWh)', value: 12000 },
              { label: '₹20,000 (~2,439 kWh)', value: 20000 },
            ]}
          />

          {/* Terrace Area Control */}
          <DualParamControl
            id="param-terrace-area"
            label="Usable Rooftop Area (RCC Flat)"
            icon="domain"
            unit="sq.ft"
            value={terraceArea}
            onChange={handleTerraceChange}
            min={0}
            max={3500}
            step={25}
            badgeText={terraceArea < 90 ? 'Constrained (<90 sq.ft)' : `~${(terraceArea / 95).toFixed(1)} kWp space`}
            helperText="Standard RCC flat roof requires ~95 sq.ft per kWp for panel layout and inter-row shading clearance."
            presets={[
              { label: '150 sq.ft (1.5 kWp)', value: 150 },
              { label: '400 sq.ft (4.2 kWp)', value: 400 },
              { label: '650 sq.ft (6.8 kWp)', value: 650 },
              { label: '1,200 sq.ft (12.6 kWp)', value: 1200 },
            ]}
          />

          {/* Sanctioned Load Control */}
          <DualParamControl
            id="param-sanctioned-load"
            label="DISCOM Sanctioned Connected Load"
            icon="speed"
            unit="kW"
            value={sanctionedLoad}
            onChange={handleLoadChange}
            min={1.0}
            max={25.0}
            step={0.5}
            badgeText="100% Net-Meter Cap"
            helperText="DERC Net Metering Regulations cap solar inverter capacity at 100% of consumer sanctioned load."
            presets={[
              { label: '3.0 kW', value: 3.0 },
              { label: '5.0 kW', value: 5.0 },
              { label: '7.0 kW', value: 7.0 },
              { label: '10.0 kW', value: 10.0 },
            ]}
          />

          {/* Upfront Budget Summary Pill */}
          <div className="p-3 bg-[#F4F5F0] rounded-lg border border-[#CBD2CA] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0F2D24] text-[18px]">account_balance_wallet</span>
              <div>
                <span className="font-semibold text-[#1A2421]">
                  Budget Ceiling: ₹{(currentUser.upfrontBudgetInr || 150000).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-[#606D69] block">
                  Tariff: {currentUser.tariffCategory} · Connection CA: {currentUser.consumerNumber || 'CA #102948211'}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FFDEA7] text-[#422000] border border-[#D9822B]/40 font-semibold">
              PM Surya Ghar Eligible
            </span>
          </div>
        </div>

        {/* Right Column: Physical & Statutory Constraint Diagram (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <ConstraintDiagram
            rooftopCapacityKw={rooftopCapacityKw}
            sanctionedLoadCapKw={sanctionedLoadCapKw}
            demandOffsetCapKw={demandOffsetCapKw}
            recommendedCapacityKw={calculation.recommendedCapacityKw}
            limitingFactor={calculation.limitingFactor || 'energy_demand'}
            isViable={calculation.isViable}
          />

          {/* Shortfall or Limiting Notice */}
          {calculation.feasibilityNotes && calculation.feasibilityNotes.length > 0 && (
            <AlertBanner
              variant={!calculation.isViable ? 'error' : calculation.limitingFactor === 'roof' || calculation.limitingFactor === 'sanctioned_load' ? 'warning' : 'info'}
              code={!calculation.isViable ? '[SPACE DEFICIT]' : calculation.limitingFactor === 'roof' ? '[ROOF BOTTLENECK]' : calculation.limitingFactor === 'sanctioned_load' ? '[SANCTIONED LOAD LIMIT]' : '[SIZING SUMMARY]'}
            >
              {calculation.feasibilityNotes[0]}
            </AlertBanner>
          )}

          {/* Persistence Action Box */}
          <div className="p-3 bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-headline font-bold text-[#1A2421] uppercase tracking-wider">
                Simulation Persistence
              </span>
              <span className="text-[10px] font-mono text-[#606D69]">MongoDB</span>
            </div>

            <button
              type="button"
              onClick={handleSaveToDatabase}
              disabled={saveStatus === 'saving'}
              className="w-full h-9 bg-[#0F2D24] hover:bg-[#163A2F] text-white rounded font-headline text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {saveStatus === 'saving' ? 'sync' : 'save'}
              </span>
              <span>
                {saveStatus === 'saving' ? 'Persisting to Database...' : 'Save Scenario to Database'}
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
                {lastSavedId && saveStatus === 'saved' && (
                  <span className="block text-[10px] text-[#606D69] mt-0.5">
                    Record ID: {lastSavedId}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Hero Recommendation Tile (Engineered High-Contrast Forest Green) */}
      <div className="bg-[#0F2D24] text-white rounded-lg p-5 shadow-sm border border-[#163A2F] space-y-4">
        
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D9822B] text-[22px]">solar_power</span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#A3D0C4]">
              Recommended Plant Specification
            </span>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border ${
            !calculation.isViable
              ? 'bg-[#FFDAD6] text-[#93000A] border-[#FFDAD6]'
              : calculation.limitingFactor === 'roof'
              ? 'bg-[#FFDEA7] text-[#422000] border-[#D9822B]'
              : 'bg-[#E1EBE6] text-[#0F2D24] border-[#CBD8D2]'
          }`}>
            {!calculation.isViable ? 'SPACE CONSTRAINED' : calculation.limitingFactor === 'roof' ? 'ROOF CONSTRAINED' : calculation.limitingFactor === 'sanctioned_load' ? 'LOAD CONSTRAINED' : 'OPTIMAL SYSTEM SIZING'}
          </span>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-1">
          <div>
            <span className="text-[11px] font-mono text-[#A3D0C4] block">Recommended Sizing</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-headline text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono tabular-nums">
                {calculation.recommendedCapacityKw.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-[#A3D0C4]">kWp</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-mono text-[#A3D0C4] block">Modelled Annual Yield</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-headline text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums">
                {calculation.estAnnualGenerationKwh.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-mono text-[#A3D0C4]">kWh/yr</span>
            </div>
            <span className="text-[10px] text-[#A3D0C4]/70 block font-mono">
              ~{calculation.estMonthlyGenerationKwh.toLocaleString('en-IN')} kWh/mo
            </span>
          </div>

          <div>
            <span className="text-[11px] font-mono text-[#A3D0C4] block">Net Capital Outlay</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-headline text-2xl sm:text-3xl font-bold text-[#FFDEA7] font-mono tabular-nums">
                ₹{calculation.netInstallationCostInr.toLocaleString('en-IN')}
              </span>
            </div>
            <span className="text-[10px] text-[#A3D0C4]/70 block font-mono">
              Gross: ₹{calculation.grossInstallationCostInr.toLocaleString('en-IN')}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-mono text-[#A3D0C4] block">Payback &amp; Return</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-headline text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums">
                {calculation.paybackYears}
              </span>
              <span className="text-xs font-mono text-[#A3D0C4]">Years</span>
            </div>
            <span className="text-[10px] text-[#FFDEA7] block font-mono">
              ROI ~{calculation.annualRoiPercentage}% p.a.
            </span>
          </div>
        </div>

        {/* Physical Utilization & Savings Sub-bar */}
        <div className="p-3 bg-[#163A2F] rounded border border-white/5 space-y-2">
          <div className="flex justify-between text-xs font-mono text-[#A3D0C4]">
            <span>Terrace Area Required: <strong className="text-white">{calculation.roofAreaRequiredSqFt} sq.ft</strong> ({calculation.roofSpaceUtilisationPercentage}% of available {terraceArea} sq.ft)</span>
            <span className="text-[#FFDEA7]">Monthly Tariff Offset: ~₹{calculation.monthlySavingsInr.toLocaleString('en-IN')}/mo</span>
          </div>
          <div className="w-full bg-[#0F2D24] h-2 rounded overflow-hidden">
            <div
              className="bg-[#D9822B] h-full rounded transition-all duration-300"
              style={{ width: `${Math.min(100, calculation.roofSpaceUtilisationPercentage)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#A3D0C4]">
            <span>DERC Modelled Avoided Carbon: ~{calculation.co2OffsetTonsPerYear} Metric Tons CO₂ / year</span>
            <span>PM Surya Ghar Subsidy Applied: ₹{calculation.subsidyInr.toLocaleString('en-IN')}</span>
          </div>
        </div>

      </div>

      {/* Comparative Financing Models Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#CBD2CA] pb-2">
          <h2 className="font-headline text-sm font-bold text-[#1A2421] uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#0F2D24]">account_tree</span>
            Solar Deployment Pathways Comparison
          </h2>
          <span className="text-[11px] font-mono text-[#606D69]">3 Models Evaluated</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Model 1: Rooftop CAPEX */}
          <div className="bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg p-3.5 space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#E1EBE6] text-[#0F2D24] border border-[#CBD8D2]">
                  DIRECT OWNERSHIP
                </span>
                <span className="text-[10px] font-mono text-[#606D69]">100% Offset</span>
              </div>
              <h3 className="font-headline text-sm font-bold text-[#1A2421] mt-2">
                1. Individual Rooftop CAPEX
              </h3>
              <p className="text-[11px] text-[#606D69] mt-0.5">
                Upfront purchase of rooftop solar plant with full ownership, PM Surya Ghar subsidy, and maximum tariff savings.
              </p>
            </div>

            <div className="p-2.5 bg-[#F4F5F0] rounded border border-[#CBD2CA] space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#606D69]">Net Capital:</span>
                <span className="font-bold text-[#1A2421]">₹{calculation.netInstallationCostInr.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#606D69]">Monthly Gain:</span>
                <span className="font-bold text-[#0F2D24]">₹{calculation.monthlySavingsInr.toLocaleString('en-IN')}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#606D69]">Subsidy Credit:</span>
                <span className="font-bold text-[#D9822B]">₹{calculation.subsidyInr.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Model 2: RESCO / PPA */}
          <div className="bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg p-3.5 space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#ECEEE8] text-[#374340] border border-[#CBD2CA]">
                  DEVELOPER PPA
                </span>
                <span className="text-[10px] font-mono text-[#606D69]">Zero Capex</span>
              </div>
              <h3 className="font-headline text-sm font-bold text-[#1A2421] mt-2">
                2. RESCO / Developer Model
              </h3>
              <p className="text-[11px] text-[#606D69] mt-0.5">
                Third-party developer installs and maintains the plant at zero upfront cost. Consumer purchases power at a fixed PPA rate.
              </p>
            </div>

            <div className="p-2.5 bg-[#F4F5F0] rounded border border-[#CBD2CA] space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#606D69]">Net Capital:</span>
                <span className="font-bold text-[#1A2421]">₹0 Upfront</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#606D69]">Solar Tariff:</span>
                <span className="font-bold text-[#1A2421]">₹4.50 / kWh</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#606D69]">Est. Monthly Gain:</span>
                <span className="font-bold text-[#0F2D24]">~₹1,850/mo</span>
              </div>
            </div>
          </div>

          {/* Model 3: VNM Community Solar */}
          <div className="bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg p-3.5 space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FFDEA7] text-[#422000] border border-[#D9822B]/40">
                  VIRTUAL NET METERING
                </span>
                <span className="text-[10px] font-mono text-[#606D69]">Multi-Unit</span>
              </div>
              <h3 className="font-headline text-sm font-bold text-[#1A2421] mt-2">
                3. Shared Community Solar (VNM)
              </h3>
              <p className="text-[11px] text-[#606D69] mt-0.5">
                Ideal for apartment owners with constrained or shared terraces. Shared rooftop solar array with pro-rata DISCOM credit off-site.
              </p>
            </div>

            <div className="p-2.5 bg-[#F4F5F0] rounded border border-[#CBD2CA] space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#606D69]">Target Share:</span>
                <span className="font-bold text-[#1A2421]">1.5 - 2.5 kWp</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#606D69]">Estimated Outlay:</span>
                <span className="font-bold text-[#1A2421]">₹48,000 - ₹75,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#606D69]">Ledger Status:</span>
                <span className="font-bold text-[#0F2D24]">Pro-rata Bill Credit</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Engineering Assumptions & Site Inspection Verification Checklist */}
      <div className="bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CBD2CA] pb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#0F2D24]">verified</span>
            <h2 className="font-headline text-xs font-bold text-[#1A2421] uppercase tracking-wider">
              Engineering Model Specifications &amp; Inspection Protocol
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E1EBE6] text-[#0F2D24] border border-[#CBD8D2]">
            Dheera Green Infra Specification
          </span>
        </div>

        {/* Technical Constants Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-2.5 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
            <span className="text-[10px] text-[#606D69] block">Yield (Nominal / Eff)</span>
            <span className="font-bold text-[#1A2421]">1,420 / 1,334.8</span>
            <span className="text-[10px] text-[#606D69] block">kWh/kWp/yr (0.94 derate)</span>
          </div>

          <div className="p-2.5 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
            <span className="text-[10px] text-[#606D69] block">RCC Space Ratio</span>
            <span className="font-bold text-[#1A2421]">{ENGINEERING_ASSUMPTIONS.terraceAreaPerKwpSqFt} sq.ft</span>
            <span className="text-[10px] text-[#606D69] block">per kWp clearance</span>
          </div>

          <div className="p-2.5 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
            <span className="text-[10px] text-[#606D69] block">DERC Net-Meter Cap</span>
            <span className="font-bold text-[#1A2421]">{ENGINEERING_ASSUMPTIONS.maxSanctionedLoadCapPercentage}%</span>
            <span className="text-[10px] text-[#606D69] block">of Connected Load</span>
          </div>

          <div className="p-2.5 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
            <span className="text-[10px] text-[#606D69] block">Subsidy Ceiling</span>
            <span className="font-bold text-[#0F2D24]">₹78,000</span>
            <span className="text-[10px] text-[#606D69] block">PM Surya Ghar (3kWp+)</span>
          </div>
        </div>

        {/* Provisional Model Disclaimer Alert */}
        <AlertBanner
          variant="assumption"
          code="[PROVISIONAL MODEL ASSUMPTION]"
          title="On-Site Engineering Verification Protocol"
        >
          The parameters below represent provisional engineering simulation thresholds adopted for analytical feasibility planning. They do not constitute formal regulatory approval or statutory certifications, and must be validated through physical site inspection before DISCOM Form A submission:
        </AlertBanner>

        {/* Mandatory Verification Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-[#F4F5F0] rounded border border-[#CBD2CA] flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#0F2D24] mt-0.5 shrink-0">wb_sunny</span>
            <div>
              <span className="font-semibold text-[#1A2421] block">Shadow Profiling Window (&ge;94%)</span>
              <span className="text-[11px] text-[#606D69]">Provisional baseline: verify &ge;94% shadow-free sunshine between 09:00 and 16:00 IST using solar pathfinder or 3D scan.</span>
            </div>
          </div>

          <div className="p-2 bg-[#F4F5F0] rounded border border-[#CBD2CA] flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#0F2D24] mt-0.5 shrink-0">architecture</span>
            <div>
              <span className="font-semibold text-[#1A2421] block">Structural Load-Bearing (&ge;25 kg/m²)</span>
              <span className="text-[11px] text-[#606D69]">Provisional threshold: confirm RCC terrace dead-load capacity meets or exceeds 25 kg/m² for ballasted or anchored frames.</span>
            </div>
          </div>

          <div className="p-2 bg-[#F4F5F0] rounded border border-[#CBD2CA] flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#0F2D24] mt-0.5 shrink-0">electric_meter</span>
            <div>
              <span className="font-semibold text-[#1A2421] block">Distribution Transformer Margin (&gt;15%)</span>
              <span className="text-[11px] text-[#606D69]">Provisional simulation assumption: verify local BSES/TPDDL transformer has &gt;15% reverse power feeding headroom.</span>
            </div>
          </div>

          <div className="p-2 bg-[#F4F5F0] rounded border border-[#CBD2CA] flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#0F2D24] mt-0.5 shrink-0">electrical_services</span>
            <div>
              <span className="font-semibold text-[#1A2421] block">Bi-Directional AMR Meter Line</span>
              <span className="text-[11px] text-[#606D69]">Inspect service intake line to verify readiness for DISCOM smart net-meter swap and earthing pit resistance &le; 5Ω.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation & Action Footer Deck */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigateTo('/regulations')}
          className="w-full sm:flex-1 h-11 bg-[#0F2D24] hover:bg-[#163A2F] text-white rounded font-headline text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <span>Proceed to Regulatory Screening</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>

        <button
          type="button"
          onClick={() => setIsExportModalOpen(true)}
          className="w-full sm:w-auto px-5 h-11 bg-white hover:bg-[#F4F5F0] text-[#1A2421] border border-[#CBD2CA] rounded font-headline text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px] text-[#0F2D24]">download</span>
          <span>Download Feasibility Dossier (.PDF)</span>
        </button>
      </div>

      {/* Report Export Modal */}
      <ReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        defaultReportType="feasibility"
      />

    </div>
  );
};
