import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const PerformancePage: React.FC = () => {
  const { navigateTo } = useApp();
  const [selectedRange, setSelectedRange] = useState<'day' | 'month' | 'year'>('month');

  return (
    <div className="flex flex-col w-full px-4 pb-16 space-y-6 max-w-5xl mx-auto animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-b border-[#e2f0f9] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#9af4d8]/60 text-[#00725d] text-[11px] font-semibold mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006b57] animate-pulse"></span>
            <span>Live System Health: Normal · PR 82.4%</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl text-[#002620] tracking-tight font-bold">
            Solar Generation &amp; Performance
          </h1>
          <p className="text-xs sm:text-sm text-[#404846]">
            High-resolution solar production tracking calibrated to your 6.8 kWp rooftop array and Delhi solar irradiance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1 rounded-xl bg-white border border-[#c0c8c5]/40 shadow-sm flex items-center gap-1">
            <button
              onClick={() => setSelectedRange('day')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                selectedRange === 'day' ? 'bg-[#002620] text-[#9af4d8]' : 'text-[#404846] hover:text-[#002620]'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedRange('month')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                selectedRange === 'month' ? 'bg-[#002620] text-[#9af4d8]' : 'text-[#404846] hover:text-[#002620]'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setSelectedRange('year')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                selectedRange === 'year' ? 'bg-[#002620] text-[#9af4d8]' : 'text-[#404846] hover:text-[#002620]'
              }`}
            >
              12 Months
            </button>
          </div>
        </div>
      </div>

      {/* Honest Telemetry Disclosure */}
      <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-[#92400e]">
        <span className="material-symbols-outlined text-[18px] shrink-0 text-[#b45309] mt-0.5">info</span>
        <div>
          <span className="font-bold font-mono tracking-wider text-[11px] uppercase">[SIMULATED TELEMETRY DISCLOSURE]: </span>
          Displayed intraday curves and yield metrics are simulated demonstration values calibrated against the canonical Delhi rooftop yield formulation (1,420 nominal × 0.94 derating = 1,334.8 kWh/kWp/year). No live hardware IoT streaming unit is connected.
        </div>
      </div>

      {/* Top Level Production KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-[#e2f0f9] shadow-sm">
          <span className="text-[11px] text-[#717976] block">Month-to-Date Energy</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-headline text-2xl font-bold text-[#002620]">756</span>
            <span className="text-xs text-[#404846] font-medium">kWh</span>
          </div>
          <span className="inline-block mt-2 text-[10px] font-bold text-[#006b57] bg-[#d1fae5] px-2 py-0.5 rounded-full">
            100.0% of canonical baseline
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e2f0f9] shadow-sm">
          <span className="text-[11px] text-[#717976] block">Performance Ratio (PR)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-headline text-2xl font-bold text-[#002620]">82.4%</span>
          </div>
          <span className="inline-block mt-2 text-[10px] font-bold text-[#006b57] bg-[#d1fae5] px-2 py-0.5 rounded-full">
            Nominal standard &gt;78%
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e2f0f9] shadow-sm">
          <span className="text-[11px] text-[#717976] block">Peak Day Generation</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-headline text-2xl font-bold text-[#002620]">28.6</span>
            <span className="text-xs text-[#404846] font-medium">kWh</span>
          </div>
          <span className="inline-block mt-2 text-[10px] font-bold text-[#b45309] bg-[#ffeed9] px-2 py-0.5 rounded-full">
            Clear sky solstice peak
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e2f0f9] shadow-sm">
          <span className="text-[11px] text-[#717976] block">Avoided Carbon Offset</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-headline text-2xl font-bold text-[#002620]">7.07</span>
            <span className="text-xs text-[#404846] font-medium">tons CO₂</span>
          </div>
          <span className="inline-block mt-2 text-[10px] font-bold text-[#006b57] bg-[#d1fae5] px-2 py-0.5 rounded-full">
            ~340 trees planted equiv.
          </span>
        </div>
      </div>

      {/* Main Generation Chart Graphic */}
      <div className="bg-white p-5 rounded-2xl border border-[#e2f0f9] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-headline text-base font-bold text-[#002620]">
              {selectedRange === 'day' && 'Hourly Solar Generation (Intraday Bell Curve)'}
              {selectedRange === 'month' && 'Daily Generation vs Canonical Target (30-Day View)'}
              {selectedRange === 'year' && 'Monthly Generation Profile vs Historical Irradiance (12-Month)'}
            </h2>
            <p className="text-xs text-[#717976]">
              {selectedRange === 'day' && 'Real-time MPPT string output tracking from 06:00 to 18:30 IST'}
              {selectedRange === 'month' && 'Comparing daily output to canonical baseline of ~25.2 kWh/day'}
              {selectedRange === 'year' && 'Annual production trend reflecting pre-monsoon peak and monsoon cloud derating'}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#006b57]"></span>
              <span className="font-medium text-[#002620]">Actual Output</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#d9822b] rounded-full"></span>
              <span className="font-medium text-[#717976]">Target Baseline</span>
            </div>
          </div>
        </div>

        {/* SVG Chart visualization */}
        <div className="relative w-full h-56 bg-[#f4faff] rounded-xl p-4 flex flex-col justify-between overflow-hidden border border-[#e2f0f9]">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 120">
            <defs>
              <linearGradient id="actualSolarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#006b57" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#006b57" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid horizontal guidelines */}
            <line stroke="#dceaf4" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="500" y1="20" y2="20" />
            <line stroke="#dceaf4" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="500" y1="60" y2="60" />
            <line stroke="#dceaf4" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="500" y1="100" y2="100" />

            {/* Baseline Target (Amber dashed line) */}
            <line stroke="#d9822b" strokeDasharray="5 5" strokeWidth="1.5" x1="0" x2="500" y1="42" y2="42" />

            {/* Solar Production Fill & Stroke */}
            {selectedRange === 'day' ? (
              <>
                <path d="M0,120 Q120,120 180,80 T250,15 T320,80 Q380,120 500,120 Z" fill="url(#actualSolarGrad)" />
                <path d="M0,120 Q120,120 180,80 T250,15 T320,80 Q380,120 500,120" fill="none" stroke="#006b57" strokeWidth="2.5" />
                <circle cx="250" cy="15" fill="#006b57" r="4.5" stroke="#ffffff" strokeWidth="2" />
              </>
            ) : selectedRange === 'month' ? (
              <>
                <path d="M0,45 Q60,35 125,48 T250,30 T375,44 T500,38 L500,120 L0,120 Z" fill="url(#actualSolarGrad)" />
                <path d="M0,45 Q60,35 125,48 T250,30 T375,44 T500,38" fill="none" stroke="#006b57" strokeWidth="2.5" />
                <circle cx="250" cy="30" fill="#006b57" r="4" stroke="#ffffff" strokeWidth="1.5" />
              </>
            ) : (
              <>
                {/* 12 months curve */}
                <path d="M0,70 Q80,50 160,25 T300,55 T420,40 T500,65 L500,120 L0,120 Z" fill="url(#actualSolarGrad)" />
                <path d="M0,70 Q80,50 160,25 T300,55 T420,40 T500,65" fill="none" stroke="#006b57" strokeWidth="2.5" />
                <circle cx="160" cy="25" fill="#006b57" r="4" stroke="#ffffff" strokeWidth="1.5" />
              </>
            )}
          </svg>

          {/* X-Axis Labels */}
          <div className="flex justify-between text-[#717976] text-[10px] font-mono pt-2 border-t border-[#e2f0f9]">
            {selectedRange === 'day' ? (
              <>
                <span>06:00 IST</span>
                <span>09:00</span>
                <span className="font-bold text-[#002620]">12:30 (Solar Noon · 5.8 kW Peak)</span>
                <span>15:30</span>
                <span>18:30 IST</span>
              </>
            ) : selectedRange === 'month' ? (
              <>
                <span>Day 1</span>
                <span>Day 8</span>
                <span className="font-bold text-[#002620]">Day 15 (28.6 kWh High)</span>
                <span>Day 22</span>
                <span>Day 30</span>
              </>
            ) : (
              <>
                <span>Jan</span>
                <span>Mar</span>
                <span className="font-bold text-[#002620]">May (Solstice Peak)</span>
                <span>Aug (Monsoon)</span>
                <span>Oct</span>
                <span>Dec</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Inverter Hardware Telemetry & Health */}
      <div className="bg-white p-5 rounded-2xl border border-[#e2f0f9] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-base font-bold text-[#002620] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#006b57]">speed</span>
            <span>Inverter In-Service Operating Diagnostics (SMA Sunny Tripower 6.0 kW)</span>
          </h2>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d1fae5] text-[#065f46] text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>
            Online &amp; Locked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
          <div className="bg-[#f4faff] p-3.5 rounded-xl border border-[#e2f0f9]">
            <span className="text-[#717976] block text-[11px]">DC MPPT String 1</span>
            <span className="font-headline text-lg font-bold text-[#002620] block mt-0.5">408 V · 8.2 A</span>
            <span className="text-[11px] text-[#006b57] font-medium">3.35 kW DC Input (South-East)</span>
          </div>

          <div className="bg-[#f4faff] p-3.5 rounded-xl border border-[#e2f0f9]">
            <span className="text-[#717976] block text-[11px]">DC MPPT String 2</span>
            <span className="font-headline text-lg font-bold text-[#002620] block mt-0.5">412 V · 8.1 A</span>
            <span className="text-[11px] text-[#006b57] font-medium">3.34 kW DC Input (South-West)</span>
          </div>

          <div className="bg-[#f4faff] p-3.5 rounded-xl border border-[#e2f0f9]">
            <span className="text-[#717976] block text-[11px]">Grid Synchronization</span>
            <span className="font-headline text-lg font-bold text-[#002620] block mt-0.5">415 V · 50.02 Hz</span>
            <span className="text-[11px] text-[#006b57] font-medium">Balanced 3-Phase Grid Export</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#e2f0f9] text-xs">
          <div className="text-[#717976]">
            Internal heat sink: <strong className="text-[#002620]">44.2°C</strong> (Safe limit &lt;65°C) · Arc fault detector: <strong className="text-[#006b57]">Active</strong>
          </div>
          <button
            onClick={() => navigateTo('/support')}
            className="text-[#006b57] hover:underline font-semibold inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Notice an irregularity? Report maintenance</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>
      </div>

    </div>
  );
};
