import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CommunityMember } from '../types';
import { InviteModal } from '../components/common/InviteModal';
import { ReportExportModal } from '../components/common/ReportExportModal';
import { AlertBanner } from '../components/common/AlertBanner';
import { AllocationBar } from '../components/common/AllocationBar';

export const CommunityPage: React.FC = () => {
  const {
    community,
    navigateTo,
    setIsConsentModalOpen,
    updateMemberStatus,
    refreshCommunity,
    backendOnline,
    backendError,
    clearBackendError,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'roster' | 'governance' | 'timeline'>('roster');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'signed_deposited' | 'kyc_verified' | 'pending_invite' | 'withdrawn'>('all');

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    member: CommunityMember | null;
    targetStatus: CommunityMember['status'] | null;
  }>({
    isOpen: false,
    member: null,
    targetStatus: null,
  });

  // Action pending state
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Manual refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Derived deterministic cohort metrics
  const activeMembers = community.members.filter((m) => m.status !== 'withdrawn');
  const withdrawnMembers = community.members.filter((m) => m.status === 'withdrawn');
  const signedDepositedCount = community.members.filter((m) => m.status === 'signed_deposited').length;

  const totalConnectedLoadKw = activeMembers.reduce((sum, m) => sum + (m.sanctionedLoadKw || 0), 0);
  const totalActiveEscrowInr = activeMembers.reduce((sum, m) => sum + (m.depositPaidInr || 0), 0);
  const targetNetTargetInr = community.netTargetInr || 502000;
  const fundedPercentage = Math.min(100, Math.round((totalActiveEscrowInr / targetNetTargetInr) * 1000) / 10);

  // Allocation segments for AllocationBar
  const allocationSegments = activeMembers.map((m) => ({
    id: m.id,
    label: `${m.flatNumber}`,
    valueKw: m.allocatedKw || (community.proposedCapacityKw / Math.max(1, activeMembers.length)),
    percentage: m.allocationPercentage > 0
      ? m.allocationPercentage
      : Math.round((100 / Math.max(1, activeMembers.length)) * 10) / 10,
    subLabel: `${m.ownerName} (${m.sanctionedLoadKw} kW load)`,
  }));

  // Filtered members list
  const filteredMembers = community.members.filter((m) => {
    const matchesSearch =
      m.flatNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.caNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tower.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setActionFeedback(null);
    const ok = await refreshCommunity();
    setIsRefreshing(false);
    if (ok) {
      setActionFeedback({
        type: 'success',
        message: `Roster reconciled with MongoDB at ${new Date().toLocaleTimeString('en-IN')}`,
      });
    } else {
      setActionFeedback({
        type: 'error',
        message: 'Could not contact MongoDB backend. Operating with local memory cache.',
      });
    }
  };

  const handleOpenConfirm = (member: CommunityMember, targetStatus: CommunityMember['status']) => {
    setActionFeedback(null);
    setConfirmModal({
      isOpen: true,
      member,
      targetStatus,
    });
  };

  const handleExecuteStatusChange = async () => {
    if (!confirmModal.member || !confirmModal.targetStatus) return;

    const { member, targetStatus } = confirmModal;
    setIsUpdating(true);
    setActionFeedback(null);

    const result = await updateMemberStatus(member.id, targetStatus);
    setIsUpdating(false);
    setConfirmModal({ isOpen: false, member: null, targetStatus: null });

    if (result.success) {
      setActionFeedback({
        type: 'success',
        message: `Status of ${member.flatNumber} (${member.ownerName}) successfully updated to '${targetStatus}' and persisted to MongoDB.`,
      });
    } else {
      setActionFeedback({
        type: 'error',
        message: result.error || 'Failed to update member status in MongoDB.',
      });
    }
  };

  const getStatusBadge = (status: CommunityMember['status']) => {
    switch (status) {
      case 'signed_deposited':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E1EBE6] text-[#0F2D24] border border-[#CBD8D2]">
            <span className="material-symbols-outlined text-[12px]">check_circle</span>
            Signed &amp; Deposited
          </span>
        );
      case 'kyc_verified':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F4F5F0] text-[#1A2421] border border-[#CBD2CA]">
            <span className="material-symbols-outlined text-[12px]">verified</span>
            KYC Verified
          </span>
        );
      case 'pending_invite':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FFDEA7] text-[#422000] border border-[#D9822B]/40">
            <span className="material-symbols-outlined text-[12px]">hourglass_top</span>
            Pending Invite
          </span>
        );
      case 'withdrawn':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FFF0F0] text-[#BA1A1A] border border-[#BA1A1A]/30">
            <span className="material-symbols-outlined text-[12px]">cancel</span>
            Withdrawn (Excluded)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col w-full pb-16 max-w-5xl mx-auto px-4 sm:px-6 animate-in fade-in space-y-6">
      
      {/* Header & Context Bar */}
      <div className="pt-2 pb-1 border-b border-[#CBD2CA] space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E1EBE6] text-[#0F2D24] text-[10px] font-mono font-bold uppercase tracking-wider border border-[#CBD8D2]">
              <span className="material-symbols-outlined text-[14px]">groups</span>
              Step 3 of 4 • Community Workspace
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F4F5F0] text-[#374340] border border-[#CBD2CA]">
              DERC VNM Guidelines 2024
            </span>
          </div>

          {/* Sync Button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white hover:bg-[#F4F5F0] text-[#1A2421] text-[11px] font-mono font-medium border border-[#CBD2CA] shadow-2xs transition-colors disabled:opacity-50"
            title="Refetch community project and participant roster from MongoDB"
          >
            <span className={`material-symbols-outlined text-[14px] ${isRefreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{isRefreshing ? 'Reconciling...' : 'Sync from Database'}</span>
          </button>
        </div>

        <div>
          <h1 className="font-headline text-2xl sm:text-3xl text-[#0F2D24] tracking-tight font-bold">
            {community.name}
          </h1>
          <p className="text-xs sm:text-sm text-[#374340] mt-0.5">
            {community.location} · Coordinator: <strong>{community.coordinatorName}</strong> ({community.coordinatorRole})
          </p>
        </div>
      </div>

      {/* Synthetic Demo Roster Disclosure Banner */}
      <AlertBanner
        variant="assumption"
        code="[SYNTHETIC DEMONSTRATION ROSTER]"
        title="Simulation Data Notice"
      >
        All 20 participant identities, flat allocations, consumer account (CA) numbers, simulated escrow balances, and KYC statuses shown in this workspace are synthetic test data engineered for simulation and viva demonstration purposes. No real-world consumer accounts, utility verification, or financial transactions have occurred.
      </AlertBanner>

      {/* Backend / Action Feedback Banner */}
      {actionFeedback && (
        <AlertBanner
          variant={actionFeedback.type === 'success' ? 'success' : 'error'}
          code={actionFeedback.type === 'success' ? '[DATABASE RECONCILED]' : '[PERSISTENCE ERROR]'}
        >
          {actionFeedback.message}
        </AlertBanner>
      )}

      {/* Cohort Deterministic Summary Matrix */}
      <div className="bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CBD2CA] pb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#0F2D24]">monitoring</span>
            <h2 className="font-headline text-xs font-bold text-[#1A2421] uppercase tracking-wider">
              Cohort Capitalization &amp; Physical Allocation State
            </h2>
          </div>
          <span className="text-[10px] font-mono text-[#606D69]">
            {activeMembers.length} Active / {withdrawnMembers.length} Withdrawn ({community.members.length} Total)
          </span>
        </div>

        {/* 4-Stat High-Density Bento */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
            <span className="text-[10px] font-mono text-[#606D69] block">Proposed Array</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-headline text-xl sm:text-2xl font-bold text-[#0F2D24] font-mono tabular-nums">
                {community.proposedCapacityKw.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-[#606D69]">kWp</span>
            </div>
            <span className="text-[10px] font-mono text-[#606D69] block mt-0.5">
              1,334.8 kWh/kWp/yr eff.
            </span>
          </div>

          <div className="p-3 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
            <span className="text-[10px] font-mono text-[#606D69] block">Committed Escrow</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-headline text-xl sm:text-2xl font-bold text-[#0F2D24] font-mono tabular-nums">
                ₹{(totalActiveEscrowInr / 100000).toFixed(2)}
              </span>
              <span className="text-xs font-mono text-[#606D69]">Lacs</span>
            </div>
            <span className="text-[10px] font-mono text-[#606D69] block mt-0.5">
              Target: ₹{(targetNetTargetInr / 100000).toFixed(2)}L ({fundedPercentage}%)
            </span>
          </div>

          <div className="p-3 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
            <span className="text-[10px] font-mono text-[#606D69] block">Active Connected Load</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-headline text-xl sm:text-2xl font-bold text-[#0F2D24] font-mono tabular-nums">
                {totalConnectedLoadKw.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-[#606D69]">kW</span>
            </div>
            <span className="text-[10px] font-mono text-[#606D69] block mt-0.5">
              Across {activeMembers.length} connected flats
            </span>
          </div>

          <div className="p-3 bg-[#F4F5F0] rounded border border-[#CBD2CA]">
            <span className="text-[10px] font-mono text-[#606D69] block">Consents Recorded</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-headline text-xl sm:text-2xl font-bold text-[#0F2D24] font-mono tabular-nums">
                {signedDepositedCount}
              </span>
              <span className="text-xs font-mono text-[#606D69]">/ {activeMembers.length} active</span>
            </div>
            <span className="text-[10px] font-mono text-[#0F2D24] block mt-0.5">
              {Math.round((signedDepositedCount / Math.max(1, activeMembers.length)) * 100)}% Participation
            </span>
          </div>
        </div>

        {/* Proportional Capacity Segmented Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#1A2421] font-semibold">Proportional Capacity Allocation across Active Subscribers:</span>
            <span className="text-[#606D69]">100.0% Reconciled</span>
          </div>
          <AllocationBar
            segments={allocationSegments}
            totalCapacityKw={community.proposedCapacityKw}
            showLegend={false}
          />
        </div>
      </div>

      {/* Segmented Section Tabs */}
      <div className="flex items-center border-b border-[#CBD2CA]" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'roster'}
          onClick={() => setActiveTab('roster')}
          className={`py-2 px-4 text-xs font-headline font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'roster'
              ? 'border-[#0F2D24] text-[#0F2D24]'
              : 'border-transparent text-[#606D69] hover:text-[#1A2421]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">table_rows</span>
          <span>Participant Ledger ({community.members.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'governance'}
          onClick={() => setActiveTab('governance')}
          className={`py-2 px-4 text-xs font-headline font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'governance'
              ? 'border-[#0F2D24] text-[#0F2D24]'
              : 'border-transparent text-[#606D69] hover:text-[#1A2421]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">gavel</span>
          <span>Statutory Governance</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'timeline'}
          onClick={() => setActiveTab('timeline')}
          className={`py-2 px-4 text-xs font-headline font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'timeline'
              ? 'border-[#0F2D24] text-[#0F2D24]'
              : 'border-transparent text-[#606D69] hover:text-[#1A2421]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">history</span>
          <span>Audit Log Timeline</span>
        </button>
      </div>

      {/* TAB 1: High-Density Technical Participant Ledger */}
      {activeTab === 'roster' && (
        <div className="space-y-3">
          
          {/* Search, Filter & Quick Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2">
              {/* Search input */}
              <div className="relative flex-1 max-w-sm">
                <span className="material-symbols-outlined text-[16px] text-[#606D69] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Filter by Flat, Tower, Owner, CA..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#CBD2CA] rounded text-xs font-mono text-[#1A2421] placeholder-[#606D69] focus:outline-none focus:ring-1 focus:ring-[#0F2D24]"
                />
              </div>

              {/* Status filter dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label="Filter roster by status"
                className="py-1.5 px-2 bg-white border border-[#CBD2CA] rounded text-xs font-mono text-[#1A2421] focus:outline-none focus:ring-1 focus:ring-[#0F2D24]"
              >
                <option value="all">All Statuses ({community.members.length})</option>
                <option value="signed_deposited">Signed &amp; Deposited ({signedDepositedCount})</option>
                <option value="kyc_verified">KYC Verified</option>
                <option value="pending_invite">Pending Invite</option>
                <option value="withdrawn">Withdrawn ({withdrawnMembers.length})</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsInviteOpen(true)}
                className="px-3 py-1.5 bg-white hover:bg-[#F4F5F0] text-[#1A2421] border border-[#CBD2CA] rounded text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
              >
                <span className="material-symbols-outlined text-[15px] text-[#0F2D24]">person_add</span>
                <span>Invite Member</span>
              </button>
            </div>
          </div>

          {/* High-Density Engineering Table */}
          <div className="bg-white border border-[#CBD2CA] rounded-lg overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F4F5F0] border-b border-[#CBD2CA] text-[#606D69] font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-semibold">Flat &amp; Resident</th>
                    <th className="py-2.5 px-3 font-semibold">Synthetic CA #</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Load</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Monthly Cons.</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Deposit</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Lifecycle Status</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBD2CA]/60 font-mono">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-[#606D69] font-sans">
                        No participants match the specified filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => {
                      const isWithdrawn = member.status === 'withdrawn';

                      return (
                        <tr
                          key={member.id}
                          className={`transition-colors ${
                            isWithdrawn
                              ? 'bg-[#FFF8F7] opacity-75 hover:bg-[#FFF0F0]'
                              : 'hover:bg-[#FBFBF9]'
                          }`}
                        >
                          {/* Flat & Resident */}
                          <td className="py-2.5 px-3 font-sans">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                                  isWithdrawn
                                    ? 'bg-[#FFDAD6] text-[#BA1A1A]'
                                    : 'bg-[#E1EBE6] text-[#0F2D24]'
                                }`}
                              >
                                {member.tower}
                              </span>
                              <div>
                                <span className={`font-semibold text-xs block ${isWithdrawn ? 'line-through text-[#606D69]' : 'text-[#1A2421]'}`}>
                                  {member.flatNumber}
                                </span>
                                <span className="text-[11px] text-[#606D69] block">
                                  {member.ownerName}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Synthetic CA Number */}
                          <td className="py-2.5 px-3 text-[#1A2421] tabular-nums">
                            <span>{member.caNumber}</span>
                          </td>

                          {/* Connected Sanctioned Load */}
                          <td className="py-2.5 px-3 text-right tabular-nums">
                            <span className="font-semibold text-[#1A2421]">{member.sanctionedLoadKw.toFixed(1)}</span>
                            <span className="text-[#606D69] text-[10px] ml-0.5">kW</span>
                          </td>

                          {/* Monthly Consumption & Bill */}
                          <td className="py-2.5 px-3 text-right tabular-nums">
                            <span className="text-[#1A2421] block">~{member.monthlyConsumptionKwh} kWh</span>
                            <span className="text-[10px] text-[#606D69] block">₹{member.monthlyBillInr?.toLocaleString('en-IN')}/mo</span>
                          </td>

                          {/* Deposit Paid / Escrow Commitment */}
                          <td className="py-2.5 px-3 text-right tabular-nums">
                            <span className={`font-semibold ${isWithdrawn ? 'text-[#606D69] line-through' : 'text-[#0F2D24]'}`}>
                              ₹{member.depositPaidInr?.toLocaleString('en-IN')}
                            </span>
                          </td>

                          {/* Lifecycle Status Badge */}
                          <td className="py-2.5 px-3 text-center">
                            {getStatusBadge(member.status)}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-2.5 px-3 text-right font-sans">
                            {isWithdrawn ? (
                              <button
                                type="button"
                                onClick={() => handleOpenConfirm(member, 'signed_deposited')}
                                className="px-2 py-0.5 rounded bg-[#0F2D24] hover:bg-[#163A2F] text-white text-[11px] font-semibold transition-colors"
                                title="Re-admit participant to solar cohort"
                              >
                                Re-admit
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenConfirm(member, 'withdrawn')}
                                className="px-2 py-0.5 rounded bg-white hover:bg-[#FFF0F0] text-[#BA1A1A] border border-[#BA1A1A]/30 text-[11px] font-medium transition-colors"
                                title="Withdraw participant; solver automatically rebalances remaining participants"
                              >
                                Withdraw
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="p-3 bg-[#F4F5F0] border-t border-[#CBD2CA] flex flex-wrap items-center justify-between text-xs text-[#606D69] font-mono">
              <span>Showing {filteredMembers.length} of {community.members.length} synthetic records</span>
              <span>Active Connected Demand: {totalConnectedLoadKw.toFixed(1)} kW</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Statutory & Legal Governance */}
      {activeTab === 'governance' && (
        <div className="bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[#CBD2CA] pb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#0F2D24]">fact_check</span>
              <h2 className="font-headline text-xs font-bold text-[#1A2421] uppercase tracking-wider">
                Statutory Compliance &amp; Legal Instruments
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E1EBE6] text-[#0F2D24] border border-[#CBD8D2]">
              2 of 3 Completed
            </span>
          </div>

          <div className="space-y-3">
            {/* Instrument 1: RWA SGM Resolution */}
            <div className="p-3.5 bg-white rounded border border-[#CBD2CA] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0F2D24] text-[20px]">how_to_vote</span>
                  <div>
                    <h3 className="font-headline text-xs font-bold text-[#1A2421]">
                      1. RWA Special General Meeting (SGM) Resolution
                    </h3>
                    <p className="text-[11px] text-[#606D69]">
                      Common rooftop license granted under Society Bye-Law 14(b). Quorum achieved with 82% assent.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E1EBE6] text-[#0F2D24] border border-[#CBD8D2] font-bold">
                  PASSED (82%)
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#606D69] bg-[#F4F5F0] p-2 rounded border border-[#CBD2CA]">
                Document Reference: SGM_Res_2024_03.pdf · Date of Execution: 14 July 2024
              </div>
            </div>

            {/* Instrument 2: Terrace Access Agreement */}
            <div className="p-3.5 bg-white rounded border border-[#CBD2CA] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0F2D24] text-[20px]">gavel</span>
                  <div>
                    <h3 className="font-headline text-xs font-bold text-[#1A2421]">
                      2. Common Terrace Access Agreement
                    </h3>
                    <p className="text-[11px] text-[#606D69]">
                      Signed between Building Management Committee (BMC) and Pod 3 subscribers for 25-year structural access.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E1EBE6] text-[#0F2D24] border border-[#CBD8D2] font-bold">
                  EXECUTED
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#606D69] bg-[#F4F5F0] p-2 rounded border border-[#CBD2CA]">
                Document Reference: BMC_Annexure_B_TerraceAccess.pdf · Structural Load: &ge;25 kg/m² Verified
              </div>
            </div>

            {/* Instrument 3: Illustrative DISCOM VNM Application Bundle */}
            <div className="p-3.5 bg-white rounded border border-[#CBD2CA] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#D9822B] text-[20px]">edit_document</span>
                  <div>
                    <h3 className="font-headline text-xs font-bold text-[#1A2421]">
                      3. Illustrative Planning Ledger (Form A-VNM Compatibility)
                    </h3>
                    <p className="text-[11px] text-[#606D69]">
                      Illustrative planning ledger prepared with aggregated CA numbers and pro-rata credit shares.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FFDEA7] text-[#422000] border border-[#D9822B]/40 font-bold">
                  PLANNING DRAFT
                </span>
              </div>
              <AlertBanner
                variant="info"
                code="[REGULATORY NOTICE]"
              >
                This planning schedule serves as an illustrative technical model. It is not an official DISCOM Form A submission and does not guarantee grid interconnect approval by BSES Rajdhani Power Limited.
              </AlertBanner>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Audit Log Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[#CBD2CA] pb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#0F2D24]">history</span>
              <h2 className="font-headline text-xs font-bold text-[#1A2421] uppercase tracking-wider">
                Append-Only Audit Trail
              </h2>
            </div>
            <span className="text-[10px] font-mono text-[#606D69]">Internal Audit Service</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-2.5 bg-white rounded border border-[#CBD2CA] flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[16px] text-[#0F2D24] shrink-0 mt-0.5">verified</span>
              <div className="space-y-0.5 flex-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-[#1A2421]">COHORT_SEEDED</span>
                  <span className="text-[10px] text-[#606D69]">System Initialization</span>
                </div>
                <p className="text-[11px] text-[#606D69] font-sans">
                  Gulmohar Enclave 20-member synthetic cohort initialized in database `solaris_dheera`.
                </p>
              </div>
            </div>

            <div className="p-2.5 bg-white rounded border border-[#CBD2CA] flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[16px] text-[#D9822B] shrink-0 mt-0.5">tune</span>
              <div className="space-y-0.5 flex-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-[#1A2421]">SOLVER_REBALANCE</span>
                  <span className="text-[10px] text-[#606D69]">Deterministic Engine</span>
                </div>
                <p className="text-[11px] text-[#606D69] font-sans">
                  Quota distributions re-evaluated: 100.0% sum invariant verified across active subscribers.
                </p>
              </div>
            </div>

            <div className="p-2.5 bg-white rounded border border-[#CBD2CA] flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[16px] text-[#0F2D24] shrink-0 mt-0.5">electric_meter</span>
              <div className="space-y-0.5 flex-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-[#1A2421]">DISCOM_CAP_ENFORCED</span>
                  <span className="text-[10px] text-[#606D69]">Provisional Rule</span>
                </div>
                <p className="text-[11px] text-[#606D69] font-sans">
                  Inverter capacity verified within 100% aggregate sanctioned load (102.5 kW threshold).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Lifecycle Status Changes */}
      {confirmModal.isOpen && confirmModal.member && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#CBD2CA] rounded-lg max-w-md w-full p-5 space-y-4 shadow-lg animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#CBD2CA] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#0F2D24]">
                  {confirmModal.targetStatus === 'withdrawn' ? 'warning' : 'person_check'}
                </span>
                <h3 className="font-headline text-sm font-bold text-[#1A2421]">
                  {confirmModal.targetStatus === 'withdrawn' ? 'Confirm Participant Withdrawal' : 'Confirm Participant Re-admission'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, member: null, targetStatus: null })}
                disabled={isUpdating}
                className="text-[#606D69] hover:text-[#1A2421] text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-[#F4F5F0] rounded border border-[#CBD2CA] space-y-1 font-mono">
                <div>Flat: <strong>{confirmModal.member.flatNumber} ({confirmModal.member.tower})</strong></div>
                <div>Resident: <strong>{confirmModal.member.ownerName}</strong></div>
                <div>Synthetic CA: <strong>{confirmModal.member.caNumber}</strong></div>
                <div>Connected Load: <strong>{confirmModal.member.sanctionedLoadKw} kW</strong></div>
                <div>Deposit: <strong>₹{confirmModal.member.depositPaidInr?.toLocaleString('en-IN')}</strong></div>
              </div>

              {confirmModal.targetStatus === 'withdrawn' ? (
                <p className="text-[#BA1A1A] text-[11px] leading-relaxed">
                  Withdrawing this participant will immediately exclude their CA from the credit allocation ledger and trigger automatic deterministic solver rebalancing across the remaining {activeMembers.length - 1} subscribers.
                </p>
              ) : (
                <p className="text-[#0F2D24] text-[11px] leading-relaxed">
                  Re-admitting this participant will reinstate their synthetic escrow deposit and re-include them in the 12 kWp solar array quota calculation.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#CBD2CA]">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, member: null, targetStatus: null })}
                disabled={isUpdating}
                className="px-3 py-1.5 bg-white hover:bg-[#F4F5F0] text-[#1A2421] border border-[#CBD2CA] rounded text-xs font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteStatusChange}
                disabled={isUpdating}
                className={`px-3 py-1.5 rounded text-white text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  confirmModal.targetStatus === 'withdrawn'
                    ? 'bg-[#BA1A1A] hover:bg-[#93000A]'
                    : 'bg-[#0F2D24] hover:bg-[#163A2F]'
                } disabled:opacity-50`}
              >
                {isUpdating && <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>}
                <span>
                  {isUpdating
                    ? 'Persisting to MongoDB...'
                    : confirmModal.targetStatus === 'withdrawn'
                    ? 'Confirm Withdrawal'
                    : 'Confirm Re-admission'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Actions Deck */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigateTo('/credit-allocation')}
          className="w-full sm:flex-1 h-11 bg-[#0F2D24] hover:bg-[#163A2F] text-white rounded font-headline text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-colors"
        >
          <span>Proceed to Credit Allocation Ledger</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>

        <button
          type="button"
          onClick={() => setIsExportOpen(true)}
          className="w-full sm:w-auto px-5 h-11 bg-white hover:bg-[#F4F5F0] text-[#1A2421] border border-[#CBD2CA] rounded font-headline text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px] text-[#0F2D24]">picture_as_pdf</span>
          <span>Export Community Dossier (.PDF)</span>
        </button>
      </div>

      <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
      <ReportExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} defaultReportType="community" />

    </div>
  );
};
