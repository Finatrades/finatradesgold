import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
// Light mode only - dark mode disabled
import NotFound from "@/pages/not-found";
import MaintenancePage from "@/pages/MaintenancePage";
import FinaVault from "@/pages/FinaVault";
import FinaPay from "@/pages/FinaPay";
import BNSL from "@/pages/BNSL";
import FinaBridge from "@/pages/FinaBridge";
import Register from "@/pages/Register";
import KYC from "@/pages/KYC";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import VerifyCertificate from "@/pages/VerifyCertificate";
import FinaCard from "@/pages/FinaCard";
import Dashboard from "@/pages/Dashboard";
import { LanguageProvider } from "@/context/LanguageContext";
import { AccountTypeProvider } from "@/context/AccountTypeContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { PlatformProvider } from "@/context/PlatformContext";
import { TradeFinanceProvider } from "@/context/TradeFinanceContext";
import { UserProvider } from "@/context/UserContext";
import { useEffect } from "react";

// Scroll to top on route change
function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location]);
  
  return null;
}

function ProtectedRoute({ path, component: Component }: { path: string, component: React.ComponentType }) {
  const { user, loading } = useAuth();

  return (
    <Route path={path}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : user ? (
        <Component />
      ) : (
        <Redirect to="/login" />
      )}
    </Route>
  );
}

function PublicRoute({ path, component: Component }: { path: string, component: React.ComponentType }) {
  const { user, loading, adminPortal } = useAuth();

  return (
    <Route path={path}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : user ? (
        <Redirect to={user.role === 'admin' || adminPortal ? "/admin" : "/dashboard"} />
      ) : (
        <Component />
      )}
    </Route>
  );
}

function getDomainModeFromHostname(): 'personal' | 'business' {
  if (typeof window === 'undefined') return 'personal';
  const hostname = window.location.hostname.toLowerCase();
  if (hostname.includes('finagold')) return 'personal';
  if (hostname.includes('finatrades')) return 'business';
  return 'personal';
}

function HomeRedirect() {
  const { user, loading, adminPortal } = useAuth();
  const domainMode = getDomainModeFromHostname();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to={domainMode === 'business' ? "/finatrades" : "/finagold"} />;
  }
  
  // Redirect admins to admin dashboard, regular users to user dashboard
  if (user.role === 'admin' || adminPortal) {
    return <Redirect to="/admin" />;
  }
  
  return <Redirect to="/dashboard" />;
}

import Profile from "@/pages/Profile";
import Security from "@/pages/Security";
import Referral from "@/pages/Referral";
import Notifications from "@/pages/Notifications";
import HelpCenter from "@/pages/HelpCenter";
import Settings from "@/pages/Settings";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import KYCReview from "@/pages/admin/KYCReview";
import UserManagement from "@/pages/admin/UserManagement";
import UserDetails from "@/pages/admin/UserDetails";
import Transactions from "@/pages/admin/Transactions";
import VaultManagement from "@/pages/admin/VaultManagement";
import AdminSettings from "@/pages/admin/AdminSettings";
import PaymentOperations from "@/pages/admin/PaymentOperations";
import CardManagement from "@/pages/admin/CardManagement";
import TradeFinance from "@/pages/admin/TradeFinance";
import BNSLManagement from "@/pages/admin/BNSLManagement";
import FinaBridgeManagement from "@/pages/admin/FinaBridgeManagement";
import FinaVaultManagement from "@/pages/admin/FinaVaultManagement";
import FeeManagement from "@/pages/admin/FeeManagement";
import FinancialReports from "@/pages/admin/FinancialReports";
import AccountStatements from "@/pages/admin/AccountStatements";
import DatabaseBackups from "@/pages/admin/DatabaseBackups";
import GeoRestrictions from "@/pages/admin/GeoRestrictions";
import BNSLExplore from "@/pages/BNSLExplore";
import FinaVaultHistory from "@/pages/FinaVaultHistory";
import PhysicalGoldDeposit from "@/pages/PhysicalGoldDeposit";
import PhysicalDepositsAdmin from "@/pages/admin/PhysicalDepositsAdmin";
import BNSLHistory from "@/pages/BNSLHistory";
import FinaBridgeHistory from "@/pages/FinaBridgeHistory";
import FinaBridgeRequests from "@/pages/FinaBridgeRequests";
import FinaBridgeProposals from "@/pages/FinaBridgeProposals";

