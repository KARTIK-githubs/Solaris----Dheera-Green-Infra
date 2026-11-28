import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
import { apiClient, setApiAccount, type AccountSession } from '../services/apiClient';

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
  session: AccountSession | null;
  isRestoringSession: boolean;
  sessionError: string | null;
  restoreSession: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  logIn: (email: string, password: string) => Promise<AuthResult>;
  logOut: () => Promise<void>;

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

const emptyRoster: CommunityProject = {
  ...INITIAL_COMMUNITY,
  name: 'Community roster',
  coordinatorName: '',
  members: [],
  totalEligibleFlats: 0,
  committedMembersCount: 0,
  totalCommittedInr: 0
};

const profileKey = (id: string) => `solaris_profile_${id}`;
const readProfile = (id: string): Partial<UserProfile> => {
  try {
    return JSON.parse(localStorage.getItem(profileKey(id)) ?? '{}') ?? {};
  } catch {
    return {};
  }
};

function buildAuthProfile(account: AccountSession, needsOnboarding = false): UserProfile {
  const saved = readProfile(account.id);
  const role: UserRole = account.role === 'admin' ? 'admin_auditor' :
    account.role === 'employee' ? 'installer_partner' : 'household';
  return {
    ...DEMO_USERS.household,
    consumerNumber: '',
    communityId: undefined,
    consentSigned: false,
    consentDate: undefined,
    ...saved,
    id: account.id,
    name: account.name,
    email: account.email,
    role,
    roleTitle: account.role === 'customer' ? 'Solaris customer' : `Solaris ${account.role}`,
    needsOnboarding: saved.needsOnboarding ?? needsOnboarding
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AccountSession | null>(null);
  const accountRef = useRef<AccountSession | null>(null);
  const sessionRevision = useRef(0);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const isAuthenticated = Boolean(session);
  const [workspaceMode, setWorkspaceModeState] = useState<WorkspaceMode>('customer');
  const [currentRole, setCurrentRole] = useState<UserRole>('household');
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_USERS.household);

  const setWorkspaceMode = useCallback((mode: WorkspaceMode) => {
    if (mode === 'employee' && (!accountRef.current || accountRef.current.role === 'customer')) return;
    setWorkspaceModeState(mode);
  }, []);

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
  const [aiMessages, setAiMessages] = useState<PersistentChatMessage[]>(() => initialChat());

  function initialChat(): PersistentChatMessage[] {
    return [
    {
      role: 'assistant',
      content: 'Hello! I am your Dheera Green Solar Assistant. How can I help you today with your rooftop solar system, energy generation, savings, or maintenance?',
      isLiveModel: false,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }
    ];
  }

  // 3. Community State
  const [community, setCommunity] = useState<CommunityProject>(INITIAL_COMMUNITY);

  // Backend Persistence State
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  const clearBackendError = useCallback(() => setBackendError(null), []);

  // Reusable community fetcher and database reconciler
  const refreshCommunity = useCallback(async (): Promise<boolean> => {
    const account = accountRef.current;
    if (!account || account.role === 'customer') return false;
    try {
      const res = await apiClient.getCommunity();
      if (accountRef.current !== account) return false;
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
        setBackendError(res.error || 'The persisted community roster is unavailable.');
        return false;
      }
    } catch {
      if (accountRef.current !== account) return false;
      setBackendOnline(false);
      setBackendError('The persisted community roster is unavailable.');
      return false;
    }
  }, []);

  useEffect(() => {
    if (session && session.role !== 'customer') void refreshCommunity();
  }, [session, refreshCommunity]);

  // 5. Modal & UI State
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 6. Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);

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

  const switchRole = useCallback((role: UserRole) => {
    if (accountRef.current) return;
    setCurrentRole(role);
    setCurrentUser(DEMO_USERS[role]);
  }, []);

  const updateCurrentUser = useCallback((updates: Partial<UserProfile>) => {
    const account = accountRef.current;
    setCurrentUser(previous => {
      const updated = { ...previous, ...updates };
      if (account && accountRef.current === account) {
        localStorage.setItem(profileKey(account.id), JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const applyAuthSession = useCallback((account: AccountSession | null, needsOnboarding = false) => {
    sessionRevision.current += 1;
    accountRef.current = account;
    setApiAccount(account?.id ?? null);
    setSession(account);
    const profile = account ? buildAuthProfile(account, needsOnboarding) : DEMO_USERS.household;
    setCurrentUser(profile);
    setCurrentRole(profile.role);
    setWorkspaceModeState(account && account.role !== 'customer' ? 'employee' : 'customer');
    setCommunity(account && account.role !== 'customer' ? emptyRoster : INITIAL_COMMUNITY);
    setAuditLogs(account ? [] : INITIAL_AUDIT_LOGS);
    setAiMessages(initialChat());
    setIsAiModalOpen(false);
    setIsConsentModalOpen(false);
    setIsSidebarOpen(false);
    setBackendError(null);
    setBackendOnline(null);
  }, []);

  const restoreSession = useCallback(async () => {
    setIsRestoringSession(true);
    setSessionError(null);
    const revision = sessionRevision.current;
    const result = await apiClient.getSession();
    if (revision !== sessionRevision.current) {
      setIsRestoringSession(false);
      return;
    }
    if (result.success && result.data) applyAuthSession(result.data);
    else if (result.httpStatus === 401) applyAuthSession(null);
    else setSessionError(result.error || 'Could not restore your session.');
    setIsRestoringSession(false);
  }, [applyAuthSession]);

  useEffect(() => {
    localStorage.removeItem('solaris_auth_session');
    localStorage.removeItem('solaris_auth_accounts');
    void restoreSession();
  }, [restoreSession]);

  const signUp = useCallback(async (name: string, email: string, password: string): Promise<AuthResult> => {
    const result = await apiClient.register(name, email, password);
    if (!result.success || !result.data) return { success: false, error: result.error || 'Unable to create your account.' };
    applyAuthSession(result.data, true);
    return { success: true };
  }, [applyAuthSession]);

  const logIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const result = await apiClient.login(email, password);
    if (!result.success || !result.data) return { success: false, error: result.error || 'Unable to sign in.' };
    applyAuthSession(result.data);
    return { success: true };
  }, [applyAuthSession]);

  const logOut = useCallback(async () => {
    const result = await apiClient.logout();
    if (!result.success) {
      setBackendError(result.error || 'Could not sign out. Try again.');
      return;
    }
    applyAuthSession(null);
    navigateTo('/');
  }, [applyAuthSession, navigateTo]);

  const updateCommunity = useCallback((updates: Partial<CommunityProject>) => {
    setCommunity(prev => {
      const updated = { ...prev, ...updates };
      return updated;
    });
  }, []);

  const inviteMember = useCallback((newMemberData: Omit<CommunityMember, 'id'>) => {
    if (accountRef.current) return;
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
      return updated;
    });
    addAuditLog(
      'Participant Added',
      `Invited ${newMember.ownerName} (${newMember.flatNumber}, ${newMember.tower}) with CA #${newMember.caNumber}`,
      'consent'
    );
  }, [addAuditLog]);

  const toggleMemberConsent = useCallback((memberId: string) => {
    if (accountRef.current) return;
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

    const account = accountRef.current;
    const res = await apiClient.updateMemberStatus(memberId, status);
    if (accountRef.current !== account) return { success: false, error: 'The account changed.' };
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
    if (accountRef.current !== account) return { success: false, error: 'The account changed.' };
    if (!refreshed) {
      // Reconcile the confirmed server mutation while the read is unavailable.
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
  }, [community.members, refreshCommunity, updateCommunity, addAuditLog]);

  const signUserConsent = useCallback(() => {
    updateCurrentUser({
      consentSigned: true,
      consentDate: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    });
    if (accountRef.current) {
      setIsConsentModalOpen(false);
      return;
    }
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
        session,
        isRestoringSession,
        sessionError,
        restoreSession,
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
