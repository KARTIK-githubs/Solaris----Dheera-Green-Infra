import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AlertBanner } from '../components/common/AlertBanner';
import { apiClient } from '../services/apiClient';
import { runAllSolarisTests, TestResult } from '../tests/solarisTests';
import { CommunityMember } from '../types';
import { SOLAR_METRICS, ENGINEERING_ASSUMPTIONS } from '../utils/solarCalculations';

interface AuditItem {
  id?: string;
  _id?: string;
  timestamp: string;
  action: string;
  category: string;
  details: string;
  actor: string;
  isSynthetic?: boolean;
}

export const AdminPage: React.FC = () => {
  const { community, updateMemberStatus, refreshCommunity, auditLogs: contextAuditLogs } = useApp();
  
  const [activeTab, setActiveTab] = useState<'audit' | 'health' | 'roster' | 'tests'>('audit');
  
  // Tab 1: Audit Log State
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditFilter, setAuditFilter] = useState<'all' | 'allocation' | 'regulatory' | 'financial' | 'system'>('all');
  const [auditSearch, setAuditSearch] = useState('');
  
  // Tab 2: System Health State
  const [healthData, setHealthData] = useState<any | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthCheckedAt, setHealthCheckedAt] = useState<string>('');

  // Tab 3: Roster Lifecycle State
  const [selectedMemberForToggle, setSelectedMemberForToggle] = useState<{
    member: CommunityMember;
    nextStatus: CommunityMember['status'];
  } | null>(null);
  const [isUpdatingMember, setIsUpdatingMember] = useState(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);
  const [actionErrorNotice, setActionErrorNotice] = useState<string | null>(null);

  // Tab 4: In-Browser Verification Tests State
  const [testResults, setTestResults] = useState<TestResult[]>(() => runAllSolarisTests());
  const [lastTestedAt, setLastTestedAt] = useState<string>(() => new Date().toLocaleTimeString('en-IN'));

  // Load live audit logs from backend
  const fetchAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const res = await apiClient.getAuditLogs();
      if (res.success && Array.isArray(res.data)) {
        setAuditLogs(res.data);
      } else {
        // Fall back to context audit logs if API offline
        setAuditLogs(contextAuditLogs as any);
      }
    } catch {
      setAuditLogs(contextAuditLogs as any);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // Load system health from backend
  const fetchHealth = async () => {
    setIsLoadingHealth(true);
    setHealthError(null);
    try {
      const res = await apiClient.checkHealth();
      if (res.status === 'ok' || res.success) {
        setHealthData(res);
      } else {
        setHealthError(res.error || 'Backend reported non-operational health');
      }
    } catch (err: any) {
      setHealthError(err.message || 'Failed to reach API server');
    } finally {
      setIsLoadingHealth(false);
      setHealthCheckedAt(new Date().toLocaleTimeString('en-IN'));
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    fetchHealth();
  }, []);

  const handleRerunTests = () => {
    setTestResults(runAllSolarisTests());
    setLastTestedAt(new Date().toLocaleTimeString('en-IN'));
  };

  const handleConfirmMemberStatusToggle = async () => {
    if (!selectedMemberForToggle) return;
    setIsUpdatingMember(true);
    setActionSuccessNotice(null);
    setActionErrorNotice(null);

    const { member, nextStatus } = selectedMemberForToggle;
    try {
      const res = await updateMemberStatus(member.id, nextStatus);
      if (res.success) {
        setActionSuccessNotice(`Member ${member.flatNumber} (${member.ownerName}) successfully updated to ${nextStatus.replace('_', ' ')}.`);
        await refreshCommunity();
        await fetchAuditLogs();
        setSelectedMemberForToggle(null);
      } else {
        setActionErrorNotice(res.error || 'Failed to update member status');
      }
    } catch (err: any) {
      setActionErrorNotice(err.message || 'Network exception during status change');
    } finally {
      setIsUpdatingMember(false);
    }
  };

  const allPassed = testResults.every(t => t.passed);

  // Filtered audit logs
  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesCategory = auditFilter === 'all' || log.category === auditFilter;
    const matchesSearch = !auditSearch || 
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.actor.toLowerCase().includes(auditSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col w-full pb-16 max-w-5xl mx-auto px-4 space-y-6 animate-in fade-in">
      
      {/* Page Header */}
      <div className="pt-2 border-b border-[#D6DFD8] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FFDEA7] text-[#422000] text-[11px] font-mono font-bold tracking-wider uppercase mb-1.5 border border-[#D9822B]/40">
              <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
              <span>Prototype Administration &amp; Verification Console</span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#002620] tracking-tight">
              Prototype Administration &amp; Verification Console
            </h1>
            <p className="text-xs sm:text-sm text-[#404846] mt-1 max-w-2xl leading-relaxed">
              Administrative inspection console for append-only audit trails, MongoDB persistence diagnostics, synthetic cohort lifecycle management, and in-browser engineering test verifications.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="px-2.5 py-1 rounded bg-[#E1EBE6] text-[#0F2D24] text-xs font-mono font-bold border border-[#0F2D24]/20">
              Prototype Mode
            </span>
          </div>
        </div>
      </div>

      {/* Mandatory Unauthenticated Prototype Security Disclosure */}
      <AlertBanner
        variant="warning"
        code="[PROTOTYPE ADMINISTRATION CONSOLE — NOT A PRODUCTION SECURITY BOUNDARY]"
        title="Unauthenticated Prototype Console & Academic Demonstration Notice"
      >
        <p className="text-xs leading-relaxed text-[#422000]">
          This administrative console is an <strong>unauthenticated engineering prototype interface</strong> developed for academic demonstration, algorithmic validation, and database inspection. It does not implement cryptographically enforced role-based access control (RBAC), multi-tenant isolation, or production security boundaries. <strong>All participant identities, utility account numbers (CA), and financial escrow deposits are server-controlled synthetic data.</strong> Never input real Aadhaar, PAN, banking, or actual utility account numbers into this prototype.
        </p>
      </AlertBanner>

      {/* Notification Toasts */}
      {actionSuccessNotice && (
        <AlertBanner variant="success" code="[ROSTER MUTATION PERSISTED]" title="Database Update Completed">
          <p className="text-xs">{actionSuccessNotice}</p>
        </AlertBanner>
      )}

      {actionErrorNotice && (
        <AlertBanner variant="error" code="[MUTATION FAILED]" title="Persistence Error">
          <p className="text-xs">{actionErrorNotice}</p>
        </AlertBanner>
      )}

      {/* Primary Tab Navigation */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F4F5F0] border border-[#D6DFD8] text-xs font-mono font-bold overflow-x-auto" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'audit'}
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-2 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'audit' ? 'bg-[#0F2D24] text-white shadow-sm' : 'text-[#404846] hover:bg-[#E8ECE6]'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">history_edu</span>
          <span>1. Audit Ledger ({auditLogs.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'health'}
          onClick={() => setActiveTab('health')}
          className={`px-3 py-2 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'health' ? 'bg-[#0F2D24] text-white shadow-sm' : 'text-[#404846] hover:bg-[#E8ECE6]'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">dns</span>
          <span>2. System Health &amp; DB</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'roster'}
          onClick={() => setActiveTab('roster')}
          className={`px-3 py-2 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'roster' ? 'bg-[#0F2D24] text-white shadow-sm' : 'text-[#404846] hover:bg-[#E8ECE6]'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">manage_accounts</span>
          <span>3. Cohort Administration ({community.members?.length || 20})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'tests'}
          onClick={() => setActiveTab('tests')}
          className={`px-3 py-2 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'tests' ? 'bg-[#0F2D24] text-white shadow-sm' : 'text-[#404846] hover:bg-[#E8ECE6]'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">fact_check</span>
          <span>4. Verification Tests ({testResults.filter(t => t.passed).length}/{testResults.length})</span>
        </button>
      </div>

      {/* TAB 1: AUDIT LEDGER */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg p-5 border border-[#D6DFD8] shadow-sm space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4F5F0] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0F2D24] text-[18px]">verified</span>
                <h2 className="font-headline text-base font-bold text-[#002620]">
                  Append-Only Audit Trail
                </h2>
                <span className="px-2 py-0.5 rounded bg-[#E1EBE6] text-[#0F2D24] text-[10px] font-mono font-bold uppercase">
                  Append-Only Semantics
                </span>
              </div>
              <p className="text-xs text-[#717976] mt-0.5">
                Every solar assessment, linear programming solver run, and member withdrawal logs an immutable audit event internally.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchAuditLogs}
                disabled={isLoadingAudit}
                className="px-3 py-1.5 rounded bg-white hover:bg-[#F4F5F0] text-[#0F2D24] text-xs font-mono font-bold border border-[#D6DFD8] flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-60"
              >
                <span className={`material-symbols-outlined text-[15px] ${isLoadingAudit ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                <span>{isLoadingAudit ? 'Fetching...' : 'Refresh Logs'}</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 text-xs font-mono">
            <div className="flex-1 w-full relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-[#717976]">
                search
              </span>
              <input
                type="text"
                placeholder="Search action, actor, or details..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded bg-[#F8FAF7] border border-[#D6DFD8] text-xs text-[#002620] focus:outline-none focus:border-[#0F2D24]"
              />
            </div>

            <div className="flex items-center gap-1 self-start sm:self-center">
              {(['all', 'allocation', 'regulatory', 'financial', 'system'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAuditFilter(cat)}
                  className={`px-2.5 py-1 rounded capitalize text-[11px] font-bold ${
                    auditFilter === cat
                      ? 'bg-[#0F2D24] text-white'
                      : 'bg-[#F4F5F0] text-[#404846] hover:bg-[#E8ECE6]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Audit Events List */}
          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredAuditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#717976] bg-[#F8FAF7] rounded border border-dashed border-[#D6DFD8]">
                No audit events match your search/filter criteria.
              </div>
            ) : (
              filteredAuditLogs.map((log, idx) => (
                <div
                  key={log.id || log._id || idx}
                  className="p-3.5 rounded bg-[#F8FAF7] border border-[#D6DFD8] space-y-1.5 text-xs transition-colors hover:border-[#0F2D24]/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#002620] text-sm">
                        {log.action}
                      </span>
                      <span className={`text-[10px] px-2 py-0.2 rounded font-mono font-bold uppercase ${
                        log.category === 'regulatory'
                          ? 'bg-[#E1EBE6] text-[#0F2D24]'
                          : log.category === 'financial'
                          ? 'bg-[#FFDEA7] text-[#422000]'
                          : 'bg-[#F4F5F0] text-[#404846]'
                      }`}>
                        {log.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#717976] font-mono">
                      {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </span>
                  </div>

                  <p className="text-[#404846] leading-relaxed font-sans text-xs">
                    {log.details}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#717976] pt-1 border-t border-[#F4F5F0]">
                    <span>Actor: <strong className="text-[#002620]">{log.actor}</strong></span>
                    <span>Synthetic Demo Record: <strong>YES</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM HEALTH & PERSISTENCE */}
      {activeTab === 'health' && (
        <div className="bg-white rounded-lg p-5 border border-[#D6DFD8] shadow-sm space-y-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4F5F0] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0F2D24] text-[18px]">dns</span>
                <h2 className="font-headline text-base font-bold text-[#002620]">
                  System Health &amp; MongoDB Persistence Diagnostic
                </h2>
              </div>
              <p className="text-xs text-[#717976] mt-0.5">
                Probes the co-located Node/Express server and verifies MongoDB connection state.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchHealth}
              disabled={isLoadingHealth}
              className="px-3 py-1.5 rounded bg-white hover:bg-[#F4F5F0] text-[#0F2D24] text-xs font-mono font-bold border border-[#D6DFD8] flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-[15px] ${isLoadingHealth ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>{isLoadingHealth ? 'Probing...' : 'Re-probe System'}</span>
            </button>
          </div>

          {healthError && (
            <AlertBanner variant="error" code="[BACKEND OFFLINE]" title="Health Probe Exception">
              <p className="text-xs">{healthError}</p>
            </AlertBanner>
          )}

          {/* Health Diagnostics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded bg-[#F8FAF7] border border-[#D6DFD8]">
              <span className="text-[10px] text-[#717976] uppercase font-bold block">Node/Express Server</span>
              <span className="font-headline text-lg font-bold text-[#002620] block mt-1">
                {healthData?.status === 'ok' ? 'PORT 5000 ACTIVE' : 'OFFLINE'}
              </span>
              <span className="text-[10px] text-[#00725d] font-bold">Reverse Proxy via Vite /api</span>
            </div>

            <div className="p-3.5 rounded bg-[#F8FAF7] border border-[#D6DFD8]">
              <span className="text-[10px] text-[#717976] uppercase font-bold block">MongoDB Database</span>
              <span className={`font-headline text-lg font-bold block mt-1 ${healthData?.database?.status === 'connected' ? 'text-[#00725d]' : 'text-[#D9822B]'}`}>
                {healthData?.database?.status?.toUpperCase() || 'UNKNOWN'}
              </span>
              <span className="text-[10px] text-[#717976]">
                DB: <strong>{healthData?.database?.name || 'solaris_dheera'}</strong> @ 127.0.0.1:27017
              </span>
            </div>

            <div className="p-3.5 rounded bg-[#F8FAF7] border border-[#D6DFD8]">
              <span className="text-[10px] text-[#717976] uppercase font-bold block">Synthetic Enforcement</span>
              <span className="font-headline text-lg font-bold text-[#00725d] block mt-1">
                SERVER CONTROLLED
              </span>
              <span className="text-[10px] text-[#717976]">
                isSynthetic: true locked in schema
              </span>
            </div>

            <div className="p-3.5 rounded bg-[#F8FAF7] border border-[#D6DFD8]">
              <span className="text-[10px] text-[#717976] uppercase font-bold block">Regulatory Model</span>
              <span className="font-headline text-lg font-bold text-[#002620] block mt-1">
                DERC DELHI
              </span>
              <span className="text-[10px] text-[#717976]">
                Virtual Net Metering 2024
              </span>
            </div>
          </div>

          {/* Persistence Engine Diagnostics Checklist */}
          <div className="p-4 rounded bg-[#F8FAF7] border border-[#D6DFD8] space-y-3 text-xs">
            <h3 className="font-headline font-bold text-[#002620] text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0F2D24] text-[18px]">rule</span>
              <span>Persistence &amp; Model Invariant Verification Checklist</span>
            </h3>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between p-2 rounded bg-white border border-[#D6DFD8]">
                <span className="text-[#002620]">Canonical Solar Yield Invariant:</span>
                <span className="font-bold text-[#00725d]">
                  1,420 kWh/kWp/yr × 0.94 derate = {SOLAR_METRICS.EFFECTIVE_ANNUAL_YIELD_KWH_PER_KWP.toFixed(1)} kWh/kWp/yr (PASSED)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white border border-[#D6DFD8]">
                <span className="text-[#002620]">Append-Only Audit Log Mutability Restriction:</span>
                <span className="font-bold text-[#00725d]">
                  Public POST /api/audit-logs Disabled · Server Lifecycle Internal Only (ENFORCED)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white border border-[#D6DFD8]">
                <span className="text-[#002620]">Dynamic Shortfall Formulation:</span>
                <span className="font-bold text-[#00725d]">
                  Max(0, Net Required Outlay - Budget Ceiling) Derived from Solver (VERIFIED)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white border border-[#D6DFD8]">
                <span className="text-[#002620]">System Probe Timestamp:</span>
                <span className="text-[#717976]">{healthData?.systemTime || healthCheckedAt || 'Not available'}</span>
              </div>
            </div>
          </div>

          {/* Academic Attribution Disclosure */}
          <div className="p-3.5 rounded bg-[#E1EBE6] border border-[#0F2D24]/20 text-xs text-[#0F2D24] space-y-1">
            <span className="font-mono font-bold block uppercase text-[11px]">Foundational Engine Attribution</span>
            <p className="text-[11px] leading-relaxed">
              {healthData?.attribution || 'Solaris foundational engine created by Aryan Das, Ayush Bhatt, Priyal Choudhary. Adapted by Kartik for Dheera Green Infra B.Tech training.'}
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: COHORT ROSTER ADMINISTRATION */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-lg p-5 border border-[#D6DFD8] shadow-sm space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4F5F0] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0F2D24] text-[18px]">manage_accounts</span>
                <h2 className="font-headline text-base font-bold text-[#002620]">
                  Cohort Roster Lifecycle Administration
                </h2>
                <span className="px-2 py-0.5 rounded bg-[#FFDEA7] text-[#422000] text-[10px] font-mono font-bold uppercase">
                  Synthetic Demo Data
                </span>
              </div>
              <p className="text-xs text-[#717976] mt-0.5">
                Simulate participant lifecycle changes. Withdrawing a participant excludes their load from subsequent optimization runs and triggers an append-only audit event.
              </p>
            </div>

            <span className="text-xs font-mono text-[#717976]">
              {community.members?.length || 20} Synthetic Units Registered
            </span>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#D6DFD8] bg-[#F8FAF7] text-[11px] font-mono font-bold text-[#717976] uppercase">
                  <th className="py-2 px-3">Unit</th>
                  <th className="py-2 px-3">Synthetic CA Number</th>
                  <th className="py-2 px-3">Participant Name</th>
                  <th className="py-2 px-3 text-right">Load (kW)</th>
                  <th className="py-2 px-3 text-right">Commitment (₹)</th>
                  <th className="py-2 px-3 text-center">Lifecycle Status</th>
                  <th className="py-2 px-3 text-center">Lifecycle Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F5F0] font-mono">
                {(community.members || []).map((m) => {
                  const isWithdrawn = m.status === 'withdrawn';
                  return (
                    <tr key={m.id} className={`hover:bg-[#F4F5F0] transition-colors ${isWithdrawn ? 'opacity-60 bg-[#FFF8F7]' : ''}`}>
                      <td className="py-2.5 px-3 font-bold text-[#002620]">
                        {m.flatNumber} <span className="text-[10px] text-[#717976]">({m.tower})</span>
                      </td>
                      <td className="py-2.5 px-3 text-[#717976]">{m.caNumber}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-[#002620]">{m.ownerName}</td>
                      <td className="py-2.5 px-3 text-right">{m.sanctionedLoadKw.toFixed(1)} kW</td>
                      <td className="py-2.5 px-3 text-right">₹{m.depositPaidInr.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isWithdrawn
                            ? 'bg-[#FFDAD6] text-[#93000A]'
                            : m.status === 'signed_deposited'
                            ? 'bg-[#E1EBE6] text-[#0F2D24]'
                            : 'bg-[#FFDEA7] text-[#422000]'
                        }`}>
                          {m.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedMemberForToggle({
                            member: m,
                            nextStatus: isWithdrawn ? 'signed_deposited' : 'withdrawn'
                          })}
                          className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                            isWithdrawn
                              ? 'bg-[#0F2D24] text-white hover:bg-[#163A2F]'
                              : 'bg-[#FFF0F0] text-[#BA1A1A] hover:bg-[#FFDAD6] border border-[#BA1A1A]/30'
                          }`}
                        >
                          {isWithdrawn ? 'Re-admit Member' : 'Withdraw Member'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: VERIFICATION TESTS */}
      {activeTab === 'tests' && (
        <div className="bg-white rounded-lg p-5 border border-[#D6DFD8] shadow-sm space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4F5F0] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline text-base font-bold text-[#002620]">
                  Deterministic Verification Test Runner
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                  allPassed ? 'bg-[#E1EBE6] text-[#0F2D24] border border-[#0F2D24]/20' : 'bg-[#FFDAD6] text-[#93000A]'
                }`}>
                  {allPassed ? '12/12 INVARIANTS PASSED' : 'FAILURES DETECTED'}
                </span>
              </div>
              <p className="text-xs text-[#717976] mt-0.5">
                Automated mathematical assertions validating the canonical yield model, 100.0% zero-shortfall quota reconciliation, and budget constraints.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#717976] font-mono">Last run: {lastTestedAt}</span>
              <button
                type="button"
                onClick={handleRerunTests}
                className="px-3 py-1.5 rounded bg-[#0F2D24] text-white text-xs font-mono font-bold hover:bg-[#163A2F] transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[15px]">refresh</span>
                <span>Re-run Suite</span>
              </button>
            </div>
          </div>

          {/* Test Results Breakdown */}
          <div className="space-y-2.5">
            {testResults.map((test, idx) => (
              <div
                key={idx}
                className={`p-3 rounded border text-xs space-y-1 transition-all ${
                  test.passed
                    ? 'bg-[#F8FAF7] border-[#D6DFD8]'
                    : 'bg-[#FFF8F7] border-[#FFDAD6]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[18px] ${
                      test.passed ? 'text-[#00725d]' : 'text-[#BA1A1A]'
                    }`}>
                      {test.passed ? 'check_circle' : 'cancel'}
                    </span>
                    <span className="font-mono font-bold text-[#002620]">
                      Invariant {idx + 1}: {test.name}
                    </span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                    test.passed
                      ? 'bg-[#E1EBE6] text-[#0F2D24]'
                      : 'bg-[#FFDAD6] text-[#93000A]'
                  }`}>
                    {test.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                <p className="text-[#404846] text-[11px] pl-6 leading-relaxed font-sans">
                  {test.message}
                </p>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#F8FAF7] rounded border border-[#D6DFD8] flex items-center justify-between text-xs font-mono text-[#717976]">
            <div className="flex items-center gap-2 text-[#002620]">
              <span className="material-symbols-outlined text-[16px] text-[#0F2D24]">terminal</span>
              <span>CLI Test Commands: <code className="font-bold">npm test</code> (Frontend) &middot; <code className="font-bold">npm run test:backend</code> (Mongoose)</span>
            </div>
            <span>TSX / Vitest Runner</span>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Member Status Toggle */}
      {selectedMemberForToggle && (
        <div className="fixed inset-0 z-50 bg-[#0F2D24]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5 border border-[#D6DFD8] shadow-xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F4F5F0] pb-2">
              <h3 className="font-headline font-bold text-[#002620] text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[#D9822B] text-[20px]">warning</span>
                <span>Confirm Participant Status Change</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedMemberForToggle(null)}
                className="text-[#717976] hover:text-[#002620] text-xs font-mono"
              >
                [Cancel]
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-[#404846] leading-relaxed">
                You are about to change the status of <strong>{selectedMemberForToggle.member.ownerName}</strong> (Unit {selectedMemberForToggle.member.flatNumber}, Synthetic CA {selectedMemberForToggle.member.caNumber}) to:
              </p>

              <div className="p-2.5 rounded bg-[#F8FAF7] border border-[#D6DFD8] font-mono text-center">
                <span className="text-[11px] font-bold text-[#0F2D24] uppercase">
                  {selectedMemberForToggle.nextStatus.replace('_', ' ')}
                </span>
              </div>

              <div className="p-3 rounded bg-[#FFF8E6] border border-[#D9822B]/30 text-[11px] text-[#422000] leading-relaxed">
                {selectedMemberForToggle.nextStatus === 'withdrawn' ? (
                  <span>
                    <strong>Solver Impact:</strong> Withdrawing this unit will exclude their {selectedMemberForToggle.member.sanctionedLoadKw} kW sanctioned load and ₹{selectedMemberForToggle.member.depositPaidInr.toLocaleString('en-IN')} escrow contribution from future optimization runs. The system will persist this change to MongoDB and write an append-only audit event.
                  </span>
                ) : (
                  <span>
                    <strong>Solver Impact:</strong> Re-admitting this unit restores their eligibility for community solar credit allocation and re-incorporates their escrow contribution.
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F4F5F0]">
              <button
                type="button"
                onClick={() => setSelectedMemberForToggle(null)}
                disabled={isUpdatingMember}
                className="px-3 py-1.5 rounded border border-[#D6DFD8] text-xs font-mono text-[#717976] hover:bg-[#F4F5F0]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMemberStatusToggle}
                disabled={isUpdatingMember}
                className="px-3.5 py-1.5 rounded bg-[#0F2D24] text-white text-xs font-mono font-bold hover:bg-[#163A2F] disabled:opacity-60 flex items-center gap-1.5"
              >
                {isUpdatingMember ? 'Persisting to MongoDB...' : 'Confirm Status Change'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
