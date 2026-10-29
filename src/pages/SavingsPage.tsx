import React from 'react';
import { useApp } from '../context/AppContext';

export const SavingsPage: React.FC = () => {
  const { currentUser, navigateTo } = useApp();

  return (
    <div className="flex flex-col w-full px-4 pb-16 space-y-6 max-w-5xl mx-auto animate-in fade-in">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-b border-[#e2f0f9] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#9af4d8]/60 text-[#00725d] text-[11px] font-semibold mb-1">
            <span className="material-symbols-outlined text-[14px]">payments</span>
            <span>Net-Metering Savings · Delhi DERC Domestic Slabs</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl text-[#002620] tracking-tight font-bold">
            Solar Savings &amp; Financials
          </h1>
          <p className="text-xs sm:text-sm text-[#404846]">
            Transparent financial breakdown of electricity bill reductions, PM Surya Ghar subsidy, and investment payback for CA #{currentUser.consumerNumber}.
          </p>
        </div>

        <button
          onClick={() => navigateTo('/documents')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#c0c8c5]/60 hover:bg-[#f4faff] text-xs font-semibold text-[#002620] shadow-sm transition-colors self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
          <span>DISCOM Billing Ledger</span>
        </button>
      </div>

      {/* Hero Financial KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-[#e2f0f9] shadow-sm">
          <span className="text-[11px] text-[#717976] block">Est. Monthly Bill Savings</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-headline text-2xl font-bold text-[#002620]">₹3,480</span>
            <span className="text-xs text-[#404846] font-medium">/mo</span>
          </div>
          <span className="inline-block mt-2 text-[10px] font-bold text-[#006b57] bg-[#d1fae5] px-2 py-0.5 rounded-full">
            70.7% bill reduction
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e2f0f9] shadow-sm">
          <span className="text-[11px] text-[#717976] block">Annual Savings Run-Rate</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-headline text-2xl font-bold text-[#002620]">₹41,760</span>
            <span className="text-xs text-[#404846] font-medium">/yr</span>
          </div>
          <span className="inline-block mt-2 text-[10px] font-bold text-[#006b57] bg-[#d1fae5] px-2 py-0.5 rounded-full">
            ₹3,480 × 12 months
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e2f0f9] shadow-sm">
          <span className="text-[11px] text-[#717976] block">Simple Payback Horizon</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-headline text-2xl font-bold text-[#002620]">7.6</span>
            <span className="text-xs text-[#404846] font-medium">Years</span>
          </div>
          <span className="inline-block mt-2 text-[10px] font-bold text-[#b45309] bg-[#ffeed9] px-2 py-0.5 rounded-full">
            Post-subsidy investment
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e2f0f9] shadow-sm">
          <span className="text-[11px] text-[#717976] block">25-Year Cumulative Gain</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-headline text-2xl font-bold text-[#002620]">₹14.8 L</span>
          </div>
          <span className="inline-block mt-2 text-[10px] font-bold text-[#006b57] bg-[#d1fae5] px-2 py-0.5 rounded-full">
            IRR 14.8% p.a.
          </span>
        </div>
      </div>

      {/* Bill Comparison: Before vs After Solar */}
      <div className="bg-white p-5 rounded-2xl border border-[#e2f0f9] shadow-sm space-y-4">
        <h2 className="font-headline text-base font-bold text-[#002620] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#006b57]">compare_arrows</span>
          <span>Monthly DISCOM Electricity Bill Comparison (BRPL Domestic Tariff)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Before Solar */}
          <div className="bg-[#fef2f2] p-4 rounded-xl border border-[#fecaca] flex flex-col justify-between">
            <div>
              <span className="text-[#991b1b] font-bold uppercase tracking-wider text-[10px]">Before Solar System</span>
              <div className="font-headline text-2xl font-bold text-[#991b1b] mt-1">₹4,920 / mo</div>
              <p className="text-[#7f1d1d] mt-1">
                Average consumption: <strong>610 kWh/mo</strong> billed across DERC Slabs 1, 2, 3 &amp; 4 plus fixed charges.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#fca5a5] text-[11px] text-[#991b1b]">
              Annual grid expenditure: <strong>₹59,040 / year</strong>
            </div>
          </div>

          {/* After Solar */}
          <div className="bg-[#ecfdf5] p-4 rounded-xl border border-[#a7f3d0] flex flex-col justify-between">
            <div>
              <span className="text-[#065f46] font-bold uppercase tracking-wider text-[10px]">With 6.8 kWp Solar</span>
              <div className="font-headline text-2xl font-bold text-[#065f46] mt-1">₹1,440 / mo</div>
              <p className="text-[#064e3b] mt-1">
                Net grid import reduced to <strong>178 kWh/mo</strong> after self-consumption and daytime export credits.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#6ee7b7] text-[11px] text-[#065f46]">
              Annual grid expenditure: <strong>₹17,280 / year</strong>
            </div>
          </div>

          {/* Net Direct Pocket Savings */}
          <div className="bg-[#002620] text-white p-4 rounded-xl shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[#9af4d8] font-bold uppercase tracking-wider text-[10px]">Net Monthly Saving</span>
              <div className="font-headline text-2xl font-bold text-[#ffdea7] mt-1">₹3,480 / mo</div>
              <p className="text-[#dceaf4] mt-1">
                Direct monthly cash retention in your bank account, equivalent to an <strong>18% lower cost per unit</strong> than standard grid power.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/20 text-[11px] text-[#9af4d8]">
              Annual net savings: <strong>₹41,760 / year</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Capital Expenditure & Subsidy Breakdown */}
      <div className="bg-white p-5 rounded-2xl border border-[#e2f0f9] shadow-sm space-y-4">
        <h2 className="font-headline text-base font-bold text-[#002620] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#006b57]">account_balance</span>
          <span>Capital Investment &amp; PM Surya Ghar Subsidy Breakdown</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e2f0f9] text-[#717976] uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Component / Milestone</th>
                <th className="py-2.5 px-3">Regulatory Basis</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2f0f9] font-mono">
              <tr>
                <td className="py-2.5 px-3 font-sans font-medium text-[#002620]">
                  Gross EPC Outlay (6.8 kWp Turnkey Rooftop Installation)
                </td>
                <td className="py-2.5 px-3 text-[#717976] font-sans">
                  Dheera Green Infra Turnkey Supply &amp; Commissioning
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-[#002620]">₹3,95,000</td>
              </tr>
              <tr className="bg-[#f0fdf4]">
                <td className="py-2.5 px-3 font-sans font-medium text-[#065f46]">
                  PM Surya Ghar Muft Bijli Yojana Central Subsidy
                </td>
                <td className="py-2.5 px-3 text-[#065f46] font-sans">
                  ₹30,000/kW up to 2kW + ₹18,000 for 3rd kW (Statutory ₹78,000 Cap)
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-[#065f46]">- ₹78,000</td>
              </tr>
              <tr className="bg-[#f4faff] font-bold">
                <td className="py-3 px-3 font-sans text-[#002620]">
                  Net Customer Capital Investment
                </td>
                <td className="py-3 px-3 text-[#006b57] font-sans font-semibold">
                  Funded via Upfront Resident Equity
                </td>
                <td className="py-3 px-3 text-right text-base text-[#002620]">₹3,17,000</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-[#f4faff] rounded-xl border border-[#e2f0f9] text-xs text-[#404846] flex items-center justify-between">
          <div>
            PM Surya Ghar CFA Application ID: <strong className="text-[#002620]">PMSG-DL-2026-99214</strong> (Direct Benefit Transfer processed directly to customer account).
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#065f46]">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Sanction Disbursed
          </span>
        </div>
      </div>

    </div>
  );
};