import FinaPayTransactions from "@/pages/FinaPayTransactions";
import AllTransactions from "@/pages/AllTransactions";
import { FinaPayProvider } from "@/context/FinaPayContext";

import AdminChat from "@/pages/admin/AdminChat";
import CMSManagement from "@/pages/admin/CMSManagement";
import EmployeeManagement from "@/pages/admin/EmployeeManagement";
import RoleManagement from "@/pages/admin/RoleManagement";
import ApprovalQueue from "@/pages/admin/ApprovalQueue";
import PaymentGatewayManagement from "@/pages/admin/PaymentGatewayManagement";
import PlatformConfiguration from "@/pages/admin/PlatformConfiguration";
import SecuritySettings from "@/pages/admin/SecuritySettings";
import DocumentsManagement from "@/pages/admin/DocumentsManagement";
import AttachmentsManagement from "@/pages/admin/AttachmentsManagement";
import ReferralManagement from "@/pages/admin/ReferralManagement";
import AuditLogs from "@/pages/admin/AuditLogs";
import WorkflowAudit from "@/pages/admin/WorkflowAudit";
import SystemHealth from "@/pages/admin/SystemHealth";
import GoldBackingReport from "@/pages/admin/GoldBackingReport";
import VaultDashboard from "@/pages/admin/VaultDashboard";
import VaultExposure from "@/pages/admin/VaultExposure";
import VaultPhysicalRegistry from "@/pages/admin/VaultPhysicalRegistry";
import VaultLocations from "@/pages/admin/VaultLocations";
import VaultReconciliation from "@/pages/admin/VaultReconciliation";
import UnifiedGoldTally from "@/pages/admin/UnifiedGoldTally";
import UnifiedPaymentManagement from "@/pages/admin/UnifiedPaymentManagement";
import ComplianceDashboard from "@/pages/admin/ComplianceDashboard";
import AdminLogin from "@/pages/admin/AdminLogin";
import EmailNotificationsManagement from "@/pages/admin/EmailNotificationsManagement";
import UserPreferencesManagement from "@/pages/admin/UserPreferencesManagement";
import AccountDeletionRequests from "@/pages/admin/AccountDeletionRequests";
import AuditTrail from "@/pages/admin/AuditTrail";
import DailyReconciliation from "@/pages/admin/DailyReconciliation";
import RiskExposure from "@/pages/admin/RiskExposure";
import SuspiciousActivityReports from "@/pages/admin/SuspiciousActivityReports";
import ScheduledJobs from "@/pages/admin/ScheduledJobs";
import ApiLogs from "@/pages/admin/ApiLogs";
import RegulatoryReports from "@/pages/admin/RegulatoryReports";
import Announcements from "@/pages/admin/Announcements";
import InterestCalculator from "@/pages/admin/InterestCalculator";
import WingoldOrders from "@/pages/admin/WingoldOrders";
import WingoldCallback from "@/pages/WingoldCallback";
import FinagoldLanding from "@/pages/finagold/FinagoldLanding";
import FinatradesLanding from "@/pages/finatrades/FinatradesLanding";
import BNSLLanding from "@/pages/finagold/BNSLLanding";
import FinaVaultLanding from "@/pages/finagold/FinaVaultLanding";
import FinaBridgeLanding from "@/pages/finagold/FinaBridgeLanding";
import FinaPayLanding from "@/pages/finagold/FinaPayLanding";
import PrivacyPolicy from "@/pages/finagold/PrivacyPolicy";
import TermsConditions from "@/pages/finagold/TermsConditions";
import Disclaimer from "@/pages/finagold/Disclaimer";

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/finagold" component={FinagoldLanding} />
      <Route path="/finatrades" component={FinatradesLanding} />
      <Route path="/finagold/bnsl" component={BNSLLanding} />
      <Route path="/finagold/finapay" component={FinaPayLanding} />
      <Route path="/finagold/finavault" component={FinaVaultLanding} />
      <Route path="/finagold/finabridge" component={FinaBridgeLanding} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsConditions} />
      <Route path="/disclaimer" component={Disclaimer} />
      <Route path="/bnsl-landing" component={BNSLLanding} />
      <Route path="/finavault-landing" component={FinaVaultLanding} />
      <Route path="/finabridge-landing" component={FinaBridgeLanding} />
      <Route path="/finapay-landing" component={FinaPayLanding} />
      <Route path="/bnsl-explore" component={BNSLExplore} />
      <Route path="/get-started" component={Register} />
      <Route path="/sign-in" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-certificate" component={VerifyCertificate} />
      <Route path="/kyc" component={KYC} />
      <Route path="/wingold/callback" component={WingoldCallback} />
      
      {/* User Dashboard Routes */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/transactions" component={AllTransactions} />
      <ProtectedRoute path="/finapay/transactions" component={FinaPayTransactions} />
      <ProtectedRoute path="/finapay" component={FinaPay} />
      <ProtectedRoute path="/finavault/history" component={FinaVaultHistory} />
      <ProtectedRoute path="/physical-gold-deposit" component={PhysicalGoldDeposit} />
      <ProtectedRoute path="/finavault" component={FinaVault} />
      <ProtectedRoute path="/bnsl/explore" component={BNSLExplore} />
      <ProtectedRoute path="/bnsl/history" component={BNSLHistory} />
      <ProtectedRoute path="/bnsl" component={BNSL} />
      <ProtectedRoute path="/finabridge/requests" component={FinaBridgeRequests} />
      <ProtectedRoute path="/finabridge/proposals" component={FinaBridgeProposals} />
      <ProtectedRoute path="/finabridge/history" component={FinaBridgeHistory} />
      <ProtectedRoute path="/finabridge" component={FinaBridge} />
      <ProtectedRoute path="/finacard" component={FinaCard} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/security" component={Security} />
      <ProtectedRoute path="/referral" component={Referral} />
      <ProtectedRoute path="/notifications" component={Notifications} />
      <ProtectedRoute path="/help" component={HelpCenter} />
      <ProtectedRoute path="/settings" component={Settings} />

      {/* Admin Routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/kyc" component={KYCReview} />
      <Route path="/admin/users" component={UserManagement} />
      <Route path="/admin/users/:id" component={UserDetails} />
      <Route path="/admin/transactions" component={Transactions} />
      <Route path="/admin/vault" component={FinaVaultManagement} />
      <Route path="/admin/physical-deposits" component={PhysicalDepositsAdmin} />
      <Route path="/admin/vault-legacy" component={VaultManagement} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/chat" component={AdminChat} />
      <Route path="/admin/cms" component={CMSManagement} />
      <Route path="/admin/employees" component={EmployeeManagement} />
      <Route path="/admin/roles" component={RoleManagement} />
      <Route path="/admin/approvals" component={ApprovalQueue} />
      <Route path="/admin/payment-gateways" component={PaymentGatewayManagement} />
      <Route path="/admin/platform-config" component={PlatformConfiguration} />
      <Route path="/admin/database-backups" component={DatabaseBackups} />
      <Route path="/admin/geo-restrictions" component={GeoRestrictions} />
      <Route path="/admin/security" component={SecuritySettings} />
      <Route path="/admin/documents" component={DocumentsManagement} />
      <Route path="/admin/attachments" component={AttachmentsManagement} />
      <Route path="/admin/email-notifications" component={EmailNotificationsManagement} />
      <Route path="/admin/user-preferences" component={UserPreferencesManagement} />
      <Route path="/admin/account-deletion-requests" component={AccountDeletionRequests} />
      <Route path="/admin/audit-trail" component={AuditTrail} />
      <Route path="/admin/daily-reconciliation" component={DailyReconciliation} />
      <Route path="/admin/risk-exposure" component={RiskExposure} />
      <Route path="/admin/sar-reports" component={SuspiciousActivityReports} />
      <Route path="/admin/scheduled-jobs" component={ScheduledJobs} />
      <Route path="/admin/api-logs" component={ApiLogs} />
      <Route path="/admin/regulatory-reports" component={RegulatoryReports} />
      
      {/* Renamed/Consolidated Modules */}
      <Route path="/admin/finapay" component={PaymentOperations} />
      <Route path="/admin/finabridge" component={FinaBridgeManagement} />
      <Route path="/admin/bnsl" component={BNSLManagement} />
      <Route path="/admin/fees" component={FeeManagement} />
      
      {/* Legacy/Redirects if needed */}
      <Route path="/admin/payments" component={PaymentOperations} />
      <Route path="/admin/payment-operations" component={PaymentOperations} />
      <Route path="/admin/cards" component={CardManagement} />
      <Route path="/admin/finance" component={TradeFinance} />
      <Route path="/admin/reports" component={FinancialReports} />
      <Route path="/admin/financial-reports" component={FinancialReports} />
      <Route path="/admin/account-statements" component={AccountStatements} />
      <Route path="/admin/referrals" component={ReferralManagement} />
      <Route path="/admin/audit-logs" component={AuditLogs} />
      <Route path="/admin/workflow-audit" component={WorkflowAudit} />
      <Route path="/admin/system-health" component={SystemHealth} />
      <Route path="/admin/gold-backing" component={GoldBackingReport} />
      <Route path="/admin/vault-dashboard" component={VaultDashboard} />
      <Route path="/admin/vault-exposure" component={VaultExposure} />
      <Route path="/admin/vault-physical-registry" component={VaultPhysicalRegistry} />
      <Route path="/admin/vault-locations" component={VaultLocations} />
      <Route path="/admin/vault-routing" component={VaultLocations} />
      <Route path="/admin/vault-reconciliation" component={VaultReconciliation} />
      <Route path="/admin/unified-gold-tally" component={UnifiedGoldTally} />
      <Route path="/admin/unified-payments" component={UnifiedPaymentManagement} />
      <Route path="/admin/compliance" component={ComplianceDashboard} />
      
      {/* Operations & Finance */}
      <Route path="/admin/interest-calculator" component={InterestCalculator} />
      <Route path="/admin/wingold-orders" component={WingoldOrders} />
      
      {/* Analytics & Business Intelligence */}
      
      {/* System & DevOps */}
      
      {/* Communication */}
      <Route path="/admin/announcements" component={Announcements} />

      <Route component={NotFound} />
    </Switch>
    </>
  );
}

