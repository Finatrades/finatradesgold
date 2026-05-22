import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Box,
  Layers,
  Store,
  MessageSquare,
  ShoppingCart,
  ShieldCheck,
  Scale,
  Building2,
  Map,
  User,
  LogOut
} from "lucide-react";
import { useB2bLogout } from "@workspace/api-client-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const logout = useB2bLogout();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/login");
      }
    });
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/consignments", label: "Consignments", icon: Box },
    { href: "/inventory", label: "Inventory", icon: Layers },
    { href: "/marketplace", label: "Marketplace", icon: Store },
    { href: "/rfq", label: "RFQs", icon: MessageSquare },
    { href: "/orders", label: "Orders", icon: ShoppingCart },
    { href: "/escrow", label: "Escrow", icon: ShieldCheck },
    ...(user?.role === "government" ? [{ href: "/barter", label: "Barter", icon: Scale }] : []),
    { href: "/warehouses", label: "Warehouses", icon: Building2 },
    { href: "/hubs", label: "Hubs", icon: Map },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <div className="font-bold text-xl text-primary tracking-tight">FINATRADES B2B</div>
          <div className="text-xs text-muted-foreground mt-1 truncate">{user?.companyName || user?.fullName}</div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-sidebar-primary/10 text-sidebar-primary" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-muted-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
