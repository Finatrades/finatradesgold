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
import Onboarding from "@/pages/Onboarding";
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

  useEffect(() => {
    if (!user) {
      setLocation('/onboarding');
    }
  }, [user, setLocation]);

  if (!user) return null;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/finavault" component={FinaVault} />
      <Route path="/finapay" component={FinaPay} />
      <Route path="/bnsl" component={BNSL} />
      <Route path="/finabridge" component={FinaBridge} />
      <Route path="/finacard">
        <ProtectedRoute component={FinaCard} />
      </Route>
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
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
