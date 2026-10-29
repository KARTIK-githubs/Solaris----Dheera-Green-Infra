import React, { useState, useEffect } from 'react';
import { AlertBanner } from '../components/common/AlertBanner';
import { apiClient } from '../services/apiClient';
import { SOLAR_METRICS, ENGINEERING_ASSUMPTIONS } from '../utils/solarCalculations';

interface MaintenanceItem {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'routine';
  status: 'scheduled' | 'investigating' | 'resolved';
  component: string;
  reportedDate: string;
  assignedEngineer: string;
  resolutionDate?: string;
  description: string;
}

const SYNTHETIC_MAINTENANCE_LOG: MaintenanceItem[] = [
  {
    id: 'TKT-2026-041',
    title: 'Post-Monsoon Array Washdown & Seasonal Tilt Inspection',
    severity: 'routine',
    status: 'scheduled',
    component: 'Array #1 & Racking Framework (12 kWp)',
    reportedDate: '2026-10-18',
    assignedEngineer: 'SunPro Field Services (Eng. Sumit Kumar)',
    resolutionDate: '2026-10-25',
    description: 'Scheduled quarterly panel surface washdown with deionized water. Tilt angle verification (28° south-facing) for winter insolation optimisation.'
  },
  {
    id: 'TKT-2026-039',
    title: 'RS-485 Modbus / 4G AMR Gateway Packet Latency Check',
    severity: 'medium',
    status: 'investigating',
    component: 'BSES Rajdhani Bi-Directional AMR Gateway',
    reportedDate: '2026-10-20',
    assignedEngineer: 'BRPL Sub-Division Telemetry Desk',
    resolutionDate: '2026-10-24',
    description: 'Intermittent 4G packet transmission drop between rooftop generation check meter and discom central billing server. Modbus RS-485 wiring intact.'
  },
  {
    id: 'TKT-2026-035',
    title: 'Surge Protection Device (SPD) Earth Pit Resistance Test',
    severity: 'low',
    status: 'resolved',
    component: 'AC/DC Distribution Board Grounding Pit #2',
    reportedDate: '2026-09-28',
    assignedEngineer: 'Lead Electrician R. Sharma',
    resolutionDate: '2026-09-30',
    description: 'Annual earth resistance test confirmed 1.28 Ohms, complying with CEA 2023 statutory ceiling of 5.0 Ohms. Chemical compound renewed.'
  },
  {
    id: 'TKT-2026-031',
    title: 'Inverter Firmware Update & Anti-Islanding Trip Calibration',
    severity: 'low',
    status: 'resolved',
    component: 'SMA Sunny Tripower 12.0 Inverter',
    reportedDate: '2026-10-14',
    assignedEngineer: 'OEM Certified Technician',
    resolutionDate: '2026-10-15',
    description: 'Upgraded grid-tied inverter firmware to v3.12. IEEE 1547 / CEA anti-islanding trip response benchmarked at 180 ms (target < 200 ms).'
  },
  {
    id: 'TKT-2026-024',
    title: 'String #2 Open-Circuit Voltage (Voc) Diagnostic Sweep',
    severity: 'medium',
    status: 'resolved',
    component: 'DC Array String Combiner Box',
    reportedDate: '2026-09-15',
    assignedEngineer: 'Site Commissioning Engineer',
    resolutionDate: '2026-09-16',
    description: 'Investigated 3.8% voltage variance between String 1 and String 2. Traced to shading on lower panel row from parapet edge; module repositioned.'
  }
];

