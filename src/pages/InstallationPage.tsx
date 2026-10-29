import React from 'react';
import { useApp } from '../context/AppContext';

export const InstallationPage: React.FC = () => {
  const { currentUser, navigateTo } = useApp();

  return (
    <div className="flex flex-col w-full px-4 pb-16 space-y-6 max-w-5xl mx-auto animate-in fade-in">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-b border-[#e2f0f9] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#9af4d8]/60 text-[#00725d] text-[11px] font-semibold mb-1">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            <span>Commissioned &amp; Grid-Connected · 14 Jan 2026</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl text-[#002620] tracking-tight font-bold">
            My Solar Installation
          </h1>
          <p className="text-xs sm:text-sm text-[#404846]">
            Complete technical specification and equipment bill of materials for your rooftop solar plant installed by Dheera Green Infra.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateTo('/documents')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#c0c8c5]/60 hover:bg-[#f4faff] text-xs font-semibold text-[#002620] shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>Handover Dossier</span>
          </button>
          <button
            onClick={() => navigateTo('/support')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#002620] hover:bg-[#003d34] text-xs font-semibold text-[#9af4d8] shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">build</span>
            <span>Request Inspection</span>
          </button>
        </div>
      </div>

      {/* Primary Plant Summary Banner */}
      <div className="bg-gradient-to-r from-[#002620] to-[#004d3e] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#9af4d8]/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-[#9af4d8] font-mono block">System Capacity</span>
            <span className="font-headline text-2xl sm:text-3xl font-bold tracking-tight text-white block mt-0.5">6.8 kWp</span>
            <span className="text-[11px] text-[#e2f0f9]/80">6.0 kW AC Inverter Rating</span>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-[#9af4d8] font-mono block">Utility Sanction</span>
            <span className="font-headline text-2xl sm:text-3xl font-bold tracking-tight text-white block mt-0.5">BRPL</span>
            <span className="text-[11px] text-[#e2f0f9]/80">CA #{currentUser.consumerNumber} (7 kW Net)</span>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-[#9af4d8] font-mono block">Mounting Type</span>
            <span className="font-headline text-2xl sm:text-3xl font-bold tracking-tight text-white block mt-0.5">Elevated</span>
            <span className="text-[11px] text-[#e2f0f9]/80">Pergola Mount · 35mm Lift</span>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-[#9af4d8] font-mono block">Workmanship Warranty</span>
            <span className="font-headline text-2xl sm:text-3xl font-bold tracking-tight text-[#ffdea7] block mt-0.5">5 Years</span>
            <span className="text-[11px] text-[#e2f0f9]/80">Comprehensive Dheera O&amp;M</span>
          </div>
        </div>
      </div>

      {/* Equipment Bill of Materials (BOM) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-lg text-[#002620] font-bold tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-[#006b57]">inventory_2</span>
            <span>Installed Equipment Bill of Materials</span>
          </h2>
          <span className="text-xs text-[#717976] font-mono">DHI-BOM-2026-VK418</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: Solar Modules */}
          <div className="bg-white p-5 rounded-xl border border-[#e2f0f9] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#d1fae5] text-[#065f46]">
                    PV Modules
                  </span>
                  <h3 className="font-headline text-base font-bold text-[#002620] mt-1.5">
                    Waaree 570Wp Bifacial TOPCon
                  </h3>
                  <p className="text-xs text-[#404846] mt-0.5">
                    N-Type Dual Glass Monocrystalline Modules
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#e2f0f9] flex items-center justify-center text-[#006b57] shrink-0">
                  <span className="material-symbols-outlined text-[24px]">solar_power</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-[#e2f0f9] pt-3">
                <div>
                  <span className="text-[#717976] block text-[11px]">Quantity</span>
                  <span className="font-semibold text-[#002620]">12 Panels (2 Strings × 6)</span>
                </div>
                <div>
                  <span className="text-[#717976] block text-[11px]">Efficiency</span>
                  <span className="font-semibold text-[#002620]">22.1% Module Eff.</span>
                </div>
                <div>
                  <span className="text-[#717976] block text-[11px]">Temperature Coeff.</span>
                  <span className="font-semibold text-[#002620]">-0.30% / °C (High Heat)</span>
                </div>
                <div>
                  <span className="text-[#717976] block text-[11px]">Certifications</span>
                  <span className="font-semibold text-[#002620]">IEC 61215 / IEC 61730</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#e2f0f9] flex items-center justify-between text-xs">
              <span className="text-[#006b57] font-semibold">25-Year Linear Power Warranty</span>
              <span className="text-[#717976] font-mono text-[11px]">84.8% Year 25</span>
            </div>
          </div>

          {/* Card 2: Grid-Tied Inverter */}
          <div className="bg-white p-5 rounded-xl border border-[#e2f0f9] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#dbeafe] text-[#1e40af]">
                    Solar Inverter
                  </span>
                  <h3 className="font-headline text-base font-bold text-[#002620] mt-1.5">
                    SMA Sunny Tripower 6.0 kW
                  </h3>
                  <p className="text-xs text-[#404846] mt-0.5">
                    Three-Phase Grid-Tied Inverter (STP6.0-3AV-40)
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#e2f0f9] flex items-center justify-center text-[#006b57] shrink-0">
                  <span className="material-symbols-outlined text-[24px]">developer_board</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-[#e2f0f9] pt-3">
                <div>
                  <span className="text-[#717976] block text-[11px]">MPPT Trackers</span>
                  <span className="font-semibold text-[#002620]">Dual Independent MPPT</span>
                </div>
                <div>
                  <span className="text-[#717976] block text-[11px]">Peak Efficiency</span>
                  <span className="font-semibold text-[#002620]">98.2% Euro-ETA</span>
                </div>
                <div>
                  <span className="text-[#717976] block text-[11px]">Protection</span>
                  <span className="font-semibold text-[#002620]">Integrated AFCI &amp; Anti-Islanding</span>
                </div>
                <div>
                  <span className="text-[#717976] block text-[11px]">Enclosure Rating</span>
                  <span className="font-semibold text-[#002620]">IP65 Outdoor Cast</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#e2f0f9] flex items-center justify-between text-xs">
              <span className="text-[#006b57] font-semibold">10-Year Manufacturer Warranty</span>
              <span className="text-[#717976] font-mono text-[11px]">SMA Germany</span>
            </div>
          </div>

          {/* Card 3: Mounting & Civil Structure */}
          <div className="bg-white p-5 rounded-xl border border-[#e2f0f9] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#fef3c7] text-[#92400e]">
                    Mounting &amp; Structure
                  </span>
                  <h3 className="font-headline text-base font-bold text-[#002620] mt-1.5">
                    Elevated HDG Pergola Superstructure
                  </h3>
                  <p className="text-xs text-[#404846] mt-0.5">
                    High-Grade Anodized Extruded Aluminium &amp; HDG Steel
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#e2f0f9] flex items-center justify-center text-[#006b57] shrink-0">
                  <span className="material-symbols-outlined text-[24px]">foundation</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-[#e2f0f9] pt-3">
                <div>
                  <span className="text-[#717976] block text-[11px]">Wind Load Rating</span>
                  <span className="font-semibold text-[#002620]">150 km/h (IS 875 Part 3)</span>
                </div>
                <div>
                  <span className="text-[#717976] block text-[11px]">Terrace Clearance</span>
                  <span className="font-semibold text-[#002620]">2.2m Full Walkable Height</span>
                </div>
                <div>
                  <span className="text-[#717976] block text-[11px]">Fasteners</span>
                  <span className="font-semibold text-[#002620]">SS304 Anti-Corrosive Bolts</span>
                </div>
                <div>
                  <span className="text-[#717976] block text-[11px]">Tilt Angle</span>
                  <span className="font-semibold text-[#002620]">28° South-Facing Optimized</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#e2f0f9] flex items-center justify-between text-xs">
              <span className="text-[#006b57] font-semibold">25-Year Structural Integrity Warranty</span>
              <span className="text-[#717976] font-mono text-[11px]">Dheera Certified</span>
            </div>
          </div>

          {/* Card 4: Electrical Safety & Protection */}
          <div className="bg-white p-5 rounded-xl border border-[#e2f0f9] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#f3e8ff] text-[#6b21a8]">
                    Balance of System (BOS)
                  </span>
                  <h3 className="font-headline text-base font-bold text-[#002620] mt-1.5">
                    Safety &amp; Protection Suite
                  </h3>
                  <p className="text-xs text-[#404846] mt-0.5">
                    Surge Arresters, Dedicated Earthing &amp; Net Metering
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#e2f0f9] flex items-center justify-center text-[#006b57] shrink-0">
                  <span className="material-symbols-outlined text-[24px]">electric_meter</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-[#e2f0f9] pt-3">
                <div>
                  <span className="text-[#717976] block text-[11px]">DC &amp; AC SPDs</span>
                  <span className="font-semibold text-[#002620]">Type II Surge Protectors</span>
                </div>
                <div>
                  <span className="text-[#717976] block text-[11px]">Earthing Pits</span>
                  <span className="font-semibold text-[#002620]">Dual Chemical Pits (&lt;1.4 Ω)</span>
                </div>
                <div>
                  <span className="text-[#717976] block text-[11px]">Solar Cabling</span>
                  <span className="font-semibold text-[#002620]">Havells 4 sq.mm UV Crosslinked</span>
                </div>
                <div>
                  <span className="text-[#717976] block text-[11px]">DISCOM Meter</span>
                  <span className="font-semibold text-[#002620]">L&amp;T Class 1.0 Bi-directional</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#e2f0f9] flex items-center justify-between text-xs">
              <span className="text-[#006b57] font-semibold">CEA Safety Regulations 2023</span>
              <span className="text-[#717976] font-mono text-[11px]">DISCOM Inspected</span>
            </div>
          </div>

        </div>
      </div>

      {/* Commissioning & Handover Details */}
      <div className="bg-[#f4faff] rounded-xl p-5 border border-[#e2f0f9]">
        <h3 className="font-headline text-sm font-bold text-[#002620] mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#006b57] text-[18px]">verified_user</span>
          <span>Dheera Green Engineering Sign-Off &amp; Commissioning Audit</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-[#717976] block text-[11px]">Commissioning Engineer</span>
            <span className="font-semibold text-[#002620]">Er. Ankit Sharma, Sr. Project Lead</span>
            <span className="text-[11px] text-[#404846] block">Dheera Green Infra Pvt Ltd</span>
          </div>
          <div>
            <span className="text-[#717976] block text-[11px]">Pre-Commissioning Insulation Test</span>
            <span className="font-semibold text-[#006b57]">Passed (120 MΩ @ 1000V DC)</span>
            <span className="text-[11px] text-[#404846] block">Zero leakage to earth ground</span>
          </div>
          <div>
            <span className="text-[#717976] block text-[11px]">DISCOM Bi-Directional Net Meter</span>
            <span className="font-semibold text-[#006b57]">Synchronized &amp; Sealed</span>
            <span className="text-[11px] text-[#404846] block">BRPL Sub-division Vasant Kunj</span>
          </div>
        </div>
      </div>

    </div>
  );
};
