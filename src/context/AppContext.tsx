import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  UserProfile, 
  CommunityProject, 
  CommunityMember, 
  AuditLogItem, 
  UserRole,
  OptimisationParams,
  OptimisationResult
} from '../types';
import { 
  DEMO_USERS, 
  INITIAL_COMMUNITY, 
  INITIAL_AUDIT_LOGS 
} from '../data/mockData';
import { runAffordabilityOptimiser } from '../utils/optimiserEngine';
import { apiClient } from '../services/apiClient';
import {
  authenticateAccount,
  clearAuthSession,
  getAuthSession,
  registerAccount,
  saveAuthSession,
  type AuthSession
} from '../utils/authStorage';

export type WorkspaceMode = 'customer' | 'employee';

export interface PersistentChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isLiveModel?: boolean;
  fallbackReason?: string;
  timestamp: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

interface AppContextType {
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;

  currentRole: UserRole;
  currentUser: UserProfile;
  switchRole: (role: UserRole) => void;
  updateCurrentUser: (updates: Partial<UserProfile>) => void;
  
  currentPath: string;
  navigateTo: (path: string) => void;

  isAuthenticated: boolean;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  logIn: (email: string, password: string) => Promise<AuthResult>;
  logOut: () => void;

  community: CommunityProject;
  updateCommunity: (updates: Partial<CommunityProject>) => void;
  inviteMember: (newMember: Omit<CommunityMember, 'id'>) => void;
  toggleMemberConsent: (memberId: string) => void;
  updateMemberStatus: (memberId: string, status: CommunityMember['status']) => Promise<{ success: boolean; error?: string }>;
  refreshCommunity: () => Promise<boolean>;
  
  signUserConsent: () => void;
  isConsentModalOpen: boolean;
  setIsConsentModalOpen: (open: boolean) => void;

  isAiModalOpen: boolean;
  setIsAiModalOpen: (open: boolean) => void;
  aiMessages: PersistentChatMessage[];
  setAiMessages: React.Dispatch<React.SetStateAction<PersistentChatMessage[]>>;

  optimisationParams: OptimisationParams;
  setOptimisationParams: React.Dispatch<React.SetStateAction<OptimisationParams>>;
  optimisationResult: OptimisationResult;
  rerunOptimiser: () => void;

  auditLogs: AuditLogItem[];
  addAuditLog: (action: string, details: string, category?: AuditLogItem['category']) => void;

  backendOnline: boolean | null;
  backendError: string | null;
  clearBackendError: () => void;

  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  WORKSPACE_MODE: 'solaris_workspace_mode',
  ROLE: 'solaris_role',
  USER: 'solaris_user',
  COMMUNITY: 'solaris_community',
  LOGS: 'solaris_logs'
};

