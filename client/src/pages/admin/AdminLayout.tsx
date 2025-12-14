import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation, Link } from 'wouter';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  Menu,
  Search,
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
  ChevronRight,
  X,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NotificationCenter from '@/components/dashboard/NotificationCenter';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();

  if (!user || user.role !== 'admin') return null;

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
      ]
    },
    {
      title: 'Financial Operations',
      items: [
        { icon: <ArrowRightLeft className="w-5 h-5" />, label: 'Transactions', href: '/admin/transactions' },
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
        { icon: <MessageSquare className="w-5 h-5" />, label: 'Support Chat', href: '/admin/chat' },
        { icon: <PanelLeft className="w-5 h-5" />, label: 'CMS', href: '/admin/cms' },
        { icon: <Shield className="w-5 h-5" />, label: 'Security', href: '/admin/security' },
        { icon: <Settings className="w-5 h-5" />, label: 'Settings', href: '/admin/settings' },
      ]
    }
  ];

  const isActive = (path: string) => location === path;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-gray-50 to-orange-50/30 flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white transform transition-all duration-300 ease-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-orange-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">FinaAdmin</span>
              <p className="text-xs text-slate-400">Control Panel</p>
            </div>
          </div>
          <button 
            className="lg:hidden p-1 hover:bg-white/10 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-6 h-[calc(100vh-180px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {menuSections.map((section) => (
            <div key={section.title}>
              <h3 className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{section.title}</h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div className={`group flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                      isActive(item.href) 
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className={isActive(item.href) ? 'text-white' : 'text-slate-500 group-hover:text-orange-400 transition-colors'}>{item.icon}</span>
                        <span className="font-medium text-sm">{item.label}</span>
                      </div>
                      {isActive(item.href) && <ChevronRight className="w-4 h-4" />}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-slate-900/80 backdrop-blur-sm">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
            onClick={logout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-6 sticky top-0 z-40">
          <button 
            className="lg:hidden p-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 max-w-xl mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search users, transactions, documents..." 
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationCenter />
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-gray-500">Super Admin</p>
              </div>
              <Avatar className="w-10 h-10 ring-2 ring-orange-100">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white font-semibold">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}