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
  X,
  Gift,
  Globe,
  ChevronDown,
  Home,
  Activity
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
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
  '/admin/geo-restrictions': ['manage_settings'],
  '/admin/settings': ['manage_settings'],
  '/admin/referrals': ['view_users', 'manage_users'],
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, adminPortal } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const { data: pendingCounts } = useQuery({
    queryKey: ['/api/admin/pending-counts'],
    queryFn: async () => {
      const res = await fetch('/api/admin/pending-counts');
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const employeePermissions: string[] = employeeData?.employee?.permissions || [];
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
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isAdminSession = sessionStorage.getItem('adminPortalSession') === 'true';
  
  if (!user || user.role !== 'admin' || (!adminPortal && !isAdminSession)) {
    return <Redirect to="/admin/login" />;
  }

  const getBadgeCount = (href: string): number => {
    if (!pendingCounts) return 0;
    const countMap: Record<string, number> = {
      '/admin/kyc': pendingCounts.pendingKyc || 0,
      '/admin/transactions': pendingCounts.pendingTransactions || 0,
      '/admin/finapay': pendingCounts.pendingDeposits + pendingCounts.pendingWithdrawals || 0,
      '/admin/vault': pendingCounts.pendingVaultRequests || 0,
      '/admin/finabridge': pendingCounts.pendingTradeCases || 0,
      '/admin/bnsl': pendingCounts.pendingBnslRequests || 0,
      '/admin/chat': pendingCounts.unreadChats || 0,
    };
    return countMap[href] || 0;
  };

  const menuSections = [
    {
      title: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
      items: [
        { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', href: '/admin', description: 'Main dashboard overview' },
        { icon: <FileText className="w-4 h-4" />, label: 'Financial Reports', href: '/admin/financial-reports', description: 'View financial analytics' },
        { icon: <Activity className="w-4 h-4" />, label: 'System Health', href: '/admin/system-health', description: 'Monitor system status' },
      ]
    },
    {
      title: 'Users',
      icon: <Users className="w-4 h-4" />,
      items: [
        { icon: <Users className="w-4 h-4" />, label: 'User Management', href: '/admin/users', description: 'Manage all users' },
        { icon: <UserCog className="w-4 h-4" />, label: 'Employees', href: '/admin/employees', description: 'Manage admin staff' },
        { icon: <ShieldAlert className="w-4 h-4" />, label: 'KYC Reviews', href: '/admin/kyc', description: 'Review verifications' },
        { icon: <Shield className="w-4 h-4" />, label: 'Compliance', href: '/admin/compliance', description: 'Compliance dashboard' },
        { icon: <Gift className="w-4 h-4" />, label: 'Referrals', href: '/admin/referrals', description: 'Referral program' },
      ]
    },
    {
      title: 'Finance',
      icon: <DollarSign className="w-4 h-4" />,
      items: [
        { icon: <ArrowRightLeft className="w-4 h-4" />, label: 'Transactions', href: '/admin/transactions', description: 'All transactions' },
        { icon: <FileText className="w-4 h-4" />, label: 'Account Statements', href: '/admin/account-statements', description: 'User statements' },
        { icon: <CreditCard className="w-4 h-4" />, label: 'Payment Gateways', href: '/admin/payment-gateways', description: 'Payment settings' },
        { icon: <DollarSign className="w-4 h-4" />, label: 'Fee Management', href: '/admin/fees', description: 'Configure fees' },
      ]
    },
    {
      title: 'Products',
      icon: <Package className="w-4 h-4" />,
      items: [
        { icon: <CreditCard className="w-4 h-4" />, label: 'FinaPay', href: '/admin/finapay', description: 'Wallet operations' },
        { icon: <Package className="w-4 h-4" />, label: 'FinaVault', href: '/admin/vault', description: 'Vault management' },
        { icon: <Briefcase className="w-4 h-4" />, label: 'FinaBridge', href: '/admin/finabridge', description: 'Trade finance' },
        { icon: <TrendingUp className="w-4 h-4" />, label: 'BNSL', href: '/admin/bnsl', description: 'Buy Now Sell Later' },
      ]
    },
    {
      title: 'System',
      icon: <Settings className="w-4 h-4" />,
      items: [
        { icon: <Receipt className="w-4 h-4" />, label: 'Documents', href: '/admin/documents', description: 'Manage documents' },
        { icon: <Paperclip className="w-4 h-4" />, label: 'Attachments', href: '/admin/attachments', description: 'File attachments' },
        { icon: <MessageSquare className="w-4 h-4" />, label: 'Support Chat', href: '/admin/chat', description: 'Customer support' },
        { icon: <Mail className="w-4 h-4" />, label: 'Email Notifications', href: '/admin/email-notifications', description: 'Email settings' },
        { icon: <PanelLeft className="w-4 h-4" />, label: 'CMS', href: '/admin/cms', description: 'Content management' },
        { icon: <Shield className="w-4 h-4" />, label: 'Security', href: '/admin/security', description: 'Security settings' },
        { icon: <Settings className="w-4 h-4" />, label: 'Platform Config', href: '/admin/platform-config', description: 'Platform settings' },
        { icon: <Database className="w-4 h-4" />, label: 'Database Backups', href: '/admin/database-backups', description: 'Backup management' },
        { icon: <Globe className="w-4 h-4" />, label: 'Geo Restrictions', href: '/admin/geo-restrictions', description: 'Geographic rules' },
        { icon: <Settings className="w-4 h-4" />, label: 'Settings', href: '/admin/settings', description: 'General settings' },
      ]
    }
  ];

  const isActive = (path: string) => location === path;

  const getCurrentSection = () => {
    for (const section of menuSections) {
      if (section.items.some(item => isActive(item.href))) {
        return section.title;
      }
    }
    return 'Overview';
  };

  return (
    <div className="min-h-screen bg-muted text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-background/95 backdrop-blur-md shadow-lg border-b border-border' 
          : 'bg-gradient-to-r from-[#0D001E] via-[#2A0055] to-[#4B0082] border-b border-purple-900/50'
      }`}>
        <div className="px-4 lg:px-6">
          <div className="h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link href="/admin">
                <div className="flex items-center gap-3 cursor-pointer" data-testid="admin-header-logo">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${scrolled ? 'bg-primary' : 'bg-white/10 backdrop-blur-sm border border-white/20'}`}>
                    <span className={`font-bold text-lg ${scrolled ? 'text-primary-foreground' : 'text-white'}`}>F</span>
                  </div>
                  <div className="hidden sm:block">
                    <span className={`text-xl font-bold ${scrolled ? 'text-foreground' : 'text-white'}`}>FinaAdmin</span>
                  </div>
                </div>
              </Link>

              <div className="hidden lg:block h-8 w-px bg-border/50" />

              <NavigationMenu className="hidden lg:flex">
                <NavigationMenuList className="gap-1">
                  {menuSections.map((section) => {
                    const visibleItems = section.items.filter(item => hasMenuPermission(item.href));
                    if (visibleItems.length === 0) return null;
                    
                    const sectionBadgeCount = visibleItems.reduce((acc, item) => acc + getBadgeCount(item.href), 0);
                    const isSectionActive = visibleItems.some(item => isActive(item.href));
                    
                    return (
                      <NavigationMenuItem key={section.title}>
                        <NavigationMenuTrigger 
                          className={`h-9 px-3 text-sm font-medium transition-colors ${
                            scrolled 
                              ? isSectionActive 
                                ? 'bg-primary/10 text-primary' 
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                              : isSectionActive
                                ? 'bg-white/20 text-white'
                                : 'text-white/80 hover:text-white hover:bg-white/10'
                          }`}
                          data-testid={`admin-nav-${section.title.toLowerCase()}`}
                        >
                          <span className="flex items-center gap-2">
                            {section.icon}
                            {section.title}
                            {sectionBadgeCount > 0 && (
                              <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                                {sectionBadgeCount > 99 ? '99+' : sectionBadgeCount}
                              </span>
                            )}
                          </span>
                        </NavigationMenuTrigger>
                        <NavigationMenuContent>
                          <div className="w-[400px] p-3 bg-popover border border-border rounded-xl shadow-xl">
                            <div className="grid gap-1">
                              {visibleItems.map((item) => {
                                const badgeCount = getBadgeCount(item.href);
                                return (
                                  <Link key={item.href} href={item.href}>
                                    <NavigationMenuLink asChild>
                                      <div 
                                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                          isActive(item.href)
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-secondary'
                                        }`}
                                        data-testid={`admin-nav-link-${item.href.replace(/\//g, '-').slice(1)}`}
                                      >
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                          isActive(item.href) ? 'bg-white/20' : 'bg-muted'
                                        }`}>
                                          {item.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{item.label}</span>
                                            {badgeCount > 0 && (
                                              <span className={`min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center ${
                                                isActive(item.href) 
                                                  ? 'bg-white/90 text-purple-700' 
                                                  : 'bg-destructive text-destructive-foreground'
                                              }`}>
                                                {badgeCount > 99 ? '99+' : badgeCount}
                                              </span>
                                            )}
                                          </div>
                                          <p className={`text-xs truncate ${isActive(item.href) ? 'text-white/70' : 'text-muted-foreground'}`}>
                                            {item.description}
                                          </p>
                                        </div>
                                      </div>
                                    </NavigationMenuLink>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                    );
                  })}
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <NotificationCenter />
              
              <div className="hidden sm:block h-8 w-px bg-border/50" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 transition-colors ${
                    scrolled ? 'hover:bg-secondary' : 'hover:bg-white/10'
                  }`} data-testid="button-admin-user-menu">
                    <Avatar className={`h-8 w-8 border-2 ${scrolled ? 'border-primary/30' : 'border-white/30'}`}>
                      <AvatarImage src="" alt={user.firstName} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className={`text-sm font-medium leading-none ${scrolled ? 'text-foreground' : 'text-white'}`}>
                        {user.firstName}
                      </p>
                      <p className={`text-xs ${scrolled ? 'text-primary' : 'text-purple-300'}`}>Admin</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 hidden md:block ${scrolled ? 'text-muted-foreground' : 'text-white/60'}`} />
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

              <button 
                onClick={() => setMobileMenuOpen(true)}
                className={`lg:hidden w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                  scrolled ? 'bg-secondary text-foreground' : 'bg-white/10 text-white'
                }`}
                data-testid="button-admin-mobile-menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            data-testid="admin-mobile-overlay"
          />
          <div className="fixed top-0 right-0 w-80 h-full bg-background z-50 lg:hidden shadow-2xl overflow-y-auto" data-testid="admin-mobile-drawer">
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
              <span className="font-bold text-lg">Menu</span>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"
                data-testid="button-admin-mobile-close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-6">
              {menuSections.map((section) => {
                const visibleItems = section.items.filter(item => hasMenuPermission(item.href));
                if (visibleItems.length === 0) return null;
                
                return (
                  <div key={section.title}>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
                      {section.icon}
                      {section.title}
                    </p>
                    <div className="space-y-1">
                      {visibleItems.map((item) => {
                        const badgeCount = getBadgeCount(item.href);
                        return (
                          <Link key={item.href} href={item.href}>
                            <div 
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                                isActive(item.href) 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                              }`}
                              onClick={() => setMobileMenuOpen(false)}
                              data-testid={`admin-mobile-link-${item.href.replace(/\//g, '-').slice(1)}`}
                            >
                              {item.icon}
                              <span className="font-medium text-sm flex-1">{item.label}</span>
                              {badgeCount > 0 && (
                                <span className={`min-w-[20px] h-[20px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center ${
                                  isActive(item.href) ? 'bg-white/90 text-purple-700' : 'bg-destructive text-destructive-foreground'
                                }`}>
                                  {badgeCount > 99 ? '99+' : badgeCount}
                                </span>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="sticky bottom-0 bg-background border-t border-border p-4">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={logout}
                data-testid="button-admin-logout-mobile"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Log Out
              </Button>
            </div>
          </div>
        </>
      )}

      <main className="min-h-[calc(100vh-4rem)] p-4 lg:p-6 bg-muted">
        <div className="max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
