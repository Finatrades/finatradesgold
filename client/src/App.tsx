import { Switch, Route, useLocation } from "wouter";
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
import { useEffect } from "react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  // Temporary bypass for development/demo purposes
  // Remove this block to enforce strict auth
  // if (!user) {
  //   return <Component />;
  // }

  useEffect(() => {
    if (!user) {
      setLocation('/login');
    }
  }, [user, setLocation]);

  if (!user) return null;
  return <Component />;
}

import Profile from "@/pages/Profile";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import KYCReview from "@/pages/admin/KYCReview";
import UserManagement from "@/pages/admin/UserManagement";
import UserDetails from "@/pages/admin/UserDetails";
import Transactions from "@/pages/admin/Transactions";
import VaultManagement from "@/pages/admin/VaultManagement";
import AdminSettings from "@/pages/admin/AdminSettings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/finavault">
        <ProtectedRoute component={FinaVault} />
      </Route>
      <Route path="/finapay">
        <ProtectedRoute component={FinaPay} />
      </Route>
      <Route path="/bnsl">
        <ProtectedRoute component={BNSL} />
      </Route>
      <Route path="/finabridge">
        <ProtectedRoute component={FinaBridge} />
      </Route>
      <Route path="/finacard">
        <ProtectedRoute component={FinaCard} />
      </Route>
      <Route path="/register" component={Register} />
      <Route path="/kyc">
        <ProtectedRoute component={KYC} />
      </Route>
      <Route path="/login" component={Login} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/dashboard/profile">
        <ProtectedRoute component={Profile} />
      </Route>
      
      {/* Admin Routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/kyc" component={KYCReview} />
      <Route path="/admin/users" component={UserManagement} />
      <Route path="/admin/users/:id" component={UserDetails} />
      <Route path="/admin/transactions" component={Transactions} />
      <Route path="/admin/vault" component={VaultManagement} />
      <Route path="/admin/settings" component={AdminSettings} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
