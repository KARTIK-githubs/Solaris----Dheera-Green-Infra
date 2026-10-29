import React from 'react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const { 
    currentPath, 
    navigateTo, 
    isSidebarOpen, 
    setIsSidebarOpen, 
    currentUser, 
    logOut, 
    workspaceMode, 
    setWorkspaceMode 
  } = useApp();

  const customerRoutes = [
    { label: 'Dashboard Overview', path: '/dashboard', icon: 'dashboard', category: 'Companion' },
    { label: 'My Solar Installation', path: '/installation', icon: 'solar_power', category: 'Hardware' },
    { label: 'Generation & Performance', path: '/performance', icon: 'query_stats', category: 'Metrics' },
    { label: 'Savings & Financials', path: '/savings', icon: 'payments', category: 'Financials' },
    { label: 'Documents & Warranties', path: '/documents', icon: 'verified_user', category: 'Vault' },
    { label: 'Maintenance & Support', path: '/support', icon: 'support_agent', category: 'Assistance' },
  ];

  const employeeRoutes = [
    { label: 'Customer View Preview', path: '/dashboard', icon: 'visibility', category: 'Preview' },
    { label: 'Solar Assessment', path: '/assessment', icon: 'calculate', category: 'Planning' },
    { label: 'Regulatory Checker', path: '/regulations', icon: 'gavel', category: 'Planning' },
    { label: 'Smart Optimiser', path: '/optimiser', icon: 'bolt', category: 'Planning' },
    { label: 'Community Workspace', path: '/community', icon: 'groups', category: 'Collaboration' },
    { label: 'Credit Allocation', path: '/credit-allocation', icon: 'pie_chart', category: 'Collaboration' },
    { label: 'Solar Monitoring', path: '/monitoring', icon: 'query_stats', category: 'Operations' },
    { label: 'Reports & Export', path: '/reports', icon: 'description', category: 'Operations' },
    { label: 'Service Tickets Queue', path: '/support', icon: 'confirmation_number', category: 'Operations' },
    { label: 'Admin & Audit Console', path: '/admin', icon: 'admin_panel_settings', category: 'Governance' },
  ];

  const activeRoutes = workspaceMode === 'customer' ? customerRoutes : employeeRoutes;

  if (!isSidebarOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={() => setIsSidebarOpen(false)}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in"
        aria-hidden="true"
      />

      {/* Sidebar Drawer - overlays content on all screen sizes */}
      <aside
        className="fixed top-0 bottom-0 left-0 w-72 bg-[#f4faff] border-r border-[#e2f0f9] z-50 flex flex-col shadow-2xl animate-in slide-in-from-left"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Sidebar Header */}
        <div className="h-16 px-4 border-b border-[#e2f0f9] flex items-center justify-between">
          <div 
            onClick={() => {
              navigateTo('/dashboard');
              setIsSidebarOpen(false);
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
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
              className="h-7 w-7 object-contain rounded-md bg-white/80 p-0.5 border border-[#d6dfd8] shadow-xs" 
            />
            <span className="w-7 h-7 rounded-lg bg-[#006b57] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[16px]">solar_power</span>
            </span>
            <div>
              <span className="font-headline font-bold text-[#002620] tracking-tight text-base block leading-none">
                SOLARIS
              </span>
              <span className="text-[10px] text-[#006b57] font-semibold tracking-wide">
                Dheera Green Infra
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#404846] hover:bg-[#e2f0f9] transition-colors"
            aria-label="Close sidebar"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* User Context Card */}
        <div className="p-3 mx-3 my-2.5 rounded-xl bg-white border border-[#c0c8c5]/30 shadow-sm flex items-center gap-2.5">
          <img 
            alt={currentUser.name} 
            src={currentUser.avatarUrl} 
            className="w-9 h-9 rounded-full object-cover shrink-0 shadow-sm ring-2 ring-[#006b57]/20"
          />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-[#101d24] block truncate">{currentUser.name}</span>
            <span className="text-[10px] text-[#404846] block truncate">{currentUser.roleTitle}</span>
            <span className="text-[10px] text-[#006b57] font-semibold block">CA #{currentUser.consumerNumber}</span>
          </div>
        </div>

        {/* Workspace Mode Switcher Tabs */}
        <div className="mx-3 mb-2 p-1 bg-[#e2f0f9] rounded-xl flex items-center gap-1 text-xs font-semibold">
          <button
            onClick={() => {
              setWorkspaceMode('customer');
              if (['/assessment', '/regulations', '/community', '/credit-allocation', '/monitoring', '/reports', '/admin'].includes(currentPath)) {
                navigateTo('/dashboard');
              }
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors ${
              workspaceMode === 'customer'
                ? 'bg-white text-[#006b57] shadow-sm'
                : 'text-[#404846] hover:text-[#002620]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">cottage</span>
            <span>Customer</span>
          </button>
          <button
            onClick={() => {
              setWorkspaceMode('employee');
              if (['/installation', '/performance', '/savings', '/documents'].includes(currentPath)) {
                navigateTo('/assessment');
              }
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors ${
              workspaceMode === 'employee'
                ? 'bg-[#002620] text-[#9af4d8] shadow-sm'
                : 'text-[#404846] hover:text-[#002620]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">engineering</span>
            <span>Staff Mode</span>
          </button>
        </div>

        {/* Navigation Routes List */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
          {activeRoutes.map((route) => {
            const isActive = currentPath === route.path || (route.path !== '/' && currentPath.startsWith(route.path));
            return (
              <button
                key={route.path}
                onClick={() => {
                  navigateTo(route.path);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#006b57] text-white shadow-sm'
                    : 'text-[#404846] hover:bg-[#e2f0f9] hover:text-[#002620]'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-[#9af4d8]' : 'text-[#006b57]'}`}>
                  {route.icon}
                </span>
                <span className="truncate flex-1">{route.label}</span>
                {route.path === '/admin' && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#ffdea7] text-[#271900] font-bold">
                    Gov
                  </span>
                )}
                {route.path === '/optimiser' && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#9af4d8] text-[#002019] font-bold">
                    AI Solv
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[#e2f0f9] bg-[#f4faff] space-y-2">
          <button
            onClick={logOut}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold text-[#93000a] hover:bg-[#ffdad6]/40 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Log out</span>
          </button>
          <div className="flex items-center justify-between text-[11px] text-[#717976]">
            <span>Delhi DERC VNM 2024</span>
            <span className="text-[#006b57] font-medium font-mono">v2.4 LTS</span>
          </div>
        </div>
      </aside>
    </>
  );
};
