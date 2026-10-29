import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AiAdvisorModal } from './AiAdvisorModal';

interface HeaderProps {
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ subtitle = 'Dheera Green Infra · Solar Portal' }) => {
  const { 
    currentUser, 
    navigateTo,
    isAuthenticated,
    logOut,
    setIsSidebarOpen,
    backendOnline,
    backendError,
    clearBackendError,
    workspaceMode,
    setWorkspaceMode,
    isAiModalOpen,
    setIsAiModalOpen
  } = useApp();

  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleWorkspaceMode = () => {
    if (workspaceMode === 'customer') {
      setWorkspaceMode('employee');
      navigateTo('/assessment');
    } else {
      setWorkspaceMode('customer');
      navigateTo('/dashboard');
    }
  };

  return (
    <>
      <header className="fixed top-0 w-full z-40 bg-[#f4faff]/95 backdrop-blur-xl border-b border-[#e2f0f9] shadow-[0_1px_12px_rgba(16,61,53,0.06)]">
        {backendError && (
          <div className="bg-[#fee2e2] border-b border-[#fca5a5] px-4 py-1.5 flex items-center justify-between text-xs text-[#991b1b]">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="material-symbols-outlined text-[16px]">cloud_off</span>
              <span><strong>Persistence Alert:</strong> {backendError}</span>
            </div>
            <button
              onClick={clearBackendError}
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white border border-[#fca5a5] hover:bg-[#fef2f2]"
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="h-16 px-4 max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Left Brand Lockup */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#101d24] hover:bg-[#e2f0f9] transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>

          <div 
            onClick={() => navigateTo('/dashboard')}
            className="flex items-center gap-2.5 cursor-pointer"
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
              className="h-8 w-8 object-contain rounded-md bg-white/80 p-0.5 border border-[#d6dfd8] shadow-xs" 
            />
            <span className="w-8 h-8 rounded-lg bg-[#006b57] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[18px]">solar_power</span>
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-headline text-base text-[#002620] tracking-tight font-bold leading-none">
                  SOLARIS
                </span>
                <span className="text-[10px] text-[#006b57] font-semibold hidden xs:inline">
                  by Dheera Green
                </span>
                {workspaceMode === 'customer' ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#9af4d8]/70 text-[#006b57] text-[10px] font-semibold leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006b57] animate-pulse"></span>
                    Rooftop Active · 6.8 kWp
                  </span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#ffeed9] text-[#b45309] text-[10px] font-bold leading-none">
                      Staff Workspace
                    </span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold leading-none ${
                      backendOnline === true
                        ? 'bg-[#d1fae5] text-[#065f46]'
                        : backendOnline === false
                        ? 'bg-[#fee2e2] text-[#991b1b]'
                        : 'bg-[#e5e7eb] text-[#374151]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        backendOnline === true ? 'bg-[#059669]' : backendOnline === false ? 'bg-[#dc2626]' : 'bg-[#9ca3af]'
                      }`}></span>
                      {backendOnline === true ? 'DB Connected' : backendOnline === false ? 'DB Offline' : 'DB Connecting'}
                    </span>
                  </>
                )}
              </div>
              <span className="text-[11px] text-[#404846] font-medium truncate max-w-[170px] sm:max-w-none">
                {subtitle}
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions: Workspace Mode Switcher, AI Advisor & User Menu */}
        <div className="flex items-center gap-2">
          {/* Workspace Switcher Button */}
          <button
            onClick={toggleWorkspaceMode}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border shadow-sm ${
              workspaceMode === 'customer'
                ? 'bg-white hover:bg-[#e2f0f9] text-[#006b57] border-[#c0c8c5]/60'
                : 'bg-[#ffeed9] hover:bg-[#fed7aa] text-[#b45309] border-[#fde68a]'
            }`}
            title={workspaceMode === 'customer' ? 'Switch to Dheera Green Employee Workspace' : 'Switch to Customer Portal'}
          >
            <span className="material-symbols-outlined text-[16px]">
              {workspaceMode === 'customer' ? 'engineering' : 'cottage'}
            </span>
            <span className="hidden md:inline font-mono text-[11px]">
              {workspaceMode === 'customer' ? 'Staff Mode' : 'Customer View'}
            </span>
          </button>

          {/* AI Advisor Trigger */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#002620] hover:bg-[#003d34] text-[#9af4d8] text-xs font-medium transition-colors shadow-sm"
            aria-label="Open AI Assistant"
            title="Dheera Green Solar Assistant"
          >
            <span className="material-symbols-outlined text-[17px]">psychology</span>
            <span className="hidden sm:inline font-mono text-[11px] font-bold tracking-tight">AI Advisor</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#e2f0f9] transition-colors"
              aria-label="User menu"
            >
              <img 
                alt={currentUser.name} 
                className="w-8 h-8 rounded-full object-cover shadow-[0_0_0_2px_rgba(0,107,87,0.2)]" 
                src={currentUser.avatarUrl}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOCw3_x5kggCZA-8gYXL_IqD9UGPInL8dDI_KLzxMKLSVw6wDKwFNvO83-jGssib42nLy1UBemp8csYhlhtpPj6c1Lv698HOaJ_r6HLI1c6eBs25G95aoANJ6YUj6G7h523c89jsYLlHU0mQqS07NMO8rlR-8LKdaA3pqrIir9Bv5DalugqUNKhcULE8HwTD_vDHSjKuhKODrhdEIqy9y6ylGpU7cX4s_rqKxr2zq5Ae4okzcjh_3QgA';
                }}
              />
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-xl border border-[#c0c8c5]/40 py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-[#e2f0f9]">
                  <span className="text-xs font-bold text-[#002620] block truncate">{currentUser.name}</span>
                  <span className="text-[11px] text-[#404846] block truncate">{currentUser.roleTitle}</span>
                  <span className="text-[10px] text-[#006b57] font-semibold block mt-0.5">CA #{currentUser.consumerNumber}</span>
                </div>
                {isAuthenticated && (
                  <div className="px-2 pt-2 pb-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logOut();
                      }}
                      className="w-full px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold text-[#93000a] hover:bg-[#ffdad6]/40 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      <span>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </header>

    <AiAdvisorModal
      isOpen={isAiModalOpen}
      onClose={() => setIsAiModalOpen(false)}
    />
  </>
);
};
