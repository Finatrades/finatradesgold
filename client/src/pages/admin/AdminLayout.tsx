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
  Bell,
  Search,
  ShieldAlert,
  Package,
  CreditCard,
  Briefcase,
  ArrowRightLeft,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FloatingAgentChat from '@/components/FloatingAgentChat';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();

  if (!user || user.role !== 'admin') return null;

  const menuItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Overview', href: '/admin' },
    { icon: <Users className="w-5 h-5" />, label: 'User Management', href: '/admin/users' },
    { icon: <ShieldAlert className="w-5 h-5" />, label: 'KYC Reviews', href: '/admin/kyc' },
    { icon: <CreditCard className="w-5 h-5" />, label: 'FinaPay Manager', href: '/admin/finapay' },
    { icon: <Package className="w-5 h-5" />, label: 'FinaVault Manager', href: '/admin/vault' },
    { icon: <Briefcase className="w-5 h-5" />, label: 'FinaBridge Manager', href: '/admin/finabridge' },
    { icon: <TrendingUp className="w-5 h-5" />, label: 'BNSL Manager', href: '/admin/bnsl' },
    { icon: <MessageSquare className="w-5 h-5" />, label: 'Support Chat', href: '/admin/chat' },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', href: '/admin/settings' },
  ];

  const isActive = (path: string) => location === path;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-20 flex items-center px-6 border-b border-slate-800">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-white">A</div>
             <span className="text-xl font-bold">FinaAdmin</span>
           </div>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                isActive(item.href) 
                  ? 'bg-orange-500 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}>
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20"
            onClick={logout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <button 
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 max-w-xl mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search users, transactions..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">Admin User</p>
                <p className="text-xs text-gray-500">Super Admin</p>
              </div>
              <Avatar>
                <AvatarImage src="" />
                <AvatarFallback className="bg-slate-900 text-white">AD</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
        
        <FloatingAgentChat />
      </div>
    </div>
  );
}