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
  Activity
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
import { ScrollArea } from '@/components/ui/scroll-area';

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
  '/admin/account-deletion-requests': ['view_users', 'manage_users'],
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, adminPortal } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const [activeSection, setActiveSection] = useState('Overview');

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

  const isAdminSession = sessionStorage.getItem('adminPortalSession') === 'true';
  
  if (!user || user.role !== 'admin' || (!adminPortal && !isAdminSession)) {
    return <Redirect to="/admin/login" />;
  }

  const getBadgeCount = (href: string): number => {
    if (!pendingCounts) return 0;
    const finapayTotal = (pendingCounts.pendingDeposits || 0) + (pendingCounts.pendingWithdrawals || 0) + (pendingCounts.pendingCryptoPayments || 0) + (pendingCounts.pendingBuyGold || 0);
    const countMap: Record<string, number> = {
      '/admin/users': 0,
      '/admin/employees': 0,
      '/admin/kyc': pendingCounts.pendingKyc || 0,
      '/admin/compliance': pendingCounts.pendingKyc || 0,
      '/admin/referrals': 0,
      '/admin/account-deletion-requests': 0,
      '/admin/transactions': pendingCounts.pendingTransactions || 0,
      '/admin/account-statements': 0,
      '/admin/payment-gateways': 0,
      '/admin/fees': 0,
      '/admin/finapay': finapayTotal,
      '/admin/vault': pendingCounts.pendingVaultRequests || 0,
      '/admin/finabridge': pendingCounts.pendingTradeCases || 0,
      '/admin/bnsl': pendingCounts.pendingBnslRequests || 0,
      '/admin/documents': 0,
      '/admin/attachments': 0,
      '/admin/chat': pendingCounts.unreadChats || 0,
      '/admin/email-notifications': 0,
      '/admin/cms': 0,
      '/admin/security': 0,
      '/admin/platform-config': 0,
      '/admin/database-backups': 0,
      '/admin/geo-restrictions': 0,
      '/admin/settings': 0,
    };
    return countMap[href] || 0;
  };

  const menuSections = [
    {
      title: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
      items: [
        { label: 'Dashboard', href: '/admin' },
        { label: 'Financial Reports', href: '/admin/financial-reports' },
        { label: 'Gold Backing Report', href: '/admin/gold-backing' },
        { label: 'System Health', href: '/admin/system-health' },
      ]
    },
    {
      title: 'Users',
      icon: <Users className="w-4 h-4" />,
      items: [
        { label: 'User Management', href: '/admin/users' },
        { label: 'Employees', href: '/admin/employees' },
        { label: 'KYC Reviews', href: '/admin/kyc' },
        { label: 'Compliance', href: '/admin/compliance' },
        { label: 'Referrals', href: '/admin/referrals' },
        { label: 'Deletion Requests', href: '/admin/account-deletion-requests' },
      ]
    },
    {
      title: 'Finance',
      icon: <DollarSign className="w-4 h-4" />,
      items: [
        { label: 'Transactions', href: '/admin/transactions' },
        { label: 'Account Statements', href: '/admin/account-statements' },
        { label: 'Payment Gateways', href: '/admin/payment-gateways' },
        { label: 'Fee Management', href: '/admin/fees' },
      ]
    },
    {
      title: 'Products',
      icon: <Package className="w-4 h-4" />,
      items: [
        { label: 'FinaPay', href: '/admin/finapay' },
        { label: 'FinaVault', href: '/admin/vault' },
        { label: 'FinaBridge', href: '/admin/finabridge' },
        { label: 'BNSL', href: '/admin/bnsl' },
      ]
    },
    {
      title: 'System',
      icon: <Settings className="w-4 h-4" />,
      items: [
        { label: 'Documents', href: '/admin/documents' },
        { label: 'Attachments', href: '/admin/attachments' },
        { label: 'Support Chat', href: '/admin/chat' },
        { label: 'Email Notifications', href: '/admin/email-notifications' },
        { label: 'CMS', href: '/admin/cms' },
        { label: 'Security', href: '/admin/security' },
        { label: 'Platform Config', href: '/admin/platform-config' },
        { label: 'Database Backups', href: '/admin/database-backups' },
        { label: 'Geo Restrictions', href: '/admin/geo-restrictions' },
        { label: 'Admin Resources', href: '/admin/settings' },
      ]
    }
  ];

  const isActive = (path: string) => location === path;

  useEffect(() => {
    for (const section of menuSections) {
      if (section.items.some(item => isActive(item.href))) {
        setActiveSection(section.title);
        break;
      }
    }
  }, [location]);

  const currentSection = menuSections.find(s => s.title === activeSection);
  const currentSectionItems = currentSection?.items.filter(item => hasMenuPermission(item.href)) || [];

  const getSectionBadgeCount = (section: typeof menuSections[0]): number => {
    return section.items.reduce((acc, item) => acc + getBadgeCount(item.href), 0);
  };

  const MobileMenuContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <div className="space-y-6 py-4">
      {menuSections.map((section) => {
        const visibleItems = section.items.filter(item => hasMenuPermission(item.href));
        if (visibleItems.length === 0) return null;
        
        return (
          <div key={section.title} data-testid={`admin-mobile-section-${section.title.toLowerCase()}`}>
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 px-4 flex items-center gap-2">
              {section.icon}
              {section.title}
            </p>
            <div className="space-y-0.5 px-2">
              {visibleItems.map((item) => {
                const badgeCount = getBadgeCount(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <div 
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                        isActive(item.href) 
                          ? 'bg-primary text-primary-foreground shadow-sm' 
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                      onClick={onItemClick}
                      data-testid={`admin-mobile-link-${item.href.replace(/\//g, '-').slice(1)}`}
                    >
                      <span className="font-medium text-sm flex-1">{item.label}</span>
                      {badgeCount > 0 && (
                        <span className={`min-w-[20px] h-[20px] px-1.5 text-[10px] font-bold rounded-full flex items-center justify-center ${
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
  );

  return (
    <div className="min-h-screen bg-muted text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      <header className="sticky top-0 z-50 bg-background border-b border-border" data-testid="admin-header">
        <div className="px-4 lg:px-6">
          <div className="h-14 flex items-center gap-4">
            <div className="flex items-center gap-4 shrink-0">
              <Link href="/admin">
                <div className="flex items-center gap-2 cursor-pointer" data-testid="admin-header-logo">
                  <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                    <span className="font-bold text-lg text-primary-foreground">F</span>
                  </div>
                  <span className="text-lg font-bold hidden sm:block">FinaAdmin</span>
                </div>
              </Link>
            </div>

            <nav className="hidden lg:flex items-center justify-center gap-1 flex-1" data-testid="admin-section-tabs">
              {menuSections.map((section) => {
                const visibleItems = section.items.filter(item => hasMenuPermission(item.href));
                if (visibleItems.length === 0) return null;
                
                const sectionBadgeCount = getSectionBadgeCount(section);
                const isSectionActive = activeSection === section.title;
                
                return (
                  <button
                    key={section.title}
                    onClick={() => setActiveSection(section.title)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isSectionActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                    data-testid={`admin-section-tab-${section.title.toLowerCase()}`}
                  >
                    {section.icon}
                    {section.title}
                    {sectionBadgeCount > 0 && (
                      <span className={`min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center ${
                        isSectionActive ? 'bg-white/90 text-purple-700' : 'bg-destructive text-destructive-foreground'
                      }`}>
                        {sectionBadgeCount > 99 ? '99+' : sectionBadgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <ThemeToggle />
              <NotificationCenter />
              
              <div className="h-8 w-px bg-border" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-secondary transition-colors" data-testid="button-admin-user-menu">
                    <Avatar className="h-8 w-8 border-2 border-primary/30">
                      <AvatarImage src="" alt={user.firstName} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium leading-none">{user.firstName}</p>
                      <p className="text-xs text-primary">Admin</p>
                    </div>
                    <ChevronDown className="w-4 h-4 hidden md:block text-muted-foreground" />
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
                className="lg:hidden w-9 h-9 rounded-lg bg-secondary flex items-center justify-center"
                data-testid="button-admin-mobile-menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="hidden lg:block border-t border-border bg-card/50" data-testid="admin-nav-bar">
          <div className="px-4 lg:px-6">
            <div className="flex items-center justify-center gap-6 py-2.5">
              {currentSectionItems.map((item) => {
                const badgeCount = getBadgeCount(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <span 
                      className={`text-sm whitespace-nowrap cursor-pointer transition-colors inline-flex items-center gap-1.5 py-1 px-2 rounded-md ${
                        isActive(item.href) 
                          ? 'bg-primary/10 text-primary font-semibold' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                      data-testid={`admin-nav-link-${item.href.replace(/\//g, '-').slice(1)}`}
                    >
                      {item.label}
                      {badgeCount > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
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
          <div className="fixed top-0 left-0 w-80 h-full bg-background z-50 lg:hidden shadow-2xl overflow-hidden flex flex-col" data-testid="admin-mobile-drawer">
            <div className="h-14 flex items-center justify-between px-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="font-bold text-sm text-primary-foreground">F</span>
                </div>
                <span className="font-bold">FinaAdmin</span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"
                data-testid="button-admin-mobile-close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ScrollArea className="flex-1">
              <MobileMenuContent onItemClick={() => setMobileMenuOpen(false)} />
            </ScrollArea>
            <div className="border-t border-border p-3">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={logout}
                data-testid="button-admin-logout-mobile"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Log Out
              </Button>
            </div>
          </div>
        </>
      )}

      <main className="min-h-[calc(100vh-7rem)] p-4 lg:p-6 bg-muted">
        <div className="max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