const buildAuthProfile = (account: { id: string; name: string; email: string }, needsOnboarding: boolean = false): UserProfile => ({
  ...DEMO_USERS['household'],
  id: account.id,
  name: account.name,
  email: account.email,
  roleTitle: 'Resident · Solaris Member',
  consentSigned: false,
  consentDate: undefined,
  onboardingCompleted: false,
  needsOnboarding
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(() => getAuthSession());
  const isAuthenticated = Boolean(session);

  // 1. Workspace Mode (Customer vs Employee)
  const [workspaceMode, setWorkspaceModeState] = useState<WorkspaceMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WORKSPACE_MODE);
    return saved === 'employee' ? 'employee' : 'customer';
  });

  const setWorkspaceMode = useCallback((mode: WorkspaceMode) => {
    setWorkspaceModeState(mode);
    localStorage.setItem(STORAGE_KEYS.WORKSPACE_MODE, mode);
  }, []);

  // 2. Role & User State
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ROLE);
    return (saved as UserRole) || 'household';
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.onboardingCompleted) {
          parsed.needsOnboarding = false;
        }
        return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    const activeSession = getAuthSession();
    if (activeSession) {
      return buildAuthProfile({
        id: activeSession.accountId,
        name: activeSession.name,
        email: activeSession.email
      });
    }
    return DEMO_USERS['household'];
  });

  // 3. Navigation State (Flicker-Free, No Double-Dispatch, Instant Scroll)
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || '/';
  });

  const navigateTo = useCallback((path: string) => {
    const currentHash = window.location.hash.replace('#', '') || '/';
    if (currentHash !== path) {
      window.location.hash = path;
    }
    setCurrentPath(prev => (prev === path ? prev : path));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || '/';
      setCurrentPath(prev => (prev === hash ? prev : hash));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 4. Persistent AI Advisor State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<PersistentChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your Dheera Green Solar Assistant. How can I help you today with your rooftop solar system, energy generation, savings, or maintenance?',
      isLiveModel: false,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // 3. Community State
  const [community, setCommunity] = useState<CommunityProject>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COMMUNITY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_COMMUNITY;
  });

  // Backend Persistence State
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  const clearBackendError = useCallback(() => setBackendError(null), []);

  // Reusable community fetcher and database reconciler
  const refreshCommunity = useCallback(async (): Promise<boolean> => {
    try {
      const res = await apiClient.getCommunity();
      if (res.success && res.data?.project && Array.isArray(res.data?.members)) {
        setBackendOnline(true);
        setBackendError(null);
        const reconciledMembers: CommunityMember[] = res.data.members.map((m: any) => ({
          id: m.memberId || m.id,
          flatNumber: m.flatNumber,
          tower: m.tower,
          ownerName: m.ownerName,
          caNumber: m.caNumber,
          sanctionedLoadKw: m.sanctionedLoadKw,
          monthlyConsumptionKwh: m.monthlyConsumptionKwh,
          monthlyBillInr: m.monthlyBillInr,
          maxUpfrontBudgetInr: m.maxUpfrontBudgetInr,
          allocatedKw: m.allocatedKw || 0,
          allocationPercentage: m.allocationPercentage || 0,
          allocatedKwhPerMonth: m.allocatedKwhPerMonth || 0,
          depositPaidInr: m.depositPaidInr || 0,
          status: m.status,
          consentSigned: Boolean(m.consentSigned),
          tier: m.tier || 'Tier B'
        }));

        const activeCommitted = reconciledMembers.filter(m => m.status === 'signed_deposited').length;
        const activeTotalFunds = reconciledMembers.filter(m => m.status !== 'withdrawn').reduce((acc, m) => acc + (m.depositPaidInr || 0), 0);

        setCommunity({
          ...res.data.project,
          members: reconciledMembers,
          committedMembersCount: activeCommitted,
          totalCommittedInr: activeTotalFunds
        });
        return true;
      } else {
        setBackendOnline(false);
        setBackendError(res.error || 'MongoDB persistence unavailable. Operating in local mode.');
        return false;
      }
    } catch (err: any) {
      setBackendOnline(false);
      setBackendError(`Backend offline: ${err.message}`);
      return false;
    }
  }, []);

  // Sync community state with MongoDB backend on initial load
  useEffect(() => {
    let active = true;
    refreshCommunity();
    return () => { active = false; };
  }, [refreshCommunity]);

  // 5. Modal & UI State
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 6. Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_AUDIT_LOGS;
  });

  // 7. Optimiser State
  const [optimisationParams, setOptimisationParams] = useState<OptimisationParams>({
    roofAreaSqFt: 1400,
    targetCapacityKw: 12,
    budgetCeilingInr: 580000,
    financingRatePercentage: 8.5,
    participantCapInr: 4500,
    stressFactors: {
      monsoonDrop: false,
      rateSpike: false,
      unitDropOut: false,
      subsidyDelay: false
    }
  });

  const [optimisationResult, setOptimisationResult] = useState<OptimisationResult>(() => {
    return runAffordabilityOptimiser(INITIAL_COMMUNITY.members, {
      roofAreaSqFt: 1400,
      targetCapacityKw: 12,
      budgetCeilingInr: 580000,
      financingRatePercentage: 8.5,
      participantCapInr: 4500,
      stressFactors: {
        monsoonDrop: false,
        rateSpike: false,
        unitDropOut: false,
        subsidyDelay: false
      }
    });
  });

  const rerunOptimiser = useCallback(() => {
    const result = runAffordabilityOptimiser(community.members, optimisationParams);
    setOptimisationResult(result);
  }, [community.members, optimisationParams]);

  useEffect(() => {
    rerunOptimiser();
  }, [rerunOptimiser]);

  const addAuditLog = useCallback((action: string, details: string, category: AuditLogItem['category'] = 'system') => {
    const newLog: AuditLogItem = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }) + ' IST',
      actor: currentUser.name,
      action,
      details,
      category
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, [currentUser.name]);

  // Actions
  const switchRole = useCallback((role: UserRole) => {
    setCurrentRole(role);
    const newUser = DEMO_USERS[role] || DEMO_USERS['household'];
    setCurrentUser(newUser);
    localStorage.setItem(STORAGE_KEYS.ROLE, role);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
    addAuditLog('Role Switch', `Switched active demo context to ${newUser.name} (${newUser.roleTitle})`, 'system');
  }, [addAuditLog]);

  const updateCurrentUser = useCallback((updates: Partial<UserProfile>) => {
    setCurrentUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const applyAuthSession = (account: { id: string; name: string; email: string }, needsOnboarding: boolean = false) => {
    const authSession = saveAuthSession(account);
    const profile = buildAuthProfile(account, needsOnboarding);
    setSession(authSession);
    setCurrentRole('household');
    setCurrentUser(profile);
    localStorage.setItem(STORAGE_KEYS.ROLE, 'household');
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
  };

  const signUp = useCallback(async (name: string, email: string, password: string): Promise<AuthResult> => {
    const result = await registerAccount(name, email, password);
    if (!result.success || !result.account) {
      return { success: false, error: result.error || 'Unable to create your account.' };
    }
    applyAuthSession(result.account, true);
    return { success: true };
  }, []);

  const logIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const result = await authenticateAccount(email, password);
    if (!result.success || !result.account) {
      return { success: false, error: result.error || 'Unable to log in.' };
    }
    applyAuthSession(result.account, false);
    return { success: true };
  }, []);

  const logOut = useCallback(() => {
    clearAuthSession();
    setSession(null);
    setCurrentRole('household');
    setCurrentUser(DEMO_USERS['household']);
    localStorage.removeItem(STORAGE_KEYS.ROLE);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setIsSidebarOpen(false);
    navigateTo('/');
  }, [navigateTo]);

  const updateCommunity = useCallback((updates: Partial<CommunityProject>) => {
    setCommunity(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEYS.COMMUNITY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const inviteMember = useCallback((newMemberData: Omit<CommunityMember, 'id'>) => {
    const newId = `m_${Date.now()}`;
    const newMember: CommunityMember = {
      ...newMemberData,
      id: newId
    };
    setCommunity(prev => {
      const updatedMembers = [...prev.members, newMember];
      const updated = {
        ...prev,
        members: updatedMembers,
        totalEligibleFlats: prev.totalEligibleFlats + 1
      };
      localStorage.setItem(STORAGE_KEYS.COMMUNITY, JSON.stringify(updated));
      return updated;
    });
    addAuditLog(
      'Participant Added',
      `Invited ${newMember.ownerName} (${newMember.flatNumber}, ${newMember.tower}) with CA #${newMember.caNumber}`,
      'consent'
    );
  }, [addAuditLog]);

  const toggleMemberConsent = useCallback((memberId: string) => {
    setCommunity(prev => {
      const updatedMembers = prev.members.map(m => {
        if (m.id === memberId) {
          const nextSigned = !m.consentSigned;
          return {
            ...m,
            consentSigned: nextSigned,
            status: (nextSigned ? 'signed_deposited' : 'pending_invite') as CommunityMember['status']
          };
        }
        return m;
      });
      const updated = { ...prev, members: updatedMembers };
      localStorage.setItem(STORAGE_KEYS.COMMUNITY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateMemberStatus = useCallback(async (
    memberId: string,
    status: CommunityMember['status']
  ): Promise<{ success: boolean; error?: string }> => {
    const targetMember = community.members.find(m => m.id === memberId);
    if (!targetMember) {
      return { success: false, error: `Member with id '${memberId}' not found in roster.` };
    }

    // Send update to MongoDB backend
    const res = await apiClient.updateMemberStatus(memberId, status, currentUser.name);
    if (!res.success) {
      const errMsg = `Persistence Failed: ${res.error || 'Could not update member status in MongoDB'}`;
      setBackendError(errMsg);
      console.error('[AppContext]', errMsg);
      // Honest error reporting: do not pretend persistence succeeded!
      return { success: false, error: errMsg };
    }

    setBackendError(null);

    // Reconcile roster directly from database
    const refreshed = await refreshCommunity();
    if (!refreshed) {
      // If refresh failed, fall back to consistent local reconciliation
      const updated = community.members.map(m => {
        if (m.id === memberId) {
          return {
            ...m,
            status,
            consentSigned: status === 'signed_deposited' ? true : (status === 'withdrawn' ? false : m.consentSigned)
          };
        }
        return m;
      });

      const activeCommitted = updated.filter(m => m.status === 'signed_deposited').length;
      const activeTotalFunds = updated.filter(m => m.status !== 'withdrawn').reduce((acc, m) => acc + (m.depositPaidInr || 0), 0);

      updateCommunity({
        members: updated,
        committedMembersCount: activeCommitted,
        totalCommittedInr: activeTotalFunds
      });
    }

    addAuditLog(
      status === 'withdrawn' ? 'Member Withdrawal Recorded' : 'Member Status Updated',
      `${targetMember.ownerName} (${targetMember.flatNumber}) status updated to ${status}. Affordability solver re-evaluated.`,
      status === 'withdrawn' ? 'regulatory' : 'consent'
    );

    return { success: true };
  }, [community.members, currentUser.name, refreshCommunity, updateCommunity, addAuditLog]);

  const signUserConsent = useCallback(() => {
    updateCurrentUser({
      consentSigned: true,
      consentDate: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    });
    // Also update in community members list if matching
    const updated = community.members.map(m => {
      if (m.flatNumber.includes('301')) {
        return { ...m, consentSigned: true, status: 'signed_deposited' as const };
      }
      return m;
    });
    updateCommunity({
      members: updated,
      committedMembersCount: Math.min(community.totalEligibleFlats, community.committedMembersCount + 1),
      totalCommittedInr: community.totalCommittedInr + 45000
    });
    addAuditLog(
      'Digital Member Consent Executed',
      `Rohit Rao (Flat 301) digitally signed single-point BRPL Virtual Net Metering agreement.`,
      'consent'
    );
    setIsConsentModalOpen(false);
  }, [community, updateCurrentUser, updateCommunity, addAuditLog]);

  return (
    <AppContext.Provider
      value={{
        workspaceMode,
        setWorkspaceMode,
        currentRole,
        currentUser,
        switchRole,
        updateCurrentUser,
        currentPath,
        navigateTo,
        isAuthenticated,
        signUp,
        logIn,
        logOut,
        community,
        updateCommunity,
        inviteMember,
        toggleMemberConsent,
        updateMemberStatus,
        refreshCommunity,
        signUserConsent,
        isConsentModalOpen,
        setIsConsentModalOpen,
        isAiModalOpen,
        setIsAiModalOpen,
        aiMessages,
        setAiMessages,
        optimisationParams,
        setOptimisationParams,
        optimisationResult,
        rerunOptimiser,
        auditLogs,
        addAuditLog,
        backendOnline,
        backendError,
        clearBackendError,
        isSidebarOpen,
        setIsSidebarOpen
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
