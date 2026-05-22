import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Consignments from "@/pages/Consignments";
import Inventory from "@/pages/Inventory";
import Marketplace from "@/pages/Marketplace";
import RFQs from "@/pages/RFQs";
import Orders from "@/pages/Orders";
import Warehouses from "@/pages/Warehouses";
import Escrows from "@/pages/Escrows";
import Barter from "@/pages/Barter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    }
  }
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Protected Routes */}
      <Route path="/dashboard">
        <AppLayout><Dashboard /></AppLayout>
      </Route>
      <Route path="/consignments">
        <AppLayout><Consignments /></AppLayout>
      </Route>
      <Route path="/inventory">
        <AppLayout><Inventory /></AppLayout>
      </Route>
      <Route path="/marketplace">
        <AppLayout><Marketplace /></AppLayout>
      </Route>
      <Route path="/rfq">
        <AppLayout><RFQs /></AppLayout>
      </Route>
      <Route path="/orders">
        <AppLayout><Orders /></AppLayout>
      </Route>
      <Route path="/warehouses">
        <AppLayout><Warehouses /></AppLayout>
      </Route>
      <Route path="/escrow">
        <AppLayout><Escrows /></AppLayout>
      </Route>
      <Route path="/barter">
        <AppLayout><Barter /></AppLayout>
      </Route>
      <Route path="/hubs">
        <AppLayout><div className="p-8">Hubs Map Placeholder</div></AppLayout>
      </Route>
      <Route path="/profile">
        <AppLayout><div className="p-8">Profile Placeholder</div></AppLayout>
      </Route>
      
      <Route path="/">
        <AppLayout><Dashboard /></AppLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
