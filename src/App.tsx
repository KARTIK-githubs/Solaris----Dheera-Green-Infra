import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { Sidebar } from './components/common/Sidebar';
import { ConsentModal } from './components/common/ConsentModal';
import { AiAdvisorModal } from './components/common/AiAdvisorModal';

// Pages
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { InstallationPage } from './pages/InstallationPage';
import { PerformancePage } from './pages/PerformancePage';
import { SavingsPage } from './pages/SavingsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { SupportPage } from './pages/SupportPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { AssessmentPage } from './pages/AssessmentPage';
import { RegulationsPage } from './pages/RegulationsPage';
import { CommunityPage } from './pages/CommunityPage';
import { OptimiserPage } from './pages/OptimiserPage';
import { CreditAllocationPage } from './pages/CreditAllocationPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { ReportsPage } from './pages/ReportsPage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

const RouterView: React.FC = () => {
  const { currentPath, isAuthenticated, navigateTo, currentUser, isAiModalOpen, setIsAiModalOpen } = useApp();
  const isPublicPath = currentPath === '/' || currentPath === '/login' || currentPath === '/signup';
  const needsOnboarding = currentUser?.needsOnboarding === true;
  const hasCompletedOnboarding = currentUser?.onboardingCompleted === true;

  useEffect(() => {
    if (!isAuthenticated && !isPublicPath) {
      if (currentPath !== '/') {
        navigateTo('/');
      }
    } else if (isAuthenticated && (currentPath === '/login' || currentPath === '/signup')) {
      navigateTo('/dashboard');
    } else if (isAuthenticated && needsOnboarding && !hasCompletedOnboarding && currentPath !== '/onboarding') {
      // Redirect to onboarding only for new signups who have not yet completed onboarding
      navigateTo('/onboarding');
    } else if (isAuthenticated && hasCompletedOnboarding && currentPath === '/onboarding') {
      // Redirect away from onboarding once completed
      navigateTo('/dashboard');
    }
  }, [currentPath, isAuthenticated, isPublicPath, needsOnboarding, hasCompletedOnboarding, navigateTo]);

  const getSubtitle = () => {
    switch (currentPath) {
      case '/':
        return 'Public Showcase';
      case '/dashboard':
        return 'Customer Solar Companion';
      case '/installation':
        return 'My Solar Installation';
      case '/performance':
        return 'Generation & Performance';
      case '/savings':
        return 'Savings & Financials';
      case '/documents':
        return 'Documents & Warranties';
      case '/support':
        return 'Maintenance & Support Desk';
      case '/onboarding':
        return 'Location & Profile Setup';
      case '/assessment':
        return 'Solar Feasibility Calculator';
      case '/regulations':
        return 'Regulatory Eligibility Checker';
      case '/community':
        return 'Community Solar Workspace';
      case '/optimiser':
        return 'Smart Affordability Optimiser';
      case '/credit-allocation':
        return 'Credit Allocation Ledger';
      case '/monitoring':
        return 'Synthetic O&M Monitoring';
      case '/reports':
        return 'Reports & Statutory Statements';
      case '/admin':
        return 'Rules & Audit Ledger';
      default:
        if (currentPath.startsWith('/community')) {
          return 'Community Solar Workspace';
        }
        return 'Customer Solar Companion';
    }
  };

  const renderContent = () => {
    switch (currentPath) {
      case '/':
        return <LandingPage />;
      case '/login':
        return <LoginPage />;
      case '/signup':
        return <SignupPage />;
      case '/dashboard':
        return <DashboardPage />;
      case '/installation':
        return <InstallationPage />;
      case '/performance':
        return <PerformancePage />;
      case '/savings':
        return <SavingsPage />;
      case '/documents':
        return <DocumentsPage />;
      case '/support':
        return <SupportPage />;
      case '/onboarding':
        return <OnboardingPage />;
      case '/assessment':
        return <AssessmentPage />;
      case '/regulations':
        return <RegulationsPage />;
      case '/community':
        return <CommunityPage />;
      case '/optimiser':
        return <OptimiserPage />;
      case '/credit-allocation':
        return <CreditAllocationPage />;
      case '/monitoring':
        return <MonitoringPage />;
      case '/reports':
        return <ReportsPage />;
      case '/admin':
        return <AdminPage />;
      default:
        if (currentPath.startsWith('/community')) {
          return <CommunityPage />;
        }
        return <DashboardPage />;
    }
  };

  const showAppShell = isAuthenticated && !isPublicPath;
  const content = !isAuthenticated && !isPublicPath ? <LandingPage /> : renderContent();

  return (
    <div className="min-h-screen bg-[#F8FAF7] text-[#1C2930] flex flex-col antialiased selection:bg-[#9af4d8] selection:text-[#00725d]">
      {showAppShell ? (
        <>
          <Header subtitle={getSubtitle()} />
          <main className="flex-1 w-full pt-20 pb-20 md:pb-8">
            {content}
          </main>
          <Sidebar />
          <BottomNav />
          <ConsentModal />
          <AiAdvisorModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} />
        </>
      ) : (
        <main className="flex-1 w-full">{content}</main>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <RouterView />
    </AppProvider>
  );
}
