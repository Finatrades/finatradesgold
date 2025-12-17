import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import FinaVault from "@/pages/FinaVault";
import FinaPay from "@/pages/FinaPay";
import BNSL from "@/pages/BNSL";
import FinaBridge from "@/pages/FinaBridge";
import Register from "@/pages/Register"; // Renamed component export, file still named Onboarding.tsx for now
import KYC from "@/pages/KYC";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
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

function ProtectedRoute({ path, component: Component }: { path: string, component: React.ComponentType }) {
  const { user } = useAuth();

  return (
    <Route path={path}>
      {user ? <Component /> : <Redirect to="/login" />}
    </Route>
  );
}

import Profile from "@/pages/Profile";
import Security from "@/pages/Security";
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
import BNSLExplore from "@/pages/BNSLExplore";
import FinaVaultHistory from "@/pages/FinaVaultHistory";
import FinaBridgeRequests from "@/pages/FinaBridgeRequests";
import FinaBridgeProposals from "@/pages/FinaBridgeProposals";

import FinaPayTransactions from "@/pages/FinaPayTransactions";
import AllTransactions from "@/pages/AllTransactions";
import { FinaPayProvider } from "@/context/FinaPayContext";

import AdminChat from "@/pages/admin/AdminChat";
import CMSManagement from "@/pages/admin/CMSManagement";
import EmployeeManagement from "@/pages/admin/EmployeeManagement";
import PaymentGatewayManagement from "@/pages/admin/PaymentGatewayManagement";
import PlatformConfiguration from "@/pages/admin/PlatformConfiguration";
import SecuritySettings from "@/pages/admin/SecuritySettings";
import DocumentsManagement from "@/pages/admin/DocumentsManagement";
import ReferralManagement from "@/pages/admin/ReferralManagement";
import AuditLogs from "@/pages/admin/AuditLogs";
import ComplianceDashboard from "@/pages/admin/ComplianceDashboard";
import AdminLogin from "@/pages/admin/AdminLogin";
import EmailNotificationsManagement from "@/pages/admin/EmailNotificationsManagement";
import QADepositTest from "@/pages/QADepositTest";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/bnsl-explore" component={BNSLExplore} />
      <Route path="/register" component={Register} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/kyc" component={KYC} />
      
      {/* User Dashboard Routes */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/transactions" component={AllTransactions} />
      <ProtectedRoute path="/finapay/transactions" component={FinaPayTransactions} />
      <ProtectedRoute path="/finapay" component={FinaPay} />
      <ProtectedRoute path="/finavault/history" component={FinaVaultHistory} />
      <ProtectedRoute path="/finavault" component={FinaVault} />
      <ProtectedRoute path="/bnsl/explore" component={BNSLExplore} />
      <ProtectedRoute path="/bnsl" component={BNSL} />
      <ProtectedRoute path="/finabridge/requests" component={FinaBridgeRequests} />
      <ProtectedRoute path="/finabridge/proposals" component={FinaBridgeProposals} />
      <ProtectedRoute path="/finabridge" component={FinaBridge} />
      <ProtectedRoute path="/finacard" component={FinaCard} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/security" component={Security} />

      {/* Admin Routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/kyc" component={KYCReview} />
      <Route path="/admin/users" component={UserManagement} />
      <Route path="/admin/users/:id" component={UserDetails} />
      <Route path="/admin/transactions" component={Transactions} />
      <Route path="/admin/vault" component={FinaVaultManagement} />
      <Route path="/admin/vault-legacy" component={VaultManagement} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/chat" component={AdminChat} />
      <Route path="/admin/cms" component={CMSManagement} />
      <Route path="/admin/employees" component={EmployeeManagement} />
      <Route path="/admin/payment-gateways" component={PaymentGatewayManagement} />
      <Route path="/admin/platform-config" component={PlatformConfiguration} />
      <Route path="/admin/security" component={SecuritySettings} />
      <Route path="/admin/documents" component={DocumentsManagement} />
      <Route path="/admin/email-notifications" component={EmailNotificationsManagement} />
      
      {/* Renamed/Consolidated Modules */}
      <Route path="/admin/finapay" component={PaymentOperations} />
      <Route path="/admin/finabridge" component={FinaBridgeManagement} />
      <Route path="/admin/bnsl" component={BNSLManagement} />
      <Route path="/admin/fees" component={FeeManagement} />
      
      {/* Legacy/Redirects if needed */}
      <Route path="/admin/payments" component={PaymentOperations} />
      <Route path="/admin/cards" component={CardManagement} />
      <Route path="/admin/finance" component={TradeFinance} />
      <Route path="/admin/reports" component={FinancialReports} />
      <Route path="/admin/financial-reports" component={FinancialReports} />
      <Route path="/admin/referrals" component={ReferralManagement} />
      <Route path="/admin/audit-logs" component={AuditLogs} />
      <Route path="/admin/compliance" component={ComplianceDashboard} />
      
      {/* QA Routes */}
      <Route path="/qa/deposit-test" component={QADepositTest} />

      <Route component={NotFound} />
    </Switch>
  );
}

import { BnslProvider } from "@/context/BnslContext";
import { FeeProvider } from "@/context/FeeContext";
import { BrandingProvider } from "@/context/BrandingContext";
import { CMSProvider } from "@/context/CMSContext";
import { SocketProvider } from "@/context/SocketContext";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <BrandingProvider>
          <CMSProvider>
            <UserProvider>
              <AuthProvider>
                <SocketProvider>
                  <FeeProvider>
                    <PlatformProvider>
                      <TradeFinanceProvider>
                        <BnslProvider>
                          <FinaPayProvider>
                            <LanguageProvider>
                              <AccountTypeProvider>
                                <NotificationProvider>
                                  <TooltipProvider>
                                    <Toaster />
                                    <SonnerToaster position="top-right" richColors />
                                    <Router />
                                  </TooltipProvider>
                                </NotificationProvider>
                              </AccountTypeProvider>
                            </LanguageProvider>
                          </FinaPayProvider>
                        </BnslProvider>
                      </TradeFinanceProvider>
                    </PlatformProvider>
                  </FeeProvider>
                </SocketProvider>
              </AuthProvider>
            </UserProvider>
          </CMSProvider>
        </BrandingProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
