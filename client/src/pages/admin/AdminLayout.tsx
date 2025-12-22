import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation, Link, Redirect } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  Menu,
  ShieldAlert,
  Shield,
  Package,
  CreditCard,
  Briefcase,
  ArrowRightLeft,
  TrendingUp,
  MessageSquare,
  PanelLeft,
  DollarSign,
  UserCog,
  Receipt,
  Mail,
  Database,
  Paperclip,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationCenter from '@/components/dashboard/NotificationCenter';
import ThemeToggle from '@/components/ThemeToggle';

const MENU_PERMISSION_MAP: Record<string, string[]> = {
  '/admin': [],
  '/admin/financial-reports': ['view_reports', 'generate_reports'],
  '/admin/users': ['view_users', 'manage_users'],
  '/admin/employees': ['manage_employees'],
  '/admin/kyc': ['view_kyc', 'manage_kyc'],
  '/admin/compliance': ['view_kyc', 'manage_kyc'],
  '/admin/transactions': ['view_transactions', 'manage_transactions'],
  '/admin/payment-gateways': ['manage_deposits', 'manage_withdrawals'],
  '/admin/fees': ['manage_fees'],
  '/admin/finapay': ['view_transactions', 'manage_deposits', 'manage_withdrawals'],
  '/admin/vault': ['view_vault', 'manage_vault'],
  '/admin/finabridge': ['view_finabridge', 'manage_finabridge'],
  '/admin/bnsl': ['view_bnsl', 'manage_bnsl'],
  '/admin/documents': ['view_reports'],
  '/admin/attachments': ['view_reports'],
  '/admin/chat': ['view_support', 'manage_support'],
  '/admin/email-notifications': ['manage_settings'],
  '/admin/cms': ['view_cms', 'manage_cms'],
  '/admin/security': ['manage_settings'],
  '/admin/platform-config': ['manage_settings'],
  '/admin/database-backups': ['manage_settings'],
  '/admin/settings': ['manage_settings'],
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, adminPortal } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);

  const { data: employeeData } = useQuery({
    queryKey: ['/api/admin/employee/me', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/admin/employees/by-user/${user.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const employeePermissions: string[] = employeeData?.employee?.permissions || [];
  // If no employee record exists, this is an original admin account with full access
  // Also grant full access if the employee role is super_admin
  const hasNoEmployeeRecord = employeeData === null || (employeeData && !employeeData.employee);
  const isSuperAdmin = hasNoEmployeeRecord || employeeData?.employee?.role === 'super_admin';

  const hasMenuPermission = (menuPath: string): boolean => {
    if (isSuperAdmin) return true;
    const requiredPermissions = MENU_PERMISSION_MAP[menuPath];
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    return requiredPermissions.some(perm => employeePermissions.includes(perm));
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isAdminSession = sessionStorage.getItem('adminPortalSession') === 'true';
  
  // Require both admin role AND admin portal access (logged in via /admin/login)
  if (!user || user.role !== 'admin' || (!adminPortal && !isAdminSession)) {
    return <Redirect to="/admin/login" />;
  }

  const menuSections = [
    {
      title: 'Overview',
      items: [
        { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', href: '/admin' },
        { icon: <FileText className="w-5 h-5" />, label: 'Financial Reports', href: '/admin/financial-reports' },
      ]
    },
    {
      title: 'User & Access',
      items: [
        { icon: <Users className="w-5 h-5" />, label: 'User Management', href: '/admin/users' },
        { icon: <UserCog className="w-5 h-5" />, label: 'Employees', href: '/admin/employees' },
        { icon: <ShieldAlert className="w-5 h-5" />, label: 'KYC Reviews', href: '/admin/kyc' },
        { icon: <Shield className="w-5 h-5" />, label: 'Compliance', href: '/admin/compliance' },
      ]
    },
    {
      title: 'Financial Operations',
      items: [
        { icon: <ArrowRightLeft className="w-5 h-5" />, label: 'Transactions', href: '/admin/transactions' },
        { icon: <FileText className="w-5 h-5" />, label: 'Account Statements', href: '/admin/account-statements' },
        { icon: <CreditCard className="w-5 h-5" />, label: 'Payment Gateways', href: '/admin/payment-gateways' },
        { icon: <DollarSign className="w-5 h-5" />, label: 'Fee Management', href: '/admin/fees' },
      ]
    },
    {
      title: 'Products',
      items: [
        { icon: <CreditCard className="w-5 h-5" />, label: 'FinaPay', href: '/admin/finapay' },
        { icon: <Package className="w-5 h-5" />, label: 'FinaVault', href: '/admin/vault' },
        { icon: <Briefcase className="w-5 h-5" />, label: 'FinaBridge', href: '/admin/finabridge' },
        { icon: <TrendingUp className="w-5 h-5" />, label: 'BNSL', href: '/admin/bnsl' },
      ]
    },
    {
      title: 'System',
      items: [
        { icon: <Receipt className="w-5 h-5" />, label: 'Documents', href: '/admin/documents' },
        { icon: <Paperclip className="w-5 h-5" />, label: 'Attachments', href: '/admin/attachments' },
        { icon: <MessageSquare className="w-5 h-5" />, label: 'Support Chat', href: '/admin/chat' },
        { icon: <Mail className="w-5 h-5" />, label: 'Email Notifications', href: '/admin/email-notifications' },
        { icon: <PanelLeft className="w-5 h-5" />, label: 'CMS', href: '/admin/cms' },
        { icon: <Shield className="w-5 h-5" />, label: 'Security', href: '/admin/security' },
        { icon: <Settings className="w-5 h-5" />, label: 'Platform Config', href: '/admin/platform-config' },
        { icon: <Database className="w-5 h-5" />, label: 'Database Backups', href: '/admin/database-backups' },
        { icon: <Settings className="w-5 h-5" />, label: 'Settings', href: '/admin/settings' },
      ]
    }
  ];

  const isActive = (path: string) => location === path;

  return (
    <div className="min-h-screen bg-muted text-foreground font-sans selection:bg-primary selection:text-primary-foreground relative">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="admin-sidebar-overlay"
        />
      )}
      
      <aside 
        className={`fixed top-0 left-0 h-full w-72 bg-background border-r border-border z-50 transition-transform duration-300 lg:translate-x-0 shadow-xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="admin-sidebar"
      >
        <div className="flex flex-col h-full">
          <div className="h-20 flex items-center justify-between px-6 border-b border-border">
            <Link href="/admin">
              <div className="flex items-center gap-3 cursor-pointer" data-testid="admin-sidebar-logo">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">F</span>
                </div>
                <div>
                  <span className="text-xl font-bold text-foreground">FinaAdmin</span>
                  <p className="text-xs text-muted-foreground">Control Panel</p>
                </div>
              </div>
            </Link>
            <button 
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-6 custom-scrollbar">
            {menuSections.map((section) => {
              const visibleItems = section.items.filter(item => hasMenuPermission(item.href));
              if (visibleItems.length === 0) return null;
              
              return (
                <div key={section.title} className="space-y-1">
                  <p className="px-4 text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                    {section.title}
                  </p>
                  {visibleItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <div 
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                          isActive(item.href) 
                            ? 'bg-primary text-primary-foreground shadow-md' 
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                        data-testid={`admin-sidebar-link-${item.href.replace(/\//g, '-').slice(1)}`}
                      >
                        <div className={isActive(item.href) ? 'text-primary-foreground' : ''}>
                          {item.icon}
                        </div>
                        <span className="font-medium text-sm">{item.label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <div className="mb-4 p-4 rounded-xl bg-secondary border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-primary capitalize font-medium">
                    Super Admin
                  </p>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={logout}
              data-testid="button-admin-logout"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Log Out
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:ml-72 min-h-screen flex flex-col transition-all duration-300">
        <header className={`sticky top-0 z-30 h-16 transition-all duration-300 ${scrolled ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-sm' : 'bg-background border-b border-border'}`}>
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-admin-mobile-sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />

              <NotificationCenter />
              
              <div className="flex items-center gap-3 pl-3 border-l border-border">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 cursor-pointer hover:bg-secondary rounded-lg px-3 py-2 transition-colors" data-testid="button-admin-user-menu">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-foreground">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-primary capitalize font-medium">Super Admin</p>
                      </div>
                      <Avatar className="h-10 w-10 border-2 border-primary/30 ring-2 ring-primary/10">
                        <AvatarImage src="" alt={user.firstName} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="font-semibold">{user.firstName} {user.lastName}</span>
                        <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link href="/admin/settings">
                      <DropdownMenuItem className="cursor-pointer" data-testid="link-admin-settings">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/admin/security">
                      <DropdownMenuItem className="cursor-pointer" data-testid="link-admin-security">
                        <Shield className="w-4 h-4 mr-2" />
                        Security
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                      onClick={logout}
                      data-testid="button-admin-logout-menu"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-x-hidden bg-muted">
          {children}
        </main>
      </div>
    </div>
  );
}
