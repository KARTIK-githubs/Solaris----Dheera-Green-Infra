import React from 'react';
import { useApp } from '../../context/AppContext';

export const BottomNav: React.FC = () => {
  const { currentPath, navigateTo, workspaceMode } = useApp();

  const customerNavItems = [
    {
      id: 'home',
      label: 'Home',
      icon: 'solar_power',
      path: '/dashboard',
      matchPrefix: ['/dashboard', '/']
    },
    {
      id: 'system',
      label: 'My System',
      icon: 'inventory_2',
      path: '/installation',
      matchPrefix: ['/installation']
    },
    {
      id: 'perf',
      label: 'Generation',
      icon: 'query_stats',
      path: '/performance',
      matchPrefix: ['/performance']
    },
    {
      id: 'savings',
      label: 'Savings',
      icon: 'payments',
      path: '/savings',
      matchPrefix: ['/savings']
    },
    {
      id: 'support',
      label: 'Support',
      icon: 'support_agent',
      path: '/support',
      matchPrefix: ['/support']
    }
  ];

  const employeeNavItems = [
    {
      id: 'assess',
      label: 'Assess',
      icon: 'fact_check',
      path: '/assessment',
      matchPrefix: ['/assessment', '/regulations']
    },
    {
      id: 'optimise',
      label: 'Optimise',
      icon: 'bolt',
      path: '/optimiser',
      matchPrefix: ['/optimiser']
    },
    {
      id: 'community',
      label: 'Community',
      icon: 'groups',
      path: '/community',
      matchPrefix: ['/community']
    },
    {
      id: 'allocation',
      label: 'Allocation',
      icon: 'pie_chart',
      path: '/credit-allocation',
      matchPrefix: ['/credit-allocation']
    },
    {
      id: 'monitoring',
      label: 'Monitor',
      icon: 'query_stats',
      path: '/monitoring',
      matchPrefix: ['/monitoring']
    }
  ];

  const navItems = workspaceMode === 'customer' ? customerNavItems : employeeNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#f4faff]/95 backdrop-blur-xl border-t border-[#e2f0f9] shadow-[0_-4px_20px_rgba(16,61,53,0.06)] md:hidden">
      <div className="h-16 px-2 flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = item.matchPrefix.some(p => currentPath === p || (p !== '/' && currentPath.startsWith(p)));
          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item.path)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] h-12 rounded-xl transition-all active:scale-95 ${
                isActive 
                  ? 'text-[#006b57] font-semibold bg-[#9af4d8]/40' 
                  : 'text-[#404846] hover:text-[#006b57]'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="text-[11px] leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
