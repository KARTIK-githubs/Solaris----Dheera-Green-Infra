import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const DashboardPage: React.FC = () => {
  const { currentUser, navigateTo, workspaceMode, setWorkspaceMode, setIsAiModalOpen } = useApp();
  const [activeModelRange, setActiveModelRange] = useState<'30day' | 'annual'>('30day');

  return (
    <div className="flex flex-col w-full px-4 pb-16 space-y-5 max-w-5xl mx-auto animate-in fade-in">
      
      {/* Employee Workspace Quick-Switch Notice (If user is viewing dashboard while in employee mode or wants to switch) */}
      {workspaceMode === 'employee' ? (
        <div className="bg-[#002620] text-white rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#9af4d8] text-[20px]">engineering</span>
            <div className="text-xs">
              <strong className="text-[#9af4d8]">Employee Workspace Active:</strong> You are viewing the customer portal preview. Access engineering calculators, solver, and roster below.
            </div>
          </div>
          <button
            onClick={() => navigateTo('/assessment')}
            className="px-3 py-1.5 rounded-lg bg-[#9af4d8] text-[#002620] text-xs font-bold hover:bg-white transition-colors shrink-0"
          >
            Engineering Tools
          </button>
        </div>
      ) : (
        <div className="w-full bg-[#f4faff] rounded-xl p-3 flex items-center justify-between gap-3 border border-[#e2f0f9]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-[#006b57] text-[20px] shrink-0">solar_power</span>
            <p className="text-xs text-[#404846] truncate">
              <strong className="text-[#002620]">Rooftop Plant Active:</strong> 6.8 kWp Bifacial Array · SMA Sunny Tripower Inverter Online · 0 Faults.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#065f46] shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse"></span>
            Grid Synced
          </span>
        </div>
      )}

      {/* Customer Welcome & Identification Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#9af4d8]/60 text-[#00725d] text-[11px] font-semibold mb-1">
            <span className="material-symbols-outlined text-[14px]">home</span>
            <span>Dheera Green Installed Customer · CA #{currentUser.consumerNumber}</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl text-[#002620] tracking-tight font-bold">
            Welcome back, {currentUser.name.split(' ')[0]}.
          </h1>
          <p className="text-xs sm:text-sm text-[#404846]">
            Your rooftop solar system is generating clean power and reducing your BRPL electricity bill.
          </p>
        </div>

        {/* Top Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#002620] hover:bg-[#003d34] text-xs font-semibold text-[#9af4d8] shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[17px]">psychology</span>
            <span>Ask Solar Assistant</span>
          </button>
          <button
            onClick={() => navigateTo('/support')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#c0c8c5]/60 hover:bg-[#f4faff] text-xs font-semibold text-[#002620] shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">build</span>
            <span>Request Service</span>
          </button>
        </div>
      </div>

      {/* The 4 Core Customer Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Card 1: Monthly Savings */}
        <button
          type="button"
          onClick={() => navigateTo('/savings')}
          className="bg-white p-4 rounded-xl shadow-sm border border-[#e2f0f9] flex flex-col justify-between text-left hover:border-[#006b57]/40 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-[#717976] font-medium">Monthly Bill Savings</span>
            <span className="material-symbols-outlined text-[#006b57] text-[20px]">currency_rupee_circle</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-headline text-2xl text-[#002620] font-bold tracking-tight">
                ₹3,480
              </span>
              <span className="text-xs text-[#717976]">/mo</span>
            </div>
            <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#d1fae5] text-[#065f46]">
              -70.7% bill offset
            </span>
          </div>
        </button>

        {/* Card 2: Installed Solar Capacity */}
        <button
          type="button"
          onClick={() => navigateTo('/installation')}
          className="bg-white p-4 rounded-xl shadow-sm border border-[#e2f0f9] flex flex-col justify-between text-left hover:border-[#006b57]/40 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-[#717976] font-medium">Installed System</span>
            <span className="material-symbols-outlined text-[#006b57] text-[20px]">solar_power</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-headline text-2xl text-[#002620] font-bold tracking-tight">
                6.8
              </span>
              <span className="text-xs text-[#717976]">kWp</span>
            </div>
            <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e2f0f9] text-[#002620]">
              12 Waaree TOPCon
            </span>
          </div>
        </button>

        {/* Card 3: Energy Generated This Month */}
        <button
          type="button"
          onClick={() => navigateTo('/performance')}
          className="bg-white p-4 rounded-xl shadow-sm border border-[#e2f0f9] flex flex-col justify-between text-left hover:border-[#006b57]/40 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-[#717976] font-medium">Month-to-Date Energy</span>
            <span className="material-symbols-outlined text-[#006b57] text-[20px]">bolt</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-headline text-2xl text-[#002620] font-bold tracking-tight">
                756
              </span>
              <span className="text-xs text-[#717976]">kWh</span>
            </div>
            <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#d1fae5] text-[#065f46]">
              PR 82.4% (Optimal)
            </span>
          </div>
        </button>

        {/* Card 4: Hardware Health Status */}
        <button
          type="button"
          onClick={() => navigateTo('/installation')}
          className="bg-white p-4 rounded-xl shadow-sm border border-[#e2f0f9] flex flex-col justify-between text-left hover:border-[#006b57]/40 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-[#717976] font-medium">Inverter Status</span>
            <span className="material-symbols-outlined text-[#006b57] text-[20px]">verified</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-headline text-lg sm:text-xl text-[#002620] font-bold tracking-tight">
                SMA Sunny
              </span>
            </div>
            <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#d1fae5] text-[#065f46]">
              0 Active Faults
            </span>
          </div>
        </button>

      </div>

      {/* Generation vs Consumption Trend Card */}
      <div className="bg-white p-5 rounded-2xl border border-[#e2f0f9] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-headline text-base font-bold text-[#002620]">
              Solar Generation vs Household Consumption
            </h2>
            <p className="text-xs text-[#717976]">
              Tracking clean rooftop generation against your historical consumption profile.
            </p>
          </div>

          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#e2f0f9] text-xs">
            <button
              onClick={() => setActiveModelRange('30day')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                activeModelRange === '30day' ? 'bg-white text-[#002620] shadow-sm' : 'text-[#717976]'
              }`}
            >
              30-Day Model
            </button>
            <button
              onClick={() => setActiveModelRange('annual')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                activeModelRange === 'annual' ? 'bg-white text-[#002620] shadow-sm' : 'text-[#717976]'
              }`}
            >
              12-Month
            </button>
          </div>
        </div>

        {/* SVG Graphic */}
        <div className="relative w-full h-48 bg-[#f4faff] rounded-xl p-4 flex flex-col justify-between overflow-hidden border border-[#e2f0f9]">
          <div className="flex items-center justify-between z-10 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#006b57]"></span>
                <span className="font-semibold text-[#002620]">
                  Solar Generation: {activeModelRange === '30day' ? '756 kWh' : '9,076 kWh/yr'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#d9822b]"></span>
                <span className="font-semibold text-[#717976]">
                  Household Load: {activeModelRange === '30day' ? '610 kWh' : '7,320 kWh/yr'}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-[#006b57] font-bold bg-[#d1fae5] px-2 py-0.5 rounded">
              Net Exporter
            </span>
          </div>

          <div className="w-full h-24 relative flex items-end">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 90">
              <defs>
                <linearGradient id="dashSolarGlowCust" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#006b57" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#006b57" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="dashGridGlowCust" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#d9822b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#d9822b" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line stroke="#dceaf4" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="400" y1="20" y2="20" />
              <line stroke="#dceaf4" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="400" y1="55" y2="55" />
              
              {/* Consumption Curve (Amber) */}
              <path d="M0,45 Q50,40 100,30 T200,25 T300,35 T400,28 L400,90 L0,90 Z" fill="url(#dashGridGlowCust)" />
              <path d="M0,45 Q50,40 100,30 T200,25 T300,35 T400,28" fill="none" stroke="#d9822b" strokeLinecap="round" strokeWidth="2" />
              
              {/* Solar Generation Curve (Emerald) */}
              <path d="M0,80 Q50,70 100,45 T200,12 T300,38 T400,68 L400,90 L0,90 Z" fill="url(#dashSolarGlowCust)" />
              <path d="M0,80 Q50,70 100,45 T200,12 T300,38 T400,68" fill="none" stroke="#006b57" strokeLinecap="round" strokeWidth="2.5" />
              <circle cx="200" cy="12" fill="#006b57" r="4.5" stroke="#ffffff" strokeWidth="1.5" />
            </svg>
          </div>

          <div className="flex justify-between text-[#717976] text-[10px] font-mono pt-1 border-t border-[#e2f0f9]">
            <span>Week 1</span>
            <span>Week 2</span>
            <span className="font-bold text-[#002620]">Week 3 (Solstice Solar Noon Peak)</span>
            <span>Week 4</span>
          </div>
        </div>
      </div>

      {/* Customer Quick Navigation Hub (Cards leading directly to companion pages) */}
      <div className="space-y-3">
        <h2 className="font-headline text-base font-bold text-[#002620]">
          My Solar System &amp; Services
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          
          <button
            onClick={() => navigateTo('/installation')}
            className="p-4 bg-white rounded-xl border border-[#e2f0f9] shadow-sm text-left hover:border-[#006b57]/40 transition-colors flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-[#e2f0f9] flex items-center justify-center text-[#006b57] shrink-0">
              <span className="material-symbols-outlined text-[22px]">inventory_2</span>
            </div>
            <div>
              <h3 className="font-headline text-sm font-bold text-[#002620]">Hardware Specifications</h3>
              <p className="text-xs text-[#717976] mt-0.5">
                BOM, Waaree TOPCon modules, SMA inverter serials &amp; warranties.
              </p>
            </div>
          </button>

          <button
            onClick={() => navigateTo('/documents')}
            className="p-4 bg-white rounded-xl border border-[#e2f0f9] shadow-sm text-left hover:border-[#006b57]/40 transition-colors flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-[#e2f0f9] flex items-center justify-center text-[#006b57] shrink-0">
              <span className="material-symbols-outlined text-[22px]">verified_user</span>
            </div>
            <div>
              <h3 className="font-headline text-sm font-bold text-[#002620]">Documents &amp; Sanctions</h3>
              <p className="text-xs text-[#717976] mt-0.5">
                BRPL net-metering permit, PM Surya Ghar subsidy approval &amp; invoice.
              </p>
            </div>
          </button>

          <button
            onClick={() => navigateTo('/support')}
            className="p-4 bg-white rounded-xl border border-[#e2f0f9] shadow-sm text-left hover:border-[#006b57]/40 transition-colors flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-[#e2f0f9] flex items-center justify-center text-[#006b57] shrink-0">
              <span className="material-symbols-outlined text-[22px]">support_agent</span>
            </div>
            <div>
              <h3 className="font-headline text-sm font-bold text-[#002620]">Maintenance &amp; Support</h3>
              <p className="text-xs text-[#717976] mt-0.5">
                Submit panel cleaning requests, technician visits, or track ticket status.
              </p>
            </div>
          </button>

        </div>
      </div>

    </div>
  );
};
