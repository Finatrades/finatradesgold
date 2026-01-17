import React from 'react';
import { Bell, Settings, ChevronLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  transparent?: boolean;
}

export default function MobileHeader({ title, showBack = false, transparent = false }: MobileHeaderProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  const { data: goldPriceData } = useQuery({
    queryKey: ['/api/gold-price'],
    queryFn: async () => {
      const res = await fetch('/api/gold-price');
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 30000,
  });

  const goldPrice = goldPriceData?.pricePerGram || 0;

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const getPageTitle = () => {
    if (title) return title;
    
    if (location.includes('/dashboard')) return 'Home';
    if (location.includes('/finapay')) return 'Wallet';
    if (location.includes('/finavault')) return 'Vault';
    if (location.includes('/bnsl')) return 'BNSL';
    if (location.includes('/transactions')) return 'Transactions';
    if (location.includes('/profile')) return 'Profile';
    if (location.includes('/settings')) return 'Settings';
    if (location.includes('/notifications')) return 'Notifications';
    return 'Finatrades';
  };

  return (
    <header className={`sticky top-0 z-40 mobile-header ${transparent ? 'bg-transparent' : 'bg-white/95 backdrop-blur-lg border-b border-gray-100/80 mobile-header-blur'}`}
            style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}>
      <div className="h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack ? (
            <button
              onClick={() => window.history.back()}
              className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center touch-target haptic-press active:bg-gray-200"
              data-testid="button-mobile-back"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
          ) : (
            <Avatar 
              className="w-11 h-11 cursor-pointer border-2 border-purple-200 touch-target"
              onClick={() => setLocation('/profile')}
            >
              <AvatarImage src={(user as any)?.profilePhoto || ''} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white text-sm font-medium">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div>
            <h1 className="text-lg font-bold text-gray-900">{getPageTitle()}</h1>
            {!showBack && goldPrice > 0 && (
              <p className="text-[10px] text-green-600 font-medium">Gold: ${goldPrice.toFixed(2)}/g</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation('/notifications')}
            className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center relative touch-target haptic-press active:bg-gray-200"
            data-testid="button-mobile-notifications"
          >
            <Bell className="w-5 h-5 text-gray-700" />
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          
          <button
            onClick={() => setLocation('/settings')}
            className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center touch-target haptic-press active:bg-gray-200"
            data-testid="button-mobile-settings"
          >
            <Settings className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>
    </header>
  );
}
