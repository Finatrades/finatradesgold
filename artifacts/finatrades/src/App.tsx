import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AccountTypeProvider } from "@/context/AccountTypeContext";
import EcosystemLanding from "@/pages/ecosystem/EcosystemLanding";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardOverview from "@/pages/dashboard/DashboardOverview";

// Lazy inner pages — add as built
import { lazy, Suspense } from "react";
const MobileFinaPay = lazy(() => import("@/components/mobile/MobileFinaPay"));
const MobileFinaBridge = lazy(() => import("@/components/mobile/MobileFinaBridge"));
const MobileBNSL = lazy(() => import("@/components/mobile/MobileBNSL"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#E8E2DC', borderTopColor: '#C73B22' }} />
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  if (loading) return <PageLoader />;
  if (!user) {
    setLocation('/login');
    return null;
  }
  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    </DashboardLayout>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={EcosystemLanding} />
      <Route path="/ecosystem" component={EcosystemLanding} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Protected — Dashboard */}
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardOverview} />
      </Route>

      {/* Protected — Finance */}
      <Route path="/finapay">
        <ProtectedRoute component={MobileFinaPay as any} />
      </Route>
      <Route path="/finabridge">
        <ProtectedRoute component={MobileFinaBridge as any} />
      </Route>
      <Route path="/bnsl">
        <ProtectedRoute component={MobileBNSL as any} />
      </Route>

      {/* Stub routes — show placeholder until built */}
      <Route path="/consignments">
        <ProtectedRoute component={() => <ComingSoon title="Consignments" desc="Create and manage your commodity consignments" />} />
      </Route>
      <Route path="/inventory">
        <ProtectedRoute component={() => <ComingSoon title="Warehouse & Inventory" desc="Track verified inventory across 14 African hubs" />} />
      </Route>
      <Route path="/marketplace">
        <ProtectedRoute component={() => <ComingSoon title="Marketplace" desc="14-Hub commodity discovery, RFQ and matching" />} />
      </Route>
      <Route path="/orders">
        <ProtectedRoute component={() => <ComingSoon title="RFQ & Orders" desc="Manage buyer requests and purchase orders" />} />
      </Route>
      <Route path="/escrow">
        <ProtectedRoute component={() => <ComingSoon title="Escrow & Settlement" desc="FUSD-backed escrow and deal completion" />} />
      </Route>
      <Route path="/finavault">
        <ProtectedRoute component={() => <ComingSoon title="Gold Vault" desc="Physically backed gold storage and certificates" />} />
      </Route>
      <Route path="/certificates">
        <ProtectedRoute component={() => <ComingSoon title="Certificates" desc="Digital ownership and warehouse receipts" />} />
      </Route>
      <Route path="/barter">
        <ProtectedRoute component={() => <ComingSoon title="Government Barter" desc="Sovereign commodity barter and structured settlement" />} />
      </Route>
      <Route path="/sovereign">
        <ProtectedRoute component={() => <ComingSoon title="Sovereign Programs" desc="Government-backed trade and policy programs" />} />
      </Route>
      <Route path="/transactions">
        <ProtectedRoute component={() => <ComingSoon title="Transactions" desc="Full transaction history and audit trail" />} />
      </Route>
      <Route path="/notifications">
        <ProtectedRoute component={() => <ComingSoon title="Notifications" desc="Platform alerts, approvals and updates" />} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={() => <ComingSoon title="Profile" desc="Manage your account and company details" />} />
      </Route>
      <Route path="/kyc">
        <ProtectedRoute component={() => <ComingSoon title="KYC / Compliance" desc="Identity verification and compliance status" />} />
      </Route>
      <Route path="/security">
        <ProtectedRoute component={() => <ComingSoon title="Security" desc="2FA, session management and access control" />} />
      </Route>
      <Route path="/help">
        <ProtectedRoute component={() => <ComingSoon title="Help & Support" desc="Documentation, FAQs and support tickets" />} />
      </Route>

      {/* Fallback */}
      <Route component={EcosystemLanding} />
    </Switch>
  );
}

function ComingSoon({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'rgba(199,59,34,0.08)', border: '1.5px solid rgba(199,59,34,0.15)' }}>
        <span className="text-2xl">🚧</span>
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>{title}</h2>
      <p className="text-sm max-w-xs" style={{ color: '#888880' }}>{desc}</p>
      <p className="text-xs mt-3 px-3 py-1.5 rounded-full" style={{ background: 'rgba(199,59,34,0.06)', color: '#C73B22', border: '1px solid rgba(199,59,34,0.15)' }}>
        Coming soon — in active development
      </p>
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AccountTypeProvider>
            <AppRoutes />
            <Toaster />
          </AccountTypeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
