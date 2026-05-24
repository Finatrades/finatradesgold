import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { AccountTypeProvider } from "@/context/AccountTypeContext";
import EcosystemLanding from "@/pages/ecosystem/EcosystemLanding";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardOverview from "@/pages/dashboard/DashboardOverview";
import Consignments from "@/pages/dashboard/Consignments";
import ConsignmentDetail from "@/pages/dashboard/ConsignmentDetail";
import Marketplace from "@/pages/dashboard/Marketplace";
import MarketplaceDetail from "@/pages/dashboard/MarketplaceDetail";
import MyRfqs from "@/pages/dashboard/MyRfqs";
import IncomingRfqs from "@/pages/dashboard/IncomingRfqs";
import MyOrders from "@/pages/dashboard/MyOrders";
import Watchlist from "@/pages/dashboard/Watchlist";
import Inventory from "@/pages/dashboard/Inventory";
import Warehouse from "@/pages/dashboard/Warehouse";
import Orders from "@/pages/dashboard/Orders";
import Escrow from "@/pages/dashboard/Escrow";
import Transactions from "@/pages/dashboard/Transactions";
import KycPage from "@/pages/dashboard/KycPage";
import ProfilePage from "@/pages/dashboard/ProfilePage";
import Wallet from "@/pages/dashboard/Wallet";
import AdminWallets from "@/pages/dashboard/AdminWallets";
import AdminConsignmentsQueue from "@/pages/dashboard/AdminConsignmentsQueue";
import AdminLcQueue from "@/pages/admin/AdminLcQueue";
import AdminDisputeQueue from "@/pages/admin/AdminDisputeQueue";
import AdminKycQueue from "@/pages/admin/AdminKycQueue";
import AdminConsignmentReview from "@/pages/dashboard/AdminConsignmentReview";
import AdminEmailQueues from "@/pages/dashboard/AdminEmailQueues";
import VerifyWarehouseReceipt from "@/pages/public/VerifyWarehouseReceipt";
import { Suspense, useEffect } from "react";
import { canAccess } from "@/lib/roleMenus";

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#E8E2DC', borderTopColor: '#C73B22' }} />
    </div>
  );
}

function ProtectedRoute({ component: Component, path }: { component: React.ComponentType; path?: string }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

  if (loading || !user) return <PageLoader />;

  if (path && !canAccess(path, user)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(199,59,34,0.08)', border: '1.5px solid rgba(199,59,34,0.15)' }}>
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>Restricted Module</h2>
          <p className="text-sm max-w-sm" style={{ color: '#888880' }}>
            This module is not available for your role. Contact your account manager if you believe this is an error.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    </DashboardLayout>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!loading && !user) setLocation('/login');
  }, [user, loading, setLocation]);
  if (loading || !user) return <PageLoader />;
  if (user.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(199,59,34,0.08)', border: '1.5px solid rgba(199,59,34,0.15)' }}>
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>Admin Access Required</h2>
          <p className="text-sm max-w-sm" style={{ color: '#888880' }}>This page is for platform administrators only.</p>
        </div>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    </DashboardLayout>
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
      <p className="text-xs mt-3 px-3 py-1.5 rounded-full"
        style={{ background: 'rgba(199,59,34,0.06)', color: '#C73B22', border: '1px solid rgba(199,59,34,0.15)' }}>
        Coming soon — in active development
      </p>
    </div>
  );
}

function AppRoutes() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={EcosystemLanding} />
      <Route path="/ecosystem" component={EcosystemLanding} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/wr/verify/:wrNumber" component={VerifyWarehouseReceipt} />

      {/* Dashboard */}
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardOverview} />
      </Route>

      {/* Trade Operations */}
      <Route path="/consignments">
        <ProtectedRoute path="/consignments" component={Consignments} />
      </Route>
      <Route path="/consignments/:id">
        <ProtectedRoute path="/consignments/:id" component={ConsignmentDetail} />
      </Route>
      <Route path="/inventory">
        <ProtectedRoute path="/inventory" component={Inventory} />
      </Route>
      <Route path="/warehouse">
        <ProtectedRoute path="/warehouse" component={Warehouse} />
      </Route>
      <Route path="/marketplace">
        <ProtectedRoute path="/marketplace" component={Marketplace} />
      </Route>
      <Route path="/marketplace/:id">
        <ProtectedRoute path="/marketplace/:id" component={MarketplaceDetail} />
      </Route>
      <Route path="/watchlist">
        <ProtectedRoute path="/watchlist" component={Watchlist} />
      </Route>
      <Route path="/rfqs/mine">
        <ProtectedRoute path="/rfqs/mine" component={MyRfqs} />
      </Route>
      <Route path="/rfqs/incoming">
        <ProtectedRoute path="/rfqs/incoming" component={IncomingRfqs} />
      </Route>
      <Route path="/orders/mine">
        <ProtectedRoute path="/orders/mine" component={MyOrders} />
      </Route>
      <Route path="/orders">
        <ProtectedRoute path="/orders" component={Orders} />
      </Route>

      {/* Finance & Settlement */}
      <Route path="/escrow">
        <ProtectedRoute path="/escrow" component={Escrow} />
      </Route>
      <Route path="/finabridge">
        <ProtectedRoute path="/finabridge" component={() => <ComingSoon title="Trade Finance" desc="Letters of credit, invoice financing & working capital for institutional trade." />} />
      </Route>
      <Route path="/certificates">
        <ProtectedRoute path="/certificates" component={() => <ComingSoon title="Warehouse Receipts" desc="Digital warehouse receipts and ownership documents for verified inventory." />} />
      </Route>

      {/* Government */}
      <Route path="/barter">
        <ProtectedRoute path="/barter" component={() => <ComingSoon title="Government Barter" desc="Sovereign commodity barter and structured settlement" />} />
      </Route>
      <Route path="/sovereign">
        <ProtectedRoute path="/sovereign" component={() => <ComingSoon title="Sovereign Programs" desc="Government-backed trade and policy programs" />} />
      </Route>

      {/* Wallet */}
      <Route path="/wallet">
        <ProtectedRoute path="/wallet" component={Wallet} />
      </Route>
      <Route path="/admin/wallets">
        <ProtectedRoute component={AdminWallets} />
      </Route>
      <Route path="/admin/consignments">
        <AdminRoute component={AdminConsignmentsQueue} />
      </Route>
      <Route path="/admin/consignments/:id">
        <AdminRoute component={AdminConsignmentReview} />
      </Route>
      <Route path="/admin/email-queues">
        <AdminRoute component={AdminEmailQueues} />
      </Route>
      <Route path="/admin/lc">
        <AdminRoute component={AdminLcQueue} />
      </Route>
      <Route path="/admin/disputes">
        <AdminRoute component={AdminDisputeQueue} />
      </Route>
      <Route path="/admin/kyc">
        <AdminRoute component={AdminKycQueue} />
      </Route>

      {/* Account */}
      <Route path="/transactions">
        <ProtectedRoute component={Transactions} />
      </Route>
      <Route path="/notifications">
        <ProtectedRoute component={() => <ComingSoon title="Notifications" desc="Platform alerts, approvals and updates" />} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={ProfilePage} />
      </Route>
      <Route path="/kyc">
        <ProtectedRoute component={KycPage} />
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

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketProvider>
            {/* AccountTypeProvider kept for legacy home/mobile components that still
                consume useAccountType. New role logic lives in user_type / roleMenus. */}
            <AccountTypeProvider>
              <AppRoutes />
              <Toaster />
            </AccountTypeProvider>
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
