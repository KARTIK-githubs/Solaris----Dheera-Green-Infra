import React from 'react';
import { useApp } from '../../context/AppContext';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export const AuthShell: React.FC<AuthShellProps> = ({ eyebrow, title, subtitle, children, footer }) => {
  const { navigateTo } = useApp();

  return (
    <div className="min-h-screen bg-[#F8FAF7] flex flex-col">
      <header className="w-full max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
        <button onClick={() => navigateTo('/')} className="flex items-center gap-2.5">
          <img 
            src="https://www.dheeragreen.in/logo.webp"
            onError={(e) => {
              if (e.currentTarget.src !== window.location.origin + '/dheera-logo.webp') {
                e.currentTarget.src = '/dheera-logo.webp';
              } else {
                e.currentTarget.style.display = 'none';
              }
            }}
            alt="Dheera Green Infra Organization Logo" 
            className="h-8 w-8 object-contain rounded-lg bg-white shadow-xs p-0.5 border border-[#dbe9e2]" 
          />
          <span className="w-8 h-8 rounded-lg bg-[#006b57] text-white flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[18px]">solar_power</span>
          </span>
          <div className="flex flex-col text-left">
            <span className="font-headline text-base font-bold text-[#002620] tracking-tight leading-tight">SOLARIS</span>
            <span className="text-[10px] text-[#006b57] font-semibold tracking-wide leading-none">by Dheera Green</span>
          </div>
        </button>
        <button
          onClick={() => navigateTo('/')}
          className="text-xs font-semibold text-[#006b57] hover:underline"
        >
          Back to landing
        </button>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pb-10 grid lg:grid-cols-2 gap-6 items-center">
        <section className="hidden lg:flex flex-col gap-5 p-7 rounded-2xl bg-[#103d35] text-white shadow-md">
          <span className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-white/10 text-[#9af4d8] text-xs font-semibold">
            <span className="material-symbols-outlined text-[14px]">wb_sunny</span>
            <span>ONE SUN. MANY COMMUNITIES.</span>
          </span>
          <div className="space-y-2">
            <h2 className="font-headline text-3xl font-bold leading-tight">
              Shared solar, made clear and affordable.
            </h2>
            <p className="text-sm text-[#a3d0c4] leading-relaxed">
              Plan rooftop capacity, check DERC eligibility, optimise community budgets, and track every credit from one ledger.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            {[
              { icon: 'verified_user', label: 'Regulation-aware eligibility checks' },
              { icon: 'bolt', label: 'Budget-constrained community optimisation' },
              { icon: 'pie_chart', label: 'Transparent 100% allocation reconciliation' }
            ].map((item) => (
              <div key={item.icon} className="flex items-center gap-3 text-sm text-[#d6e5ee]">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#9af4d8]">
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                </span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#7ca89d] leading-snug pt-4 border-t border-white/10">
            Delhi-first planning platform. Internal planning estimates only, not an official DISCOM bill.
          </p>
        </section>

        <section className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-[#e2f0f9] p-6 sm:p-7">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#006b57]">{eyebrow}</span>
          <h1 className="font-headline text-2xl font-bold text-[#002620] mt-1">{title}</h1>
          <p className="text-xs text-[#404846] mt-1 leading-relaxed">{subtitle}</p>
          <div className="mt-5">{children}</div>
          <div className="mt-5 pt-4 border-t border-[#e2f0f9] text-center text-xs text-[#404846]">{footer}</div>
        </section>
      </main>
    </div>
  );
};
