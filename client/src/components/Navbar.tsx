import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAccountType } from '@/context/AccountTypeContext';
import { useAuth } from '@/context/AuthContext';
import { Link, useLocation } from 'wouter';
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
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { motion } from 'framer-motion';
import { User, LogOut, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { t } = useLanguage();
  const { accountType, toggleAccountType } = useAccountType();
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <nav className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 bg-gradient-to-br from-secondary to-primary rounded-lg" />
            <span className="text-xl font-bold tracking-tight text-foreground">Finatrades</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <NavLink href="/" active={isActive('/')}>{t('nav.home')}</NavLink>
          {user && <NavLink href="/dashboard" active={isActive('/dashboard')}>Dashboard</NavLink>}
          <NavLink href="/finavault" active={isActive('/finavault')}>{t('nav.finavault')}</NavLink>
          <NavLink href="/finapay" active={isActive('/finapay')}>{t('nav.finapay')}</NavLink>
          <NavLink href="/bnsl" active={isActive('/bnsl')}>{t('nav.bnsl')}</NavLink>
          {accountType === 'business' && (
             <NavLink href="/finabridge" active={isActive('/finabridge')}>{t('nav.finabridge')}</NavLink>
          )}
        </div>

        <div className="flex items-center gap-4">
          {!user && (
            <button 
              onClick={toggleAccountType}
              className="text-xs font-medium px-3 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors border border-border text-foreground"
            >
              {accountType === 'personal' ? t('nav.personal') : t('nav.business')}
            </button>
          )}
          
          <LanguageSwitcher />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src="" alt={user.firstName} />
                    <AvatarFallback className="bg-primary text-white">
                      {user.firstName[0]}{user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-background border-border text-foreground" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.firstName} {user.lastName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem className="focus:bg-muted focus:text-foreground cursor-pointer" onClick={() => window.location.href = '/dashboard'}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-muted focus:text-foreground cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem className="focus:bg-muted focus:text-foreground cursor-pointer" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/onboarding">
              <Button className="bg-secondary text-white hover:bg-secondary/90 font-semibold">
                {t('common.getStarted')}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children, active }: { href: string, children: React.ReactNode, active: boolean }) {
  return (
    <Link href={href}>
      <span className={`text-sm font-medium transition-colors cursor-pointer relative ${active ? 'text-secondary' : 'text-muted-foreground hover:text-secondary'}`}>
        {children}
        {active && (
          <motion.div 
            layoutId="nav-underline"
            className="absolute -bottom-1 left-0 right-0 h-0.5 bg-secondary" 
          />
        )}
      </span>
    </Link>
  );
}