export const MonitoringPage: React.FC = () => {
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceItem | null>(null);
  const [backendHealth, setBackendHealth] = useState<{
    status: string;
    database: { status: string; name?: string; host?: string; port?: number };
    isSyntheticDataEnforced?: boolean;
  } | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(() => new Date().toLocaleTimeString('en-IN'));
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsLoadingHealth(true);
    setFetchError(null);
    try {
      const res = await apiClient.checkHealth();
      if (res.status === 'ok' || res.success) {
        setBackendHealth(res as any);
      } else {
        setFetchError(res.error || 'Backend reported non-operational status');
      }
    } catch (err: any) {
      setFetchError(err.message || 'Failed to reach API server');
    } finally {
      setIsLoadingHealth(false);
      setLastRefreshedAt(new Date().toLocaleTimeString('en-IN'));
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const nominalAnnual = SOLAR_METRICS.NOMINAL_ANNUAL_YIELD_KWH_PER_KWP;
  const deratingFactor = SOLAR_METRICS.DEFAULT_DERATING_FACTOR;
  const effectiveAnnual = SOLAR_METRICS.EFFECTIVE_ANNUAL_YIELD_KWH_PER_KWP;
  const referenceCapacityKw = 12.0;
  const annualGenKwh = Math.round(referenceCapacityKw * effectiveAnnual);
  const dailyGenKwh = Math.round((annualGenKwh / 365) * 10) / 10;
  const co2AvoidedTonnes = Math.round((annualGenKwh * 0.00082) * 100) / 100;

  return (
    <div className="flex flex-col w-full pb-16 max-w-5xl mx-auto px-4 space-y-6 animate-in fade-in">
      
      {/* Page Header */}
      <div className="pt-2 border-b border-[#D6DFD8] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E1EBE6] text-[#0F2D24] text-[11px] font-mono font-bold tracking-wider uppercase mb-1.5 border border-[#0F2D24]/20">
              <span className="material-symbols-outlined text-[14px]">query_stats</span>
              <span>Modelled PV Telemetry · Commissioning Simulation</span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#002620] tracking-tight">
              Modelled PV Performance &amp; Simulated Telemetry
            </h1>
            <p className="text-xs sm:text-sm text-[#404846] mt-1 max-w-2xl leading-relaxed">
              Commissioning performance model, simulated inverter electrical characteristics, and plant operations &amp; maintenance records for the 12.0 kWp Gulmohar Enclave reference array.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={fetchStatus}
              disabled={isLoadingHealth}
              className="px-3 py-1.5 rounded bg-white hover:bg-[#F4F5F0] text-[#0F2D24] text-xs font-mono font-bold border border-[#D6DFD8] flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-60"
              title="Refresh telemetry health status"
            >
              <span className={`material-symbols-outlined text-[15px] ${isLoadingHealth ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>{isLoadingHealth ? 'Checking...' : 'Refresh Telemetry'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mandatory Regulatory & Synthetic Data Disclaimer */}
      <AlertBanner
        variant="warning"
        code="[SYNTHETIC COMMISSIONING TELEMETRY — NO HARDWARE IOT STREAMING]"
        title="Simulated Inverter Data & Modelled Performance Notification"
      >
        <p className="text-xs leading-relaxed text-[#422000]">
          This monitoring console presents <strong>modelled solar photovoltaic performance</strong> generated from the canonical Delhi insolation model ({nominalAnnual} kWh/kWp/year nominal with an explicitly documented {deratingFactor} derating factor, yielding {effectiveAnnual.toFixed(1)} kWh/kWp/year). 
          <strong> No real-time physical inverter hardware, smart meter RS-485 feed, or DISCOM AMR connection is streaming live data.</strong> All current outputs, grid frequencies, daily cumulative production totals, and maintenance tickets are simulated demonstration records for academic review and feasibility demonstration.
        </p>
      </AlertBanner>

      {/* Backend & Persistence Status Ribbon */}
      <div className="bg-white rounded-lg p-3.5 border border-[#D6DFD8] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${backendHealth?.database?.status === 'connected' ? 'bg-[#00725d] animate-pulse' : 'bg-[#D9822B]'}`} />
            <span className="font-mono font-bold text-[#002620]">
              Backend API &amp; MongoDB:
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
              backendHealth?.database?.status === 'connected' 
                ? 'bg-[#E1EBE6] text-[#0F2D24] border border-[#0F2D24]/20'
                : 'bg-[#FFF8E6] text-[#D9822B] border border-[#D9822B]/30'
            }`}>
              {backendHealth?.database?.status === 'connected' 
                ? `ONLINE (${backendHealth.database.name || 'solaris_dheera'})` 
                : 'OFFLINE / LOCAL SIMULATION'}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-[#717976] border-l border-[#D6DFD8] pl-3">
            <span className="material-symbols-outlined text-[14px]">security</span>
            <span className="text-[11px]">Server Synthetic Enforcement: <strong>{backendHealth?.isSyntheticDataEnforced !== false ? 'ACTIVE' : 'INACTIVE'}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[#717976] text-[11px] font-mono">
          <span>Last Synchronized: <strong>{lastRefreshedAt}</strong></span>
          {fetchError && (
            <span className="text-[#BA1A1A] font-semibold" title={fetchError}>
              (Sync Issue: {fetchError.substring(0, 32)}...)
            </span>
          )}
        </div>
      </div>

      {/* Primary Engineering KPI Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Metric 1: Inverter State */}
        <div className="bg-white rounded-lg p-4 border border-[#D6DFD8] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#717976] uppercase tracking-wider">
                Inverter Operational State
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#E1EBE6] text-[#0F2D24] text-[10px] font-mono font-bold">
                GRID-TIED
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-headline text-2xl font-bold text-[#002620]">Online</span>
              <span className="text-xs text-[#00725d] font-mono font-bold">Synchronized</span>
            </div>
            <p className="text-[11px] text-[#717976] mt-1">
              SMA STP 12.0 Reference Inverter
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#F4F5F0] grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <span className="text-[#717976] block text-[10px]">Grid Freq</span>
              <span className="font-bold text-[#002620]">50.02 Hz</span>
            </div>
            <div>
              <span className="text-[#717976] block text-[10px]">Heat Sink</span>
              <span className="font-bold text-[#002620]">41.8 °C</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Instantaneous Power */}
        <div className="bg-white rounded-lg p-4 border border-[#D6DFD8] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#717976] uppercase tracking-wider">
                Instantaneous AC Output
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#FFDEA7] text-[#422000] text-[10px] font-mono font-bold">
                SIMULATED
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-headline text-2xl font-bold text-[#002620] font-mono">8.92</span>
              <span className="text-xs font-mono font-bold text-[#717976]">kW AC</span>
            </div>
            <p className="text-[11px] text-[#00725d] font-mono font-semibold mt-1">
              74.3% of 12.0 kWp rated capacity
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#F4F5F0] grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <span className="text-[#717976] block text-[10px]">String 1 DC</span>
              <span className="font-bold text-[#002620]">382V · 11.6A</span>
            </div>
            <div>
              <span className="text-[#717976] block text-[10px]">String 2 DC</span>
              <span className="font-bold text-[#002620]">384V · 11.7A</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Daily Generation */}
        <div className="bg-white rounded-lg p-4 border border-[#D6DFD8] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#717976] uppercase tracking-wider">
                Today's Cumulative Yield
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#E1EBE6] text-[#0F2D24] text-[10px] font-mono font-bold">
                CANONICAL
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-headline text-2xl font-bold text-[#002620] font-mono">48.2</span>
              <span className="text-xs font-mono font-bold text-[#717976]">kWh</span>
            </div>
            <p className="text-[11px] text-[#717976] mt-1 font-mono">
              Expected daily mean: <strong className="text-[#002620]">{dailyGenKwh} kWh</strong>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#F4F5F0] grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <span className="text-[#717976] block text-[10px]">Target Adherence</span>
              <span className="font-bold text-[#00725d]">96.4%</span>
            </div>
            <div>
              <span className="text-[#717976] block text-[10px]">Peak Sun Hours</span>
              <span className="font-bold text-[#002620]">4.1 h</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Performance Ratio */}
        <div className="bg-white rounded-lg p-4 border border-[#D6DFD8] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#717976] uppercase tracking-wider">
                Performance Ratio (PR)
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#E1EBE6] text-[#0F2D24] text-[10px] font-mono font-bold">
                IEC 61724
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-headline text-2xl font-bold text-[#00725d] font-mono">82.4%</span>
            </div>
            <p className="text-[11px] text-[#717976] mt-1 font-mono">
              Contractual baseline target: &ge; 80.0%
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#F4F5F0] grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <span className="text-[#717976] block text-[10px]">Insolation</span>
              <span className="font-bold text-[#002620]">820 W/m²</span>
            </div>
            <div>
              <span className="text-[#717976] block text-[10px]">Temp Derate</span>
              <span className="font-bold text-[#002620]">-0.38%/°C</span>
            </div>
          </div>
        </div>

      </div>

      {/* Technical Electrical Diagnostics & Yield Model Invariant Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Electrical & Grid Substation Interconnection Parameters */}
        <div className="bg-white rounded-lg p-4 border border-[#D6DFD8] shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#F4F5F0] pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0F2D24] text-[18px]">electrical_services</span>
              <h3 className="font-headline text-sm font-bold text-[#002620]">
                Simulated 3-Phase AC Substation Interconnection
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-[#717976]">
              DT-14B BRPL Feeder
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-2.5 rounded bg-[#F8FAF7] border border-[#D6DFD8]">
              <span className="text-[10px] font-mono text-[#717976] block">Phase L1-N</span>
              <span className="font-mono text-sm font-bold text-[#002620]">231.2 V</span>
              <span className="text-[10px] text-[#00725d] font-mono block">12.8 A</span>
            </div>
            <div className="p-2.5 rounded bg-[#F8FAF7] border border-[#D6DFD8]">
              <span className="text-[10px] font-mono text-[#717976] block">Phase L2-N</span>
              <span className="font-mono text-sm font-bold text-[#002620]">229.8 V</span>
              <span className="text-[10px] text-[#00725d] font-mono block">12.9 A</span>
            </div>
            <div className="p-2.5 rounded bg-[#F8FAF7] border border-[#D6DFD8]">
              <span className="text-[10px] font-mono text-[#717976] block">Phase L3-N</span>
              <span className="font-mono text-sm font-bold text-[#002620]">230.5 V</span>
              <span className="text-[10px] text-[#00725d] font-mono block">12.7 A</span>
            </div>
          </div>

          <div className="space-y-2 text-xs font-mono pt-1">
            <div className="flex items-center justify-between p-2 rounded bg-[#F8FAF7]">
              <span className="text-[#717976]">Power Factor (Discom Interconnection):</span>
              <span className="font-bold text-[#002620]">0.992 Lagging (Target &ge; 0.95)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-[#F8FAF7]">
              <span className="text-[#717976]">Inverter CEC Weighted Efficiency:</span>
              <span className="font-bold text-[#002620]">97.4% (Euro Efficiency 96.8%)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-[#F8FAF7]">
              <span className="text-[#717976]">Total Harmonic Distortion (THD-i):</span>
              <span className="font-bold text-[#00725d]">1.8% (CEA Ceiling &lt; 5.0%)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-[#F8FAF7]">
              <span className="text-[#717976]">Distribution Transformer Spare Headroom:</span>
              <span className="font-bold text-[#002620]">42.0 kW (58% DT Saturation)</span>
            </div>
          </div>
        </div>

        {/* Canonical Yield Model Reference & Verification */}
        <div className="bg-white rounded-lg p-4 border border-[#D6DFD8] shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#F4F5F0] pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0F2D24] text-[18px]">verified</span>
              <h3 className="font-headline text-sm font-bold text-[#002620]">
                Canonical Model Reference Parameters
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-[#D9822B]">
              Deterministic
            </span>
          </div>

          <div className="p-3 rounded bg-[#F8FAF7] border border-[#D6DFD8] space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[#717976]">Reference Plant Capacity:</span>
              <span className="font-bold text-[#002620]">{referenceCapacityKw}.0 kWp DC</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#717976]">Nominal Annual Yield:</span>
              <span className="font-bold text-[#002620]">{nominalAnnual.toLocaleString('en-IN')} kWh/kWp/yr</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#717976]">Model Derating Factor:</span>
              <span className="font-bold text-[#002620]">{deratingFactor} (applied exactly once)</span>
            </div>
            <div className="flex items-center justify-between border-t border-[#D6DFD8] pt-1.5">
              <span className="text-[#0F2D24] font-bold">Effective Annual Specific Yield:</span>
              <span className="font-bold text-[#00725d] text-sm">{effectiveAnnual.toFixed(1)} kWh/kWp/yr</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#0F2D24] font-bold">Projected Annual Production:</span>
              <span className="font-bold text-[#002620]">{annualGenKwh.toLocaleString('en-IN')} kWh/yr</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#717976]">Estimated Avoided Carbon:</span>
              <span className="font-bold text-[#00725d]">{co2AvoidedTonnes} tonnes CO₂/yr</span>
            </div>
          </div>

          <p className="text-[11px] text-[#717976] leading-relaxed">
            Carbon offset calculation uses the Central Electricity Authority (CEA) Version 19 grid emission factor of 0.82 kg CO₂/kWh for the Northern Regional Grid.
          </p>
        </div>

      </div>

      {/* Synthetic Maintenance & O&M Work Orders Table */}
      <div className="bg-white rounded-lg p-4 border border-[#D6DFD8] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F4F5F0] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0F2D24] text-[18px]">build</span>
              <h2 className="font-headline text-base font-bold text-[#002620]">
                Synthetic Plant Maintenance &amp; Servicing Log
              </h2>
              <span className="px-2 py-0.5 rounded bg-[#FFDEA7] text-[#422000] text-[10px] font-mono font-bold uppercase">
                Synthetic Demo Log
              </span>
            </div>
            <p className="text-xs text-[#717976] mt-0.5">
              Illustrative plant servicing tickets, anti-islanding certifications, and calibration records.
            </p>
          </div>
          <span className="text-xs font-mono text-[#717976]">
            {SYNTHETIC_MAINTENANCE_LOG.length} simulated work orders recorded
          </span>
        </div>

        {/* Dense Engineering Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#D6DFD8] bg-[#F8FAF7] text-[11px] font-mono font-bold text-[#717976] uppercase">
                <th className="py-2.5 px-3">Ticket ID</th>
                <th className="py-2.5 px-3">Component / System</th>
                <th className="py-2.5 px-3">Service Action</th>
                <th className="py-2.5 px-3 text-center">Severity</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Reported</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F5F0] font-mono">
              {SYNTHETIC_MAINTENANCE_LOG.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                return (
                  <tr
                    key={ticket.id}
                    onClick={() => setSelectedTicket(isSelected ? null : ticket)}
                    className={`cursor-pointer transition-colors hover:bg-[#F4F5F0] ${isSelected ? 'bg-[#E1EBE6]/50' : ''}`}
                  >
                    <td className="py-2.5 px-3 font-bold text-[#002620]">{ticket.id}</td>
                    <td className="py-2.5 px-3 text-[#404846] max-w-[200px] truncate" title={ticket.component}>
                      {ticket.component}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-[#002620] max-w-[280px] truncate">
                      {ticket.title}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        ticket.severity === 'high'
                          ? 'bg-[#FFDAD6] text-[#93000A]'
                          : ticket.severity === 'medium'
                          ? 'bg-[#FFDEA7] text-[#422000]'
                          : 'bg-[#F4F5F0] text-[#404846]'
                      }`}>
                        {ticket.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        ticket.status === 'resolved'
                          ? 'bg-[#E1EBE6] text-[#0F2D24]'
                          : ticket.status === 'investigating'
                          ? 'bg-[#FFDEA7] text-[#422000]'
                          : 'bg-[#F4F5F0] text-[#717976]'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#717976]">
                      {ticket.reportedDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Selected Ticket Drawer / Detail View */}
        {selectedTicket && (
          <div className="p-3.5 rounded-lg bg-[#F8FAF7] border border-[#D6DFD8] space-y-2 animate-in fade-in text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#0F2D24] text-sm">{selectedTicket.id}</span>
                <span className="font-sans font-bold text-[#002620]">{selectedTicket.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="text-[#717976] hover:text-[#002620] text-xs font-mono"
              >
                [Close Detail]
              </button>
            </div>
            <p className="text-[#404846] leading-relaxed font-sans">{selectedTicket.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-[#717976]">
              <div>Component: <strong className="text-[#002620]">{selectedTicket.component}</strong></div>
              <div>Engineer: <strong className="text-[#002620]">{selectedTicket.assignedEngineer}</strong></div>
              <div>Target Resolution: <strong className="text-[#002620]">{selectedTicket.resolutionDate || 'Completed'}</strong></div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

