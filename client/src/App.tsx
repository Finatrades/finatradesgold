import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import FinaVault from "@/pages/FinaVault";
import FinaPay from "@/pages/FinaPay";
import BNSL from "@/pages/BNSL";
import FinaBridge from "@/pages/FinaBridge";
import Register from "@/pages/Register"; // Renamed component export, file still named Onboarding.tsx for now
import KYC from "@/pages/KYC";
import Login from "@/pages/Login";
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
import BNSLTemplates from "@/pages/admin/BNSLTemplates";
import FinaBridgeManagement from "@/pages/admin/FinaBridgeManagement";

import FinaPayDashboard from "@/pages/FinaPayDashboard";
import { FinaPayProvider } from "@/context/FinaPayContext";

import AdminChat from "@/pages/admin/AdminChat";
import ReferralProgram from "@/pages/ReferralProgram";
import CustomDashboard from "@/pages/CustomDashboard";
import BankAccounts from "@/pages/BankAccounts";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/kyc" component={KYC} />
      
      {/* User Dashboard Routes */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/finapay" component={FinaPayDashboard} />
      <ProtectedRoute path="/finavault" component={FinaVault} />
      <ProtectedRoute path="/bnsl" component={BNSL} />
      <ProtectedRoute path="/finabridge" component={FinaBridge} />
      <ProtectedRoute path="/finacard" component={FinaCard} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/referrals" component={ReferralProgram} />
      <ProtectedRoute path="/my-dashboard" component={CustomDashboard} />
      <ProtectedRoute path="/bank-accounts" component={BankAccounts} />

      {/* Admin Routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/kyc" component={KYCReview} />
      <Route path="/admin/users" component={UserManagement} />
      <Route path="/admin/users/:id" component={UserDetails} />
      <Route path="/admin/transactions" component={Transactions} />
      <Route path="/admin/vault" component={VaultManagement} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/chat" component={AdminChat} />
      
      {/* Renamed/Consolidated Modules */}
      <Route path="/admin/finapay" component={PaymentOperations} />
      <Route path="/admin/finabridge" component={FinaBridgeManagement} />
      <Route path="/admin/bnsl" component={BNSLManagement} />
      <Route path="/admin/bnsl/templates" component={BNSLTemplates} />
      
      {/* Legacy/Redirects if needed */}
      <Route path="/admin/payments" component={PaymentOperations} />
      <Route path="/admin/cards" component={CardManagement} />
      <Route path="/admin/finance" component={TradeFinance} />

      <Route component={NotFound} />
    </Switch>
  );
}

import { BnslProvider } from "@/context/BnslContext";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <AuthProvider>
          <PlatformProvider>
            <TradeFinanceProvider>
              <BnslProvider>
                <FinaPayProvider>
                  <LanguageProvider>
                    <AccountTypeProvider>
                      <NotificationProvider>
                        <TooltipProvider>
                          <Toaster />
                          <Router />
                        </TooltipProvider>
                      </NotificationProvider>
                    </AccountTypeProvider>
                  </LanguageProvider>
                </FinaPayProvider>
              </BnslProvider>
            </TradeFinanceProvider>
          </PlatformProvider>
        </AuthProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