import { BnslProvider } from "@/context/BnslContext";
import { FeeProvider } from "@/context/FeeContext";
import { BrandingProvider } from "@/context/BrandingContext";
import { CMSProvider } from "@/context/CMSContext";
import { SocketProvider } from "@/context/SocketContext";
import { DataSyncProvider } from "@/hooks/useDataSync";
import { TourProvider } from "@/components/tour/TourProvider";

function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const { data: systemStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const res = await fetch('/api/system/status');
      return res.json();
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const isAdminRoute = location.startsWith('/admin');
  const isPublicRoute = ['/', '/finagold', '/login', '/register', '/get-started', '/sign-in', 
    '/forgot-password', '/reset-password', '/verify-email', '/verify-certificate',
    '/privacy', '/terms', '/disclaimer'].some(p => location === p || location.startsWith('/finagold'));

  if (systemStatus?.maintenanceMode && !systemStatus?.isAdmin && !isAdminRoute && !isPublicRoute && !user?.role?.includes('admin')) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <BrandingProvider>
          <CMSProvider>
            <UserProvider>
              <AuthProvider>
                <SocketProvider>
                  <DataSyncProvider>
                    <FeeProvider>
                    <PlatformProvider>
                      <TradeFinanceProvider>
                        <BnslProvider>
                          <FinaPayProvider>
                            <LanguageProvider>
                              <AccountTypeProvider>
                                <NotificationProvider>
                                  <TooltipProvider>
                                    <TourProvider>
                                      <Toaster />
                                      <SonnerToaster position="top-right" richColors />
                                      <MaintenanceGuard>
                                        <Router />
                                      </MaintenanceGuard>
                                    </TourProvider>
                                  </TooltipProvider>
                                </NotificationProvider>
                              </AccountTypeProvider>
                            </LanguageProvider>
                          </FinaPayProvider>
                        </BnslProvider>
                      </TradeFinanceProvider>
                    </PlatformProvider>
                    </FeeProvider>
                  </DataSyncProvider>
                </SocketProvider>
              </AuthProvider>
            </UserProvider>
          </CMSProvider>
        </BrandingProvider>
      </QueryClientProvider>
  );
}

export default App;
